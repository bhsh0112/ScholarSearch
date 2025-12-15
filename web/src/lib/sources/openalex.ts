import type { AggregatedWork } from "./types";
import { normalizeDoi } from "@/lib/normalize";

type OpenAlexWork = {
  id: string;
  title?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  primary_location?: { source?: { display_name?: string | null } | null; landing_page_url?: string | null } | null;
  host_venue?: { display_name?: string | null } | null;
  authorships?: Array<{
    author?: { display_name?: string | null } | null;
    institutions?: Array<{ display_name?: string | null }> | null;
  }> | null;
};

function invertedIndexToAbstract(idx?: Record<string, number[]> | null): string | null {
  if (!idx) return null;
  // 将 inverted index 还原为文本（近似即可）
  const positions: Array<{ pos: number; token: string }> = [];
  for (const [token, arr] of Object.entries(idx)) {
    for (const pos of arr) positions.push({ pos, token });
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.token).join(" ");
}

/**
 * OpenAlex 搜索 works。
 * @see https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/works
 */
export async function searchOpenAlex(params: {
  query: string;
  perPage: number;
  mailto?: string | null;
}): Promise<AggregatedWork[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", params.query);
  url.searchParams.set("per-page", String(params.perPage));
  if (params.mailto) url.searchParams.set("mailto", params.mailto);

  const res = await fetch(url, { headers: { "user-agent": "ScholarSearch/0.1 (mailto: dev@localhost)" } });
  if (!res.ok) throw new Error(`OpenAlex error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { results?: OpenAlexWork[] };
  const results = json.results ?? [];

  return results
    .map((w): AggregatedWork | null => {
      const title = (w.title ?? "").trim();
      if (!title) return null;
      const doi = normalizeDoi(w.doi);
      const openalexId = w.id;
      const venue =
        w.primary_location?.source?.display_name ??
        w.host_venue?.display_name ??
        null;
      const url = w.primary_location?.landing_page_url ?? null;
      const abs = invertedIndexToAbstract(w.abstract_inverted_index);

      const authors =
        w.authorships?.map((a) => ({
          name: a.author?.display_name ?? "Unknown",
          affiliation: a.institutions?.[0]?.display_name ?? null,
        })) ?? null;

      return {
        title,
        abstract: abs,
        year: w.publication_year ?? null,
        venue,
        url,
        doi,
        openalexId,
        sources: [
          {
            source: "OPENALEX",
            sourceId: openalexId,
            url,
            raw: w,
          },
        ],
        authors,
      };
    })
    .filter((x): x is AggregatedWork => Boolean(x))
    .map((x) => ({ ...x, title: x.title, abstract: x.abstract ?? null, doi: x.doi ?? null, openalexId: x.openalexId ?? null, arxivId: null }));
}


