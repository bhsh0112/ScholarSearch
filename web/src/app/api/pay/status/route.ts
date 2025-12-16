import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { getActivePlanForUser } from "@/lib/subscription";

const QuerySchema = z.object({
  orderId: z.string().min(1),
});

/**
 * 查询订单状态（前端轮询用）。
 *
 * - GET /api/pay/status?orderId=...
 */
export async function GET(req: Request) {
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const order = await prisma.paymentOrder.findFirst({
    where: { id: parsed.data.orderId, userId: user.id },
    select: { id: true, status: true, planId: true, period: true, amountCny: true, paidAt: true },
  });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  const planId = (await getActivePlanForUser(user.id)) ?? "FREE";
  return NextResponse.json({ ok: true, order, currentPlan: PLANS[planId] });
}


