import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aggregateSearch } from "@/lib/aggregateSearch";
import { normalizeArxivId, normalizeDoi, normalizeTitle } from "@/lib/normalize";
import { sendEmail } from "@/lib/email";
import type { SearchFilters } from "@/lib/filters";
import { SearchFiltersSchema } from "@/lib/filters";

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

    try {
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
                // authors 为 JSON 字段：无作者时使用 undefined（不写入），避免传入 null 触发类型错误
                authors: w.authors ?? undefined,
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
                // 同上，避免把 null 传给 JSON 字段
                authors: w.authors ?? undefined,
              },
            });

        for (const s of w.sources) {
          await prisma.workSource.upsert({
            where: { source_sourceId: { source: s.source, sourceId: s.sourceId } },
            update: {
              workId: work.id,
              url: s.url ?? null,
              // raw 为 JSON 字段：无数据时使用 undefined，避免传入普通 null
              raw: (s.raw as unknown) ?? undefined,
            },
            create: {
              workId: work.id,
              source: s.source,
              sourceId: s.sourceId,
              url: s.url ?? null,
              // 同上
              raw: (s.raw as unknown) ?? undefined,
            },
          });
        }

        const rel = await prisma.savedSearchWork.findUnique({
          where: { savedSearchId_workId: { savedSearchId: ss.id, workId: work.id } },
        });
        if (!rel) {
          await prisma.savedSearchWork.create({ data: { savedSearchId: ss.id, workId: work.id } });
          newCount += 1;
        }
      }

      await prisma.savedSearch.update({
        where: { id: ss.id },
        data: { lastCheckedAt: new Date() },
      });

      if (newCount > 0) {
        const title = `SavedSearch「${ss.name}」新增 ${newCount} 篇`;
        const body = `查询：${ss.query}\n新增数量：${newCount}\n时间：${new Date().toISOString()}`;

        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "NEW_WORKS",
            title,
            body,
            data: { savedSearchId: ss.id, newCount },
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
          // filters / stats 为 JSON 字段：无数据时使用 undefined，避免传入普通 null
          filters: ss.filters ?? undefined,
          sources: { openalex: true, crossref: true, arxiv: true },
          stats: (stats as unknown) ?? undefined,
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


