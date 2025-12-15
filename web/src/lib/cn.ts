/**
 * 拼接 Tailwind className。
 * - 支持传入 string / false / null / undefined
 * - 会自动过滤空值并用空格连接
 */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}


