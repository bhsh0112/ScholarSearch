import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateSearch } from "@/lib/aggregateSearch";
import { normalizeArxivId, normalizeDoi, normalizeTitle } from "@/lib/normalize";
import { sendEmail } from "@/lib/email";
import type { SearchFilters } from "@/lib/filters";
import { SearchFiltersSchema } from "@/lib/filters";

type PushStrategy = "RECENCY" | "IMPORTANCE" | "HYBRID";
type NoiseLevel = "STRICT" | "STANDARD" | "LOOSE";

type PushItem = {
  id: string;
  title: string;
  url: string | null;
  year: number | null;
  venue: string | null;
  doi: string | null;
  arxivId: string | null;
  sourcesCount: number;
  hasAbstract: boolean;
  authors: string[];
};

/**
 * 判断某个 SavedSearch 在当前触发下是否应执行。
 *
 * 说明：
 * - V1 的 worker 是“手动触发器”，但产品化后需要尊重 schedule，否则用户配置没有意义
 * - 这里采用宽松阈值：DAILY ~ 20h；WEEKLY ~ 6d（避免因触发偏差导致长期不跑）
 */
function shouldRunSchedule(schedule: "MANUAL" | "DAILY" | "WEEKLY", lastCheckedAt: Date | null): boolean {
  if (schedule === "MANUAL") return false;
  if (!lastCheckedAt) return true;
  const now = Date.now();
  const deltaMs = now - lastCheckedAt.getTime();
  if (schedule === "DAILY") return deltaMs >= 20 * 60 * 60 * 1000;
  return deltaMs >= 6 * 24 * 60 * 60 * 1000;
}

/**
 * 噪音控制：对“推送列表”进行过滤（不会影响写库/去重）。
 *
 * - STRICT：偏“更少更准”，过滤掉缺少摘要且缺少 venue 的条目，并要求年份较新
 * - STANDARD：默认，仅过滤明显信息不足的条目
 * - LOOSE：尽量覆盖，不过滤
 */
function applyNoiseLevel(items: PushItem[], noise: NoiseLevel): PushItem[] {
  if (noise === "LOOSE") return items;
  const currentYear = new Date().getFullYear();
  const minYear = noise === "STRICT" ? currentYear - 5 : currentYear - 10;
  return items.filter((it) => {
    const hasEnoughInfo = it.hasAbstract || !!it.venue || it.sourcesCount >= 2 || !!it.doi || !!it.arxivId;
    if (!hasEnoughInfo) return false;
    if (noise === "STRICT") {
      const y = it.year ?? 0;
      if (y > 0 && y < minYear) return false;
      if (!it.hasAbstract && !it.venue) return false;
    }
    return true;
  });
}

/**
 * 重要性评分（规则版，占位）：
 * - 没有引文/下载等强信号时，使用信息完整度与可追溯性做近似
 */
function importanceScore(it: PushItem): number {
  const year = it.year ?? 0;
  const currentYear = new Date().getFullYear();
  const recency = year > 0 ? Math.max(0, 1 - Math.min(15, currentYear - year) / 15) : 0;
  const abstractBoost = it.hasAbstract ? 0.6 : 0;
  const venueBoost = it.venue ? 0.4 : 0;
  const idBoost = (it.doi ? 0.25 : 0) + (it.arxivId ? 0.15 : 0);
  const sourcesBoost = it.sourcesCount >= 2 ? 0.2 : 0;
  return recency * 0.5 + abstractBoost + venueBoost + idBoost + sourcesBoost;
}

/**
 * 偏好打分（规则版）：
 * - 对 venue / authors 命中做加权
 * - 仅用于排序，不做硬过滤（避免“误杀”）
 */
function preferenceScore(it: PushItem, pref: { venue: Map<string, number>; author: Map<string, number> }): number {
  let score = 0;
  if (it.venue) score += pref.venue.get(it.venue) ?? 0;
  for (const a of it.authors) {
    score += pref.author.get(a) ?? 0;
  }
  return score;
}

/**
 * 选择用于推送的 Top-N 列表。
 */
