import { NextResponse } from "next/server";
import { PLANS, getCurrentPlan, normalizePlanId } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getActivePlanForUser } from "@/lib/subscription";

/**
 * 当前订阅计划（单用户模式）。
 *
 * - GET /api/plan
 * - 通过 APP_PLAN 环境变量模拟（FREE/PRO/MAX）
 */
export async function GET() {
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });

  const subPlan = await getActivePlanForUser(user.id);
  const fallback = getCurrentPlan();
  const planId = subPlan ?? normalizePlanId(fallback.id);
  const plan = PLANS[planId];
  return NextResponse.json({ plan });
}


