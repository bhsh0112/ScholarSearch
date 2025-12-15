import type { AggregatedWork } from "./types";
import { normalizeDoi } from "@/lib/normalize";

type CrossrefItem = {
  DOI?: string;
  title?: string[];
  URL?: string;
  abstract?: string;
  "container-title"?: string[];
  issued?: { "date-parts"?: number[][] };
  author?: Array<{ given?: string; family?: string }>;
};

/**
 * Crossref works 检索（基于 query.bibliographic）。
 * @see https://api.crossref.org/swagger-ui/index.html
 */
export async function searchCrossref(params: {
  query: string;
  rows: number;
  mailto?: string | null;
}): Promise<AggregatedWork[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", params.query);
  url.searchParams.set("rows", String(params.rows));
  if (params.mailto) url.searchParams.set("mailto", params.mailto);

  const res = await fetch(url, { headers: { "user-agent": "ScholarSearch/0.1 (mailto: dev@localhost)" } });
  if (!res.ok) throw new Error(`Crossref error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { message?: { items?: CrossrefItem[] } };
  const items = json.message?.items ?? [];

  return items
    .map((it): AggregatedWork | null => {
      const title = (it.title?.[0] ?? "").trim();
      if (!title) return null;
      const doi = normalizeDoi(it.DOI);
      const year = it.issued?.["date-parts"]?.[0]?.[0] ?? null;
      const venue = it["container-title"]?.[0] ?? null;
      const url = it.URL ?? null;

      const authors =
        it.author?.map((a) => ({
          name: [a.given, a.family].filter(Boolean).join(" "),
          affiliation: null,
        })) ?? null;

      const sourceId = doi ?? url ?? title;

      return {
        title,
        abstract: it.abstract ?? null,
        year,
        venue,
        url,
        doi,
        openalexId: null,
        arxivId: null,
        authors,
        sources: [
          {
            source: "CROSSREF",
            sourceId,
            url,
            raw: it,
          },
        ],
      };
    })
    .filter((x): x is AggregatedWork => Boolean(x));
}


