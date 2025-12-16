import { prisma } from "@/lib/prisma";
import { normalizePlanId, type PlanId } from "@/lib/plans";

/**
 * 获取用户当前有效订阅对应的计划。
 *
 * 规则：
 * - 取 ACTIVE 且 currentPeriodEnd > now 的最新一条
 * - 没有则返回 null
 */
export async function getActivePlanForUser(userId: string): Promise<PlanId | null> {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", currentPeriodEnd: { gt: now } },
    orderBy: { currentPeriodEnd: "desc" },
    select: { planId: true },
  });
  if (!sub) return null;
  return normalizePlanId(sub.planId);
}

/**
 * 创建或续费订阅（用于支付成功回调）。
 *
 * 策略：
 * - 若已有 ACTIVE 订阅且未过期：在其 currentPeriodEnd 基础上延长
 * - 否则：从现在开始生效
 */
export async function upsertSubscription(params: {
  userId: string;
  planId: PlanId;
  period: "MONTHLY" | "YEARLY";
}): Promise<void> {
  const now = new Date();
  const existing = await prisma.subscription.findFirst({
    where: { userId: params.userId, status: "ACTIVE", currentPeriodEnd: { gt: now } },
    orderBy: { currentPeriodEnd: "desc" },
    select: { id: true, currentPeriodEnd: true },
  });

  const base = existing?.currentPeriodEnd && existing.currentPeriodEnd > now ? existing.currentPeriodEnd : now;
  const end = new Date(base);
  if (params.period === "MONTHLY") end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { planId: params.planId, currentPeriodEnd: end, status: "ACTIVE" },
    });
    return;
  }

  await prisma.subscription.create({
    data: { userId: params.userId, planId: params.planId, status: "ACTIVE", currentPeriodEnd: end },
  });
}


