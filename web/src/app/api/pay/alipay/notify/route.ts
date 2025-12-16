import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAlipayConfig, verifyAlipayNotify } from "@/lib/pay/alipay";
import { upsertSubscription } from "@/lib/subscription";
import { normalizePlanId } from "@/lib/plans";

/**
 * 解析 application/x-www-form-urlencoded。
 */
async function parseForm(req: Request): Promise<Record<string, string>> {
  const text = await req.text();
  const params = new URLSearchParams(text);
  const obj: Record<string, string> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

/**
 * 支付宝回调（当面付）。
 *
 * - POST /api/pay/alipay/notify
 * - 需要在开放平台配置 notify_url = ALIPAY_NOTIFY_URL
 */
export async function POST(req: Request) {
  const cfg = getAlipayConfig();
  if (!cfg) return new NextResponse("fail", { status: 500 });

  const body = await parseForm(req);
  const ok = verifyAlipayNotify({ cfg, body });
  if (!ok) return new NextResponse("fail", { status: 401 });

  const outTradeNo = body.out_trade_no;
  const tradeNo = body.trade_no;
  const tradeStatus = body.trade_status; // TRADE_SUCCESS / TRADE_FINISHED / ...

  if (!outTradeNo) return new NextResponse("fail", { status: 400 });

  const order = await prisma.paymentOrder.findUnique({
    where: { outTradeNo },
    select: { id: true, status: true, userId: true, planId: true, period: true },
  });
  if (!order) return new NextResponse("success");

  if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
    if (order.status !== "PAID") {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: "PAID", providerTradeNo: tradeNo ?? null, paidAt: new Date() },
      });
      await upsertSubscription({
        userId: order.userId,
        planId: normalizePlanId(order.planId),
        period: order.period,
      });
    }
    return new NextResponse("success");
  }

  await prisma.paymentOrder.update({
    where: { id: order.id },
    data: { status: "FAILED", providerTradeNo: tradeNo ?? null },
  });

  return new NextResponse("success");
}


