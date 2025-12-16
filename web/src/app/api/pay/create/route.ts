import { NextResponse } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { PLANS, type PlanId } from "@/lib/plans";
import { getAlipayConfig, alipayPrecreate } from "@/lib/pay/alipay";
import { getWechatPayConfig, wechatCreateNativeOrder } from "@/lib/pay/wechat";

const CreateOrderSchema = z.object({
  provider: z.enum(["WECHAT", "ALIPAY"]),
  planId: z.enum(["PRO", "MAX"]),
  period: z.enum(["MONTHLY", "YEARLY"]),
});

function makeOutTradeNo(): string {
  return `ss_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function amountFor(planId: PlanId, period: "MONTHLY" | "YEARLY"): number {
  const p = PLANS[planId];
  const cny = period === "MONTHLY" ? p.pricing.monthlyCny : p.pricing.yearlyCny;
  return Math.max(1, Math.floor(cny));
}

/**
 * 创建支付订单（扫码）。
 *
 * - POST /api/pay/create
 * - 返回二维码 DataURL，前端直接展示
 */
export async function POST(req: Request) {
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { provider, planId, period } = parsed.data;
  const amountCny = amountFor(planId as PlanId, period);
  const outTradeNo = makeOutTradeNo();

  const order = await prisma.paymentOrder.create({
    data: {
      userId: user.id,
      provider,
      status: "PENDING",
      planId,
      period,
      amountCny,
      outTradeNo,
    },
    select: { id: true, outTradeNo: true },
  });

  try {
    if (provider === "WECHAT") {
      const cfg = getWechatPayConfig();
      if (!cfg) {
        return NextResponse.json({ error: "wechat_not_configured" }, { status: 500 });
      }
      const res = await wechatCreateNativeOrder({
        cfg,
        outTradeNo: order.outTradeNo,
        description: `ScholarSearch ${planId} ${period}`,
        amountFen: amountCny * 100,
      });
      const qrDataUrl = await QRCode.toDataURL(res.codeUrl, { margin: 1, width: 240 });
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { qrCodeUrl: res.codeUrl },
      });
      return NextResponse.json({ ok: true, orderId: order.id, provider, qrDataUrl, qrCodeUrl: res.codeUrl });
    }

    const cfg = getAlipayConfig();
    if (!cfg) {
      return NextResponse.json({ error: "alipay_not_configured" }, { status: 500 });
    }
    const res = await alipayPrecreate({
      cfg,
      outTradeNo: order.outTradeNo,
      subject: `ScholarSearch ${planId} ${period}`,
      totalAmountYuan: String(amountCny),
    });
    const qrDataUrl = await QRCode.toDataURL(res.qrCode, { margin: 1, width: 240 });
    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: { qrCodeUrl: res.qrCode, providerTradeNo: res.tradeNo ?? null },
    });
    return NextResponse.json({ ok: true, orderId: order.id, provider, qrDataUrl, qrCodeUrl: res.qrCode });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.paymentOrder.update({ where: { id: order.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "create_order_failed", message: msg }, { status: 500 });
  }
}


