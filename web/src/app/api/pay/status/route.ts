import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { getActivePlanForUser } from "@/lib/subscription";
import { requireUser } from "@/lib/auth";

const QuerySchema = z.object({
  orderId: z.string().min(1),
});

/**
 * 查询订单状态（前端轮询用）。
 *
 * - GET /api/pay/status?orderId=...
 */
export async function GET(req: Request) {
  let me: { id: string; email: string };
  try {
    me = await requireUser(req);
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: status === 401 ? "unauthorized" : "server_error" }, { status });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const order = await prisma.paymentOrder.findFirst({
    where: { id: parsed.data.orderId, userId: me.id },
    select: { id: true, status: true, planId: true, period: true, amountCny: true, paidAt: true },
  });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  const planId = (await getActivePlanForUser(me.id)) ?? "FREE";
  return NextResponse.json({ ok: true, order, currentPlan: PLANS[planId] });
}


