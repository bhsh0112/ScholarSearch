import { z } from "zod";
import { SearchFiltersSchema } from "@/lib/filters";

/**
 * LLM 输出的结构化结果（用于“可编辑的检索式草案 + filters”）。
 *
 * 约束要点：
 * - 必须输出 queryDraft（给用户可编辑）
 * - filters 复用现有 SearchFiltersSchema（用于后端一致过滤/追踪）
 */
export const AiExpandResultSchema = z
  .object({
    queryDraft: z.string().min(1).max(600),
    filters: SearchFiltersSchema.optional(),
    keywords: z.array(z.string().min(1).max(80)).max(30).optional(),
    mustNot: z.array(z.string().min(1).max(80)).max(30).optional(),
    rationale: z.string().min(1).max(600).optional(),
  })
  .strict();

export type AiExpandResult = z.infer<typeof AiExpandResultSchema>;


