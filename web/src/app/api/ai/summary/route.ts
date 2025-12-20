import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getActivePlanForUser } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import { aiSummarizeWork } from "@/lib/ai/client";
import { AiWorkSummarySchema, type AiWorkSummary } from "@/lib/ai/schema";

const WorkSummaryRequestSchema = z
  .object({
    work: z
      .object({
        title: z.string().min(1).max(400),
        abstract: z.string().max(10000).nullable().optional(),
        year: z.number().int().min(1800).max(2100).nullable().optional(),
        venue: z.string().max(300).nullable().optional(),
        url: z.string().max(2000).nullable().optional(),
        doi: z.string().max(200).nullable().optional(),
        arxivId: z.string().max(80).nullable().optional(),
        openalexId: z.string().max(200).nullable().optional(),
        authors: z.array(z.object({ name: z.string().min(1).max(120) })).nullable().optional(),
      })
      .strict(),
  })
  .strict();

type CacheEntry = { value: AiWorkSummary; expiresAtMs: number };

/** 进程内 TTL 缓存：避免同一篇文献反复点按钮导致重复调用 LLM（best-effort）。 */
const SUMMARY_CACHE = new Map<string, CacheEntry>();
/** 进程内并发去重：同 key 同时请求时复用同一个 Promise（best-effort）。 */
const IN_FLIGHT = new Map<string, Promise<AiWorkSummary>>();

type InputUsed = "FULLTEXT" | "ABSTRACT" | "METADATA_ONLY";

/**
 * 带超时的 fetch（避免外部源站卡住导致接口长期挂起）。
 */
async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: ac.signal,
      headers: {
        "user-agent": "ScholarSearch/0.1",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * 下载 Response 为 ArrayBuffer（带大小上限），避免超大 PDF 把内存打爆。
 */
async function readAsArrayBufferWithLimit(res: Response, maxBytes: number): Promise<ArrayBuffer> {
  const lenHeader = res.headers.get("content-length");
  if (lenHeader) {
    const n = Number(lenHeader);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new Error(`file_too_large:${n}`);
    }
  }
  const ab = await res.arrayBuffer();
  if (ab.byteLength > maxBytes) {
    throw new Error(`file_too_large:${ab.byteLength}`);
  }
  return ab;
}

/**
 * 从 PDF 二进制中抽取文本（best-effort）。
 * 注意：这里用动态 import，避免在构建阶段引入不必要的环境差异。
 */