function pickTop(
  items: PushItem[],
  strategy: PushStrategy,
  topN: number,
  pref: { venue: Map<string, number>; author: Map<string, number> },
): PushItem[] {
  const n = Number.isFinite(topN) ? Math.max(1, Math.min(50, Math.floor(topN))) : 10;
  const sorted = [...items].sort((a, b) => {
    const pa = preferenceScore(a, pref);
    const pb = preferenceScore(b, pref);
    if (strategy === "RECENCY") {
      const ya = a.year ?? 0;
      const yb = b.year ?? 0;
      if (ya !== yb) return yb - ya;
      if (pa !== pb) return pb - pa;
      return a.title.localeCompare(b.title);
    }
    if (strategy === "IMPORTANCE") {
      const sa = importanceScore(a);
      const sb = importanceScore(b);
      const mixA = sa + pa * 0.25;
      const mixB = sb + pb * 0.25;
      if (mixA !== mixB) return mixB - mixA;
      const ya = a.year ?? 0;
      const yb = b.year ?? 0;
      return yb - ya;
    }
    // HYBRID：用重要性打底，同时保留一定的“新”
    const ha = importanceScore(a);
    const hb = importanceScore(b);
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    const mixA = ha * 0.65 + (ya ? ya / 3000 : 0) + pa * 0.18;
    const mixB = hb * 0.65 + (yb ? yb / 3000 : 0) + pb * 0.18;
    if (mixA !== mixB) return mixB - mixA;
    return a.title.localeCompare(b.title);
  });
  return sorted.slice(0, n);
}

