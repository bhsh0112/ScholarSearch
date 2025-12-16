import { NextResponse } from "next/server";
import { PLANS, getCurrentPlan, normalizePlanId } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getActivePlanForUser } from "@/lib/subscription";
import { requireUser } from "@/lib/auth";

/**
 * 当前订阅计划（单用户模式）。
 *
 * - GET /api/plan
 * - 通过 APP_PLAN 环境变量模拟（FREE/PRO/MAX）
 */
export async function GET(req: Request) {
  try {
    const me = await requireUser(req);
    const exists = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

    const subPlan = await getActivePlanForUser(me.id);
    const fallback = getCurrentPlan();
    const planId = subPlan ?? normalizePlanId(fallback.id);
    const plan = PLANS[planId];
    return NextResponse.json({ plan });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: status === 401 ? "unauthorized" : "server_error" }, { status });
  }
}