async function extractTextFromPdf(buf: ArrayBuffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (data: Buffer) => Promise<{ text?: string }>;
  const out = await pdfParse(Buffer.from(buf));
  const text = (out.text ?? "").replace(/\s+\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

/**
 * 尝试从 arXiv 获取 PDF 全文并解析。
 */
async function tryFetchArxivFullText(arxivId: string): Promise<string | null> {
  const clean = arxivId.trim();
  if (!clean) return null;
  // arXiv PDF 规则：https://arxiv.org/pdf/{id}.pdf（保留版本号 v2 也可）
  const pdfUrl = `https://arxiv.org/pdf/${encodeURIComponent(clean)}.pdf`;
  const res = await fetchWithTimeout(pdfUrl, 12000);
  if (!res.ok) return null;
  const ab = await readAsArrayBufferWithLimit(res, 12 * 1024 * 1024);
  const text = await extractTextFromPdf(ab);
  return text && text.length >= 800 ? text : null;
}

type OpenAlexWorkDetail = {
  best_oa_location?: { pdf_url?: string | null; url_for_pdf?: string | null } | null;
  primary_location?: { pdf_url?: string | null; url_for_pdf?: string | null } | null;
  locations?: Array<{ pdf_url?: string | null; url_for_pdf?: string | null }> | null;
};

/**
 * 从 OpenAlex work detail 中挑一个 PDF URL（公开可访问时才有）。
 */
function pickOpenAlexPdfUrl(w: OpenAlexWorkDetail): string | null {
  const cand =
    w.best_oa_location?.pdf_url ??
    w.best_oa_location?.url_for_pdf ??
    w.primary_location?.pdf_url ??
    w.primary_location?.url_for_pdf ??
    w.locations?.find((x) => x.pdf_url)?.pdf_url ??
    w.locations?.find((x) => x.url_for_pdf)?.url_for_pdf ??
    null;
  if (!cand) return null;
  return String(cand).trim() || null;
}

/**
 * 尝试从 OpenAlex 获取 PDF 全文并解析（通过 openalexId 或 doi 反查 work detail）。
 */
async function tryFetchOpenAlexFullText(params: { openalexId?: string | null; doi?: string | null }): Promise<string | null> {
  const id = (params.openalexId ?? "").trim();
  const doi = (params.doi ?? "").trim();
  const workId = id
    ? encodeURIComponent(id)
    : doi
      ? encodeURIComponent(`https://doi.org/${doi}`)
      : null;
  if (!workId) return null;
  const url = `https://api.openalex.org/works/${workId}`;
  const res = await fetchWithTimeout(url, 9000);
  if (!res.ok) return null;
  const json = (await res.json()) as OpenAlexWorkDetail;
  const pdfUrl = pickOpenAlexPdfUrl(json);
  if (!pdfUrl) return null;

  const pdfRes = await fetchWithTimeout(pdfUrl, 12000);
  if (!pdfRes.ok) return null;
  const ab = await readAsArrayBufferWithLimit(pdfRes, 12 * 1024 * 1024);
  const text = await extractTextFromPdf(ab);
  return text && text.length >= 800 ? text : null;
}

/**
 * 对正文/摘要做轻量清洗与截断，控制 prompt 大小。
 */
function clampText(input: string, maxChars: number): string {
  const cleaned = input.replace(/\u0000/g, "").replace(/[ \t]{2,}/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  // 保留开头+结尾，避免只截断开头导致方法/实验部分缺失
  const head = Math.floor(maxChars * 0.75);
  const tail = maxChars - head;
  return `${cleaned.slice(0, head)}\n...\n${cleaned.slice(-tail)}`;
}

/**
 * 生成缓存 key（尽可能稳定、可复用）：
 * - 优先 DOI / arXiv / OpenAlex
 * - 否则退化为 title+year 的归一化
 */
function makeWorkKey(work: {
  title: string;
  year?: number | null;
  doi?: string | null;
  arxivId?: string | null;
  openalexId?: string | null;
}): string {
  const norm = (s: string) => s.trim().toLowerCase();
  if (work.doi) return `doi:${norm(work.doi)}`;
  if (work.arxivId) return `arxiv:${norm(work.arxivId)}`;
  if (work.openalexId) return `openalex:${norm(work.openalexId)}`;
  const y = work.year ? String(work.year) : "unknown_year";
  return `title:${norm(work.title)}|year:${y}`;
}

function getCached(key: string): AiWorkSummary | null {
  const hit = SUMMARY_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAtMs) {
    SUMMARY_CACHE.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key: string, value: AiWorkSummary): void {
  // 默认缓存 7 天（best-effort）
  const ttlMs = 7 * 24 * 60 * 60 * 1000;
  SUMMARY_CACHE.set(key, { value, expiresAtMs: Date.now() + ttlMs });
}

/**
 * AI 生成“文献概要”：
 * - POST /api/ai/summary
 * body: { work }
 *
 * 返回：
 * - 未配置 LLM：{ ok: false, error: "llm_not_configured" }
 * - 计划不支持 AI：{ ok: false, error: "plan_required" }
 * - 成功：{ ok: true, result }
 */
export async function POST(req: Request) {
  // 1) 登录校验（与现有 AI 功能保持一致）
  let me: { id: string; email: string };
  try {
    me = await requireUser(req);
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : 500;
    // 与 /api/ai/expand 保持一致：对“可预期错误”使用 200，让前端统一走 {ok:false} 分支。
    return NextResponse.json({ ok: false, error: status === 401 ? "unauthorized" : "server_error" }, { status: 200 });
  }

  // 2) 用户存在性校验（沿用 expand 的风格）
  const exists = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });

  // 3) 计划校验（AI 功能开关）
  const planId = (await getActivePlanForUser(me.id)) ?? "FREE";
  const plan = PLANS[planId];
  if (!plan.limits.aiEnabled) {
    return NextResponse.json(
      { ok: false, error: "plan_required", message: "当前计划不支持 AI 功能，请升级到 Pro/Max。" },
      { status: 200 },
    );
  }

  // 4) 入参校验
  const body = await req.json().catch(() => ({}));
  const parsed = WorkSummaryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const work = parsed.data.work;
  const key = makeWorkKey(work);

  // 5) 缓存命中直接返回
  const cached = getCached(key);
  if (cached) return NextResponse.json({ ok: true, result: cached, cached: true });

  // 6) 并发去重
  const existing = IN_FLIGHT.get(key);
  if (existing) {
    const res = await existing;
    return NextResponse.json({ ok: true, result: res, cached: false, deduped: true });
  }

  const p = (async () => {
    // 生成前尽量获取“全文”：优先 arXiv，其次 OpenAlex OA PDF；否则回退摘要/元信息
    let inputUsed: InputUsed = "METADATA_ONLY";
    let inputNote: string | null = null;
    let fullText: string | null = null;

    try {
      if (work.arxivId) {
        fullText = await tryFetchArxivFullText(work.arxivId);
        if (fullText) {
          inputUsed = "FULLTEXT";
          inputNote = "已自动获取 arXiv PDF 全文并解析（best-effort，已做截断）。";
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "arxiv_fetch_failed";
      inputNote = `未能获取 arXiv 全文：${msg}`;
    }

    if (!fullText) {
      try {
        const oa = await tryFetchOpenAlexFullText({ openalexId: work.openalexId ?? null, doi: work.doi ?? null });
        if (oa) {
          fullText = oa;
          inputUsed = "FULLTEXT";
          inputNote = "已自动获取 OpenAlex 标记的公开 PDF 全文并解析（best-effort，已做截断）。";
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "openalex_fetch_failed";
        inputNote = `未能获取 OpenAlex 公开全文：${msg}`;
      }
    }

    // 回退摘要（Crossref 很常缺失 abstract；此时只能基于元信息）
    const abstract = (work.abstract ?? null) ? String(work.abstract ?? "").trim() : null;
    if (!fullText) {
      if (abstract && abstract.length >= 40) {
        inputUsed = "ABSTRACT";
        inputNote =
          inputNote ??
          "无法自动获取全文（可能为出版社付费墙/无公开 PDF 链接），本次将基于摘要生成概要。";
      } else {
        inputUsed = "METADATA_ONLY";
        inputNote =
          inputNote ??
          "无法自动获取全文且该来源未提供摘要（Crossref 常见情况，且正文可能在出版社付费墙后），本次只能基于标题/作者/年份等元信息生成概要，可能信息不足。";
      }
    }

    const fullTextForPrompt = fullText ? clampText(fullText, 30000) : null;
    const abstractForPrompt = !fullTextForPrompt && abstract ? clampText(abstract, 6000) : null;

    const result = await aiSummarizeWork({
      title: work.title,
      abstract: abstractForPrompt,
      fullText: fullTextForPrompt,
      year: work.year ?? null,
      venue: work.venue ?? null,
      url: work.url ?? null,
      doi: work.doi ?? null,
      arxivId: work.arxivId ?? null,
      authors: work.authors ? work.authors.map((a) => a.name) : null,
    });
    if (!result) {
      throw new Error("llm_not_configured");
    }

    // 二次校验（防御式）：确保返回可序列化且符合 schema
    const out = AiWorkSummarySchema.safeParse(result);
    if (!out.success) {
      throw new Error("ai_failed");
    }
    setCached(key, out.data);
    // 仅缓存模型结果；inputUsed/inputNote 作为运行时信息返回，不进缓存
    (out.data as AiWorkSummary & { __inputUsed?: InputUsed; __inputNote?: string | null }).__inputUsed = inputUsed;
    (out.data as AiWorkSummary & { __inputUsed?: InputUsed; __inputNote?: string | null }).__inputNote = inputNote;
    return out.data;
  })();

  IN_FLIGHT.set(key, p);
  try {
    const result = await p;
    const r = result as AiWorkSummary & { __inputUsed?: InputUsed; __inputNote?: string | null };
    const inputUsed = r.__inputUsed ?? "METADATA_ONLY";
    const inputNote = r.__inputNote ?? null;
    // 清理内部字段，避免污染前端展示
    delete (r as unknown as Record<string, unknown>).__inputUsed;
    delete (r as unknown as Record<string, unknown>).__inputNote;
    return NextResponse.json({ ok: true, result: r, cached: false, inputUsed, inputNote });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "ai_failed";
    if (msg === "llm_not_configured") {
      return NextResponse.json({ ok: false, error: "llm_not_configured" }, { status: 200 });
    }
    return NextResponse.json({ ok: false, error: "ai_failed", message: msg }, { status: 200 });
  } finally {
    IN_FLIGHT.delete(key);
  }
}



