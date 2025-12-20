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
 * 把金额字符串解析为数字。
 */
function parseAmountYuan(input: string | undefined): number | null {
  if (!input) return null;
  const n = Number(input);
  return Number.isFinite(n) ? n : null;
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

  // 防止跨应用回调误入（通常都会存在 app_id）
  if (body.app_id && body.app_id !== cfg.appId) {
    console.error("alipay_notify_app_id_mismatch", { appId: body.app_id });
    return new NextResponse("fail", { status: 401 });
  }

  const outTradeNo = body.out_trade_no;
  const tradeNo = body.trade_no;
  const tradeStatus = body.trade_status; // TRADE_SUCCESS / TRADE_FINISHED / ...
  const totalAmount = parseAmountYuan(body.total_amount ?? body.buyer_pay_amount);

  if (!outTradeNo) return new NextResponse("fail", { status: 400 });

  const order = await prisma.paymentOrder.findUnique({
    where: { outTradeNo },
    select: { id: true, status: true, userId: true, planId: true, period: true, amountCny: true, provider: true },
  });
  if (!order) return new NextResponse("success");

  // 订单与支付渠道不匹配时直接忽略（避免同一个 outTradeNo 误用）
  if (order.provider !== "ALIPAY") return new NextResponse("success");

  // 验金额（最基础的防护，防止低金额支付“撞库”开通高价订阅）
  if (totalAmount != null) {
    const expected = Number(order.amountCny);
    if (Math.abs(totalAmount - expected) > 0.0001) {
      console.error("alipay_notify_amount_mismatch", {
        outTradeNo,
        expectedAmountCny: expected,
        totalAmount,
      });
      return new NextResponse("fail", { status: 400 });
    }
  }

  if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
    const now = new Date();
    // 强幂等：只允许从非 PAID -> PAID 更新一次，避免重复回调造成重复续费
    const updated = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: { not: "PAID" } },
      data: { status: "PAID", providerTradeNo: tradeNo ?? null, paidAt: now },
    });
    if (updated.count === 1) {
      await upsertSubscription({
        userId: order.userId,
        planId: normalizePlanId(order.planId),
        period: order.period,
      });
    }
    return new NextResponse("success");
  }

  // 非成功状态：尽量记录为失败/取消，但避免把已 PAID 的订单覆盖回去
  const nextStatus = tradeStatus === "TRADE_CLOSED" ? "CANCELED" : "FAILED";
  await prisma.paymentOrder.updateMany({
    where: { id: order.id, status: { not: "PAID" } },
    data: { status: nextStatus, providerTradeNo: tradeNo ?? null },
  });

  return new NextResponse("success");
}


