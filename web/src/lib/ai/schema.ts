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

/**
 * LLM 输出的结构化“文献概要”：
 * - problem：解决的问题（尽量一句话）
 * - contributions：主要贡献（要点列表）
 * - innovations：创新点（要点列表）
 * - coreIdea：核心思路概述（较完整的一段话）
 *
 * 约束要点：
 * - 只根据输入的 title/abstract/元信息做归纳；缺失信息要明确说明“不足以判断”
 * - 保持简洁可读（前端将直接展示）
 */
export const AiWorkSummarySchema = z
  .object({
    problem: z.string().min(1).max(300),
    contributions: z.array(z.string().min(1).max(200)).min(1).max(8),
    innovations: z.array(z.string().min(1).max(200)).min(1).max(8),
    coreIdea: z.string().min(1).max(800),
  })
  .strict();

export type AiWorkSummary = z.infer<typeof AiWorkSummarySchema>;


