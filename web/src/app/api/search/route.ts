import { NextResponse } from "next/server";
import { z } from "zod";
import { aggregateSearch } from "@/lib/aggregateSearch";
import { SearchFiltersSchema } from "@/lib/filters";

const SearchRequestSchema = z.object({
  q: z.string().min(1).max(300),
  perSource: z.number().int().min(1).max(50).default(20),
  filters: SearchFiltersSchema.optional(),
});

/**
 * 聚合检索 API：
 * POST /api/search
 * body: { q, perSource }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = SearchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { q, perSource } = parsed.data;
  const { works, stats } = await aggregateSearch({
    query: q,
    perSource,
    filters: parsed.data.filters ?? null,
  });

  // 说明：
  // - 聚合层为了可追溯会在 sources.raw 里携带原始对象（可能很大）
  // - 前端展示检索结果不需要 raw，返回给浏览器会增大 payload，也会影响 state 持久化
  const slimWorks = works.map((w) => ({
    ...w,
    sources: w.sources.map((s) => ({
      source: s.source,
      sourceId: s.sourceId,
      url: s.url ?? null,
      // raw: intentionally omitted
    })),
  }));

  return NextResponse.json({ works: slimWorks, stats });
}


