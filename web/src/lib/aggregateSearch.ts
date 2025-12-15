import type { AggregatedWork } from "@/lib/sources/types";
import { normalizeArxivId, normalizeDoi, normalizeTitle } from "@/lib/normalize";
import { searchOpenAlex } from "@/lib/sources/openalex";
import { searchCrossref } from "@/lib/sources/crossref";
import { searchArxiv } from "@/lib/sources/arxiv";
import type { SearchFilters } from "@/lib/filters";
import { applySearchFilters } from "@/lib/filters";

/**
 * 聚合检索配置
 */
export type AggregateSearchParams = {
  query: string;
  perSource: number;
  mailto?: string | null;
  filters?: SearchFilters | null;
};

/**
 * 去重键：优先 DOI，其次 arXiv id，其次归一化标题。
 */
function dedupKey(w: AggregatedWork): string {
  const doi = normalizeDoi(w.doi);
  if (doi) return `doi:${doi}`;
  const ax = normalizeArxivId(w.arxivId);
  if (ax) return `arxiv:${ax}`;
  return `title:${normalizeTitle(w.title)}`;
}

/**
 * 合并两条 work（以 a 为主，b 补全空字段；sources 合并）。
 */
function mergeWork(a: AggregatedWork, b: AggregatedWork): AggregatedWork {
  return {
    title: a.title || b.title,
    abstract: a.abstract ?? b.abstract ?? null,
    year: a.year ?? b.year ?? null,
    venue: a.venue ?? b.venue ?? null,
    url: a.url ?? b.url ?? null,
    doi: normalizeDoi(a.doi) ?? normalizeDoi(b.doi) ?? null,
    arxivId: normalizeArxivId(a.arxivId) ?? normalizeArxivId(b.arxivId) ?? null,
    openalexId: a.openalexId ?? b.openalexId ?? null,
    authors: a.authors ?? b.authors ?? null,
    sources: [...a.sources, ...b.sources],
  };
}

/**
 * OpenAlex + Crossref + arXiv 聚合检索，并进行基础去重合并。
 */
export async function aggregateSearch(params: AggregateSearchParams): Promise<{
  works: AggregatedWork[];
  stats: Record<string, unknown>;
}> {
  const startedAt = Date.now();
  const [openalexRes, crossrefRes, arxivRes] = await Promise.allSettled([
    searchOpenAlex({ query: params.query, perPage: params.perSource, mailto: params.mailto ?? null }),
    searchCrossref({ query: params.query, rows: params.perSource, mailto: params.mailto ?? null }),
    searchArxiv({ query: params.query, maxResults: params.perSource }),
  ]);

  const openalex = openalexRes.status === "fulfilled" ? openalexRes.value : [];
  const crossref = crossrefRes.status === "fulfilled" ? crossrefRes.value : [];
  const arxiv = arxivRes.status === "fulfilled" ? arxivRes.value : [];

  const errors = {
    openalex: openalexRes.status === "rejected" ? String(openalexRes.reason) : null,
    crossref: crossrefRes.status === "rejected" ? String(crossrefRes.reason) : null,
    arxiv: arxivRes.status === "rejected" ? String(arxivRes.reason) : null,
  };

  const all = [...openalex, ...crossref, ...arxiv];
  const map = new Map<string, AggregatedWork>();
  for (const w of all) {
    const key = dedupKey(w);
    const existing = map.get(key);
    map.set(key, existing ? mergeWork(existing, w) : w);
  }

  const merged = Array.from(map.values());
  const filtered = applySearchFilters(merged, params.filters ?? null);

  const works = filtered.sort((a, b) => {
    // V1：简单排序：年份新优先，其次标题
    const ya = a.year ?? 0;
    const yb = b.year ?? 0;
    if (ya !== yb) return yb - ya;
    return a.title.localeCompare(b.title);
  });

  return {
    works,
    stats: {
      query: params.query,
      perSource: params.perSource,
      filters: params.filters ?? null,
      counts: {
        openalex: openalex.length,
        crossref: crossref.length,
        arxiv: arxiv.length,
        merged: merged.length,
        filtered: works.length,
      },
      errors,
      ms: Date.now() - startedAt,
    },
  };
}


