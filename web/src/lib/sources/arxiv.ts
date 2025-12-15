import type { AggregatedWork } from "./types";
import { normalizeArxivId } from "@/lib/normalize";

type ArxivEntry = {
  idUrl: string;
  title: string;
  summary: string;
  published: string;
  authors: string[];
  primaryCategory?: string | null;
  links: Array<{ href: string; rel?: string | null; type?: string | null }>;
};

function stripXml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function parseAtom(xml: string): ArxivEntry[] {
  // V1：轻量解析（不引入 XML 依赖，避免 Windows 安装坑）
  const entries: ArxivEntry[] = [];
  const entryBlocks = xml.split("<entry>").slice(1).map((x) => x.split("</entry>")[0] ?? "");

  for (const block of entryBlocks) {
    const idUrl = (block.match(/<id>([\s\S]*?)<\/id>/)?.[1] ?? "").trim();
    const title = stripXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const summary = stripXml(block.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? "");
    const published = (block.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? "").trim();
    const primaryCategory = (block.match(/<arxiv:primary_category[^>]*term="([^"]+)"/)?.[1] ?? null);
    const authors = Array.from(block.matchAll(/<name>([\s\S]*?)<\/name>/g)).map((m) => stripXml(m[1] ?? ""));
    const links = Array.from(block.matchAll(/<link\s+([^>]+?)\/>/g)).map((m) => {
      const attrs = m[1] ?? "";
      const href = attrs.match(/href="([^"]+)"/)?.[1] ?? "";
      const rel = attrs.match(/rel="([^"]+)"/)?.[1] ?? null;
      const type = attrs.match(/type="([^"]+)"/)?.[1] ?? null;
      return { href, rel, type };
    });

    if (!idUrl || !title) continue;
    entries.push({ idUrl, title, summary, published, authors, primaryCategory, links });
  }

  return entries;
}

/**
 * arXiv API 检索（Atom feed）。
 * @see https://info.arxiv.org/help/api/user-manual.html
 */
export async function searchArxiv(params: { query: string; maxResults: number }): Promise<AggregatedWork[]> {
  const url = new URL("https://export.arxiv.org/api/query");
  // V1：用 all: 做全文字段检索；后续可扩展到 ti:/abs:/cat:
  url.searchParams.set("search_query", `all:${params.query}`);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(params.maxResults));

  const res = await fetch(url, { headers: { "user-agent": "ScholarSearch/0.1" } });
  if (!res.ok) throw new Error(`arXiv error: ${res.status} ${res.statusText}`);
  const xml = await res.text();
  const entries = parseAtom(xml);

  return entries.map((e) => {
    const year = e.published ? Number(e.published.slice(0, 4)) : null;
    const arxivId = normalizeArxivId(e.idUrl.split("/abs/")[1] ?? e.idUrl);
    const pdf = e.links.find((l) => l.type === "application/pdf")?.href ?? null;
    const url = e.idUrl || pdf;

    return {
      title: e.title,
      abstract: e.summary || null,
      year: Number.isFinite(year) ? year : null,
      venue: e.primaryCategory ?? "arXiv",
      url,
      doi: null,
      openalexId: null,
      arxivId,
      authors: e.authors.map((name) => ({ name, affiliation: null })),
      sources: [
        {
          source: "ARXIV",
          sourceId: arxivId ?? e.idUrl,
          url,
          raw: e,
        },
      ],
    };
  });
}


