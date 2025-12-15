/**
 * 标题归一化：用于跨源去重（弱匹配兜底）。
 * - 小写化
 * - 去掉标点/多余空白
 * - 移除常见噪声字符
 */
export function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 解析 DOI 并做轻量标准化（全部小写）。
 */
export function normalizeDoi(doi?: string | null): string | null {
  if (!doi) return null;
  const cleaned = doi.trim().toLowerCase();
  if (!cleaned) return null;
  return cleaned.replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
}

/**
 * 解析 arXiv id（去掉前缀、版本号）。
 * @example "arXiv:2401.01234v2" -> "2401.01234"
 */
export function normalizeArxivId(arxivId?: string | null): string | null {
  if (!arxivId) return null;
  const cleaned = arxivId.trim().replace(/^arxiv:/i, "");
  const noVersion = cleaned.replace(/v\d+$/i, "");
  return noVersion || null;
}


