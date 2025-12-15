import { NextResponse } from "next/server";
import { z } from "zod";
import { aiExpandQuery } from "@/lib/ai/client";
import { getCurrentPlan } from "@/lib/plans";

const AiExpandRequestSchema = z.object({
  q: z.string().min(1).max(500),
  context: z.string().min(1).max(1000).optional(),
});

/**
 * AI 扩展自由文本查询：
 * - POST /api/ai/expand
 * body: { q, context? }
 *
 * 返回：
 * - 若未配置 LLM_* 环境变量，返回 { ok: false, error: "llm_not_configured" }
 * - 否则返回 { ok: true, result }
 */
export async function POST(req: Request) {
  const plan = getCurrentPlan();
  if (!plan.limits.aiEnabled) {
    return NextResponse.json(
      { ok: false, error: "plan_required", message: "当前计划不支持 AI 功能，请升级到 Pro/Max。" },
      { status: 200 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = AiExpandRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await aiExpandQuery({ query: parsed.data.q, userContext: parsed.data.context ?? null });
    if (!result) {
      return NextResponse.json({ ok: false, error: "llm_not_configured" }, { status: 200 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "ai_failed";
    return NextResponse.json({ ok: false, error: "ai_failed", message }, { status: 200 });
  }
}


