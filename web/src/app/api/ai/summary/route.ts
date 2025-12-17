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
    const result = await aiSummarizeWork({
      title: work.title,
      abstract: work.abstract ?? null,
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
    return out.data;
  })();

  IN_FLIGHT.set(key, p);
  try {
    const result = await p;
    return NextResponse.json({ ok: true, result, cached: false });
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



