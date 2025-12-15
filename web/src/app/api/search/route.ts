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
  return NextResponse.json({ works, stats });
}


