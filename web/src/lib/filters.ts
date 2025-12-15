import { z } from "zod";
import type { AggregatedWork } from "@/lib/sources/types";

/**
 * V1 统一过滤条件（跨 OpenAlex / Crossref / arXiv 一致）。
 * - 先做 post-filter，保证“自由输入 + 多维限制”可用且行为一致
 * - 后续可逐步把 filters 下推到各数据源，提高效率/召回
 */
export const SearchFiltersSchema = z
  .object({
    yearFrom: z.number().int().min(1500).max(3000).optional(),
    yearTo: z.number().int().min(1500).max(3000).optional(),

    /** 期刊/会议/venue：任意一个命中即可 */
    venues: z.array(z.string().min(1).max(120)).max(10).optional(),

    /** 作者：任意一个命中即可（按子串匹配，大小写不敏感） */
    authors: z.array(z.string().min(1).max(80)).max(10).optional(),

    /** 数据源限制：不选则表示全部 */
    sources: z.array(z.enum(["OPENALEX", "CROSSREF", "ARXIV"])).optional(),
  })
  .strict();

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

/**
 * 判断某条 work 的来源集合是否与 sources 限制相交。
 */
function matchSources(work: AggregatedWork, sources?: SearchFilters["sources"]): boolean {
  if (!sources || sources.length === 0) return true;
  const set = new Set(sources);
  return work.sources.some((s) => set.has(s.source));
}

/**
 * post-filter：对聚合结果做统一过滤。
 */
export function applySearchFilters(works: AggregatedWork[], filters?: SearchFilters | null): AggregatedWork[] {
  if (!filters) return works;

  const yearFrom = filters.yearFrom ?? null;
  const yearTo = filters.yearTo ?? null;
  const venues = (filters.venues ?? []).map((s) => s.toLowerCase());
  const authors = (filters.authors ?? []).map((s) => s.toLowerCase());

  return works.filter((w) => {
    if (!matchSources(w, filters.sources)) return false;

    if (yearFrom !== null) {
      const y = w.year ?? null;
      if (y === null || y < yearFrom) return false;
    }
    if (yearTo !== null) {
      const y = w.year ?? null;
      if (y === null || y > yearTo) return false;
    }

    if (venues.length > 0) {
      const v = (w.venue ?? "").toLowerCase();
      if (!venues.some((needle) => v.includes(needle))) return false;
    }

    if (authors.length > 0) {
      const names = (w.authors ?? []).map((a) => (a.name ?? "").toLowerCase());
      if (!authors.some((needle) => names.some((n) => n.includes(needle)))) return false;
    }

    return true;
  });
}