/**
 * 运行 SavedSearch 追踪任务（V1）。
 *
 * - POST /api/cron/run
 * - Header: x-cron-secret: <CRON_SECRET>
 *
 * 说明：
 * - 这是一个“可被定时任务调用”的入口（后续可接 GitHub Actions/云函数 Cron）。
 * - V1 先用单用户模式 + 手动触发，确保主链路稳定。
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });

  const savedSearches = await prisma.savedSearch.findMany({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });

  const results: Array<{ savedSearchId: string; newCount: number; error?: string | null }> = [];

  for (const ss of savedSearches) {
    const startedAt = Date.now();
    let runError: string | null = null;
    let stats: unknown = null;
    let newCount = 0;
    const newlySeen: PushItem[] = [];

    try {
      if (!shouldRunSchedule(ss.schedule, ss.lastCheckedAt ?? null)) {
        results.push({ savedSearchId: ss.id, newCount: 0, error: null });
        continue;
      }

      const prefRows = await prisma.topicPreference.findMany({
        where: { userId: user.id, savedSearchId: ss.id },
        select: { kind: true, value: true, weight: true },
      });
      const pref = {
        venue: new Map<string, number>(),
        author: new Map<string, number>(),
      };
      for (const r of prefRows) {
        if (r.kind === "VENUE") pref.venue.set(r.value, r.weight);
        if (r.kind === "AUTHOR") pref.author.set(r.value, r.weight);
      }

      const filters: SearchFilters | null = (() => {
        if (!ss.filters) return null;
        const parsed = SearchFiltersSchema.safeParse(ss.filters);
        return parsed.success ? parsed.data : null;
      })();

      const agg = await aggregateSearch({ query: ss.query, perSource: 20, filters });
      stats = agg.stats;

      for (const w of agg.works) {
        const doi = normalizeDoi(w.doi);
        const arxivId = normalizeArxivId(w.arxivId);
        const openalexId = w.openalexId ?? null;
        const normalizedTitle = normalizeTitle(w.title);

        const existing =
          (doi ? await prisma.work.findUnique({ where: { doi } }) : null) ??
          (arxivId ? await prisma.work.findUnique({ where: { arxivId } }) : null) ??
          (openalexId ? await prisma.work.findUnique({ where: { openalexId } }) : null) ??
          (normalizedTitle ? await prisma.work.findFirst({ where: { normalizedTitle } }) : null);

        const work = existing
          ? await prisma.work.update({
              where: { id: existing.id },
              data: {
                title: existing.title || w.title,
                abstract: existing.abstract ?? w.abstract ?? null,
                year: existing.year ?? w.year ?? null,
                venue: existing.venue ?? w.venue ?? null,
                url: existing.url ?? w.url ?? null,
                doi: existing.doi ?? doi ?? null,
                arxivId: existing.arxivId ?? arxivId ?? null,
                openalexId: existing.openalexId ?? openalexId ?? null,
                normalizedTitle,
                authors: w.authors ?? null,
              },
            })
          : await prisma.work.create({
              data: {
                title: w.title,
                abstract: w.abstract ?? null,
                year: w.year ?? null,
                venue: w.venue ?? null,
                url: w.url ?? null,
                doi: doi ?? null,
                arxivId: arxivId ?? null,
                openalexId,
                normalizedTitle,
                authors: w.authors ?? null,
              },
            });

        for (const s of w.sources) {
          await prisma.workSource.upsert({
            where: { source_sourceId: { source: s.source, sourceId: s.sourceId } },
            update: { workId: work.id, url: s.url ?? null, raw: (s.raw as unknown) ?? null },
            create: {
              workId: work.id,
              source: s.source,
              sourceId: s.sourceId,
              url: s.url ?? null,
              raw: (s.raw as unknown) ?? null,
            },
          });
        }

        const rel = await prisma.savedSearchWork.findUnique({
          where: { savedSearchId_workId: { savedSearchId: ss.id, workId: work.id } },
        });
        if (!rel) {
          await prisma.savedSearchWork.create({ data: { savedSearchId: ss.id, workId: work.id } });
          newCount += 1;
          newlySeen.push({
            id: work.id,
            title: work.title,
            url: work.url ?? null,
            year: work.year ?? null,
            venue: work.venue ?? null,
            doi: work.doi ?? null,
            arxivId: work.arxivId ?? null,
            sourcesCount: w.sources.length,
            hasAbstract: !!(work.abstract && String(work.abstract).trim().length > 120),
            authors: Array.isArray(w.authors) ? w.authors.map((a) => a.name).filter(Boolean) : [],
          });
        }
      }

      await prisma.savedSearch.update({
        where: { id: ss.id },
        data: { lastCheckedAt: new Date() },
      });

      if (newCount > 0) {
        const noise = (ss.noiseLevel as NoiseLevel) ?? "STANDARD";
        const strategy = (ss.pushStrategy as PushStrategy) ?? "HYBRID";
        const topN = ss.pushTopN ?? 10;
        const candidates = applyNoiseLevel(newlySeen, noise);
        const top = pickTop(candidates, strategy, topN, pref);

        const title = `SavedSearch「${ss.name}」新增 ${newCount} 篇`;
        const lines = top.map((it, idx) => {
          const meta = [it.year ? String(it.year) : null, it.venue ? it.venue : null].filter(Boolean).join(" · ");
          const head = `${idx + 1}. ${it.title}`;
          const tail = `${meta ? `（${meta}）` : ""}${it.url ? `\n   ${it.url}` : ""}`;
          return `${head}${tail}`;
        });
        const body =
          `查询：${ss.query}\n` +
          `新增数量：${newCount}\n` +
          `推送策略：${strategy} / Top ${topN} / Noise ${noise}\n` +
          `时间：${new Date().toISOString()}\n\n` +
          (lines.length > 0 ? `Top ${Math.min(topN, lines.length)}：\n${lines.join("\n")}` : "（无可推送条目：可能被噪音控制过滤）");

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "NEW_WORKS",
            title,
            body,
            data: {
              savedSearchId: ss.id,
              newCount,
              pushStrategy: strategy,
              pushTopN: topN,
              noiseLevel: noise,
              items: top.map((it) => ({
                id: it.id,
                title: it.title,
                url: it.url,
                year: it.year,
                venue: it.venue,
                doi: it.doi,
                arxivId: it.arxivId,
                authors: it.authors,
              })),
            },
          },
        });

        await sendEmail({ to: user.email, subject: title, text: body });
      }
    } catch (e: unknown) {
      runError = e instanceof Error ? e.message : String(e);
    } finally {
      await prisma.searchRun.create({
        data: {
          savedSearchId: ss.id,
          query: ss.query,
          filters: ss.filters ?? null,
          sources: { openalex: true, crossref: true, arxiv: true },
          stats: stats ?? null,
          error: runError,
        },
      });
      results.push({ savedSearchId: ss.id, newCount, error: runError });
    }

    // 简单节流：避免对外部 API 造成过高并发（V1 暂定每个 SavedSearch 串行执行）
    const ms = Date.now() - startedAt;
    if (ms < 300) {
      await new Promise((r) => setTimeout(r, 300 - ms));
    }
  }

  return NextResponse.json({ ok: true, results });
}


