import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWechatPayConfig, decryptWechatResource, verifyWechatNotify } from "@/lib/pay/wechat";
import { upsertSubscription } from "@/lib/subscription";
import { normalizePlanId } from "@/lib/plans";

/**
 * 微信支付回调（V3）。
 *
 * - POST /api/pay/wechat/notify
 * - 需要在商户平台配置 notify_url = WECHATPAY_NOTIFY_URL
 */
export async function POST(req: Request) {
  const cfg = getWechatPayConfig();
  if (!cfg) return NextResponse.json({ code: "FAIL", message: "not_configured" }, { status: 500 });

  const rawBody = await req.text();
  const ok = verifyWechatNotify({ cfg, headers: req.headers, rawBody });
  if (!ok) return NextResponse.json({ code: "FAIL", message: "invalid_signature" }, { status: 401 });

  const json = JSON.parse(rawBody) as unknown;
  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const resource = root.resource && typeof root.resource === "object" ? (root.resource as Record<string, unknown>) : null;
  const ciphertext = resource && typeof resource.ciphertext === "string" ? resource.ciphertext : null;
  const nonce = resource && typeof resource.nonce === "string" ? resource.nonce : null;
  const associatedData = resource && typeof resource.associated_data === "string" ? resource.associated_data : "";
  if (!ciphertext || !nonce) {
    return NextResponse.json({ code: "FAIL", message: "invalid_payload" }, { status: 400 });
  }

  const decrypted = decryptWechatResource({
    cfg,
    resource: { ciphertext, nonce, associated_data: associatedData },
  });
  const data = JSON.parse(decrypted) as unknown;
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const outTradeNo = typeof obj.out_trade_no === "string" ? obj.out_trade_no : null;
  const tradeState = typeof obj.trade_state === "string" ? obj.trade_state : null; // SUCCESS / ...
  const transactionId = typeof obj.transaction_id === "string" ? obj.transaction_id : null;
  if (!outTradeNo) return NextResponse.json({ code: "FAIL", message: "missing_out_trade_no" }, { status: 400 });

  // amount.total（分）用于验金额
  const amountObj = obj.amount && typeof obj.amount === "object" ? (obj.amount as Record<string, unknown>) : null;
  const amountTotalFen = amountObj && typeof amountObj.total === "number" ? amountObj.total : null;

  const order = await prisma.paymentOrder.findUnique({
    where: { outTradeNo },
    select: { id: true, status: true, userId: true, planId: true, period: true, amountCny: true, provider: true },
  });
  if (!order) return NextResponse.json({ code: "SUCCESS", message: "order_not_found_ignored" });

  if (order.provider !== "WECHAT") return NextResponse.json({ code: "SUCCESS", message: "provider_mismatch_ignored" });

  if (amountTotalFen != null) {
    const expectedFen = order.amountCny * 100;
    if (amountTotalFen !== expectedFen) {
      console.error("wechat_notify_amount_mismatch", { outTradeNo, expectedFen, amountTotalFen });
      return NextResponse.json({ code: "FAIL", message: "amount_mismatch" }, { status: 400 });
    }
  }

  if (tradeState === "SUCCESS") {
    const now = new Date();
    const updated = await prisma.paymentOrder.updateMany({
      where: { id: order.id, status: { not: "PAID" } },
      data: { status: "PAID", providerTradeNo: transactionId ?? null, paidAt: now },
    });
    if (updated.count === 1) {
      await upsertSubscription({
        userId: order.userId,
        planId: normalizePlanId(order.planId),
        period: order.period,
      });
    }
    return NextResponse.json({ code: "SUCCESS", message: "OK" });
  }

  // 其他状态先仅记录，不做订阅开通
  await prisma.paymentOrder.updateMany({
    where: { id: order.id, status: { not: "PAID" } },
    data: { status: "FAILED", providerTradeNo: transactionId ?? null },
  });

  return NextResponse.json({ code: "SUCCESS", message: "IGNORED" });
}


