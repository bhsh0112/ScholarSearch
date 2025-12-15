/**
 * 统一论文模型（聚合检索输出）。
 * - 这不是 Prisma 的 Work（数据库实体）；而是 API 层返回给前端/后续写库的 DTO。
 */
export type AggregatedWork = {
  title: string;
  abstract?: string | null;
  year?: number | null;
  venue?: string | null;
  url?: string | null;

  doi?: string | null;
  arxivId?: string | null;
  openalexId?: string | null;

  authors?: Array<{ name: string; affiliation?: string | null }> | null;

  /** 用于可追溯：每个来源的标识与 URL */
  sources: Array<{
    source: "OPENALEX" | "CROSSREF" | "ARXIV";
    sourceId: string;
    url?: string | null;
    raw?: unknown;
  }>;
};


