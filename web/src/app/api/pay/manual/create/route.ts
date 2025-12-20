import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { PLANS, type PlanId } from "@/lib/plans";

const CreateManualTopupSchema = z.object({
  planId: z.enum(["PRO", "MAX"]),
  period: z.enum(["MONTHLY", "YEARLY"]),
  channel: z.enum(["ALIPAY", "WECHAT"]).default("ALIPAY"),
});

function amountFor(planId: PlanId, period: "MONTHLY" | "YEARLY"): number {
  const p = PLANS[planId];
  const cny = period === "MONTHLY" ? p.pricing.monthlyCny : p.pricing.yearlyCny;
  return Math.max(1, Math.floor(cny));
}

/**
 * 创建“人工收款码充值”请求。
 *
 * - POST /api/pay/manual/create
 * - 返回参考码 referenceCode（建议用户填在转账备注）
 */
export async function POST(req: Request) {
  const me = await requireUser(req);
  // 兼容：旧版本只配置 MANUAL_PAY_QR_URL（默认当作支付宝收款码）
  const legacy = (process.env.MANUAL_PAY_QR_URL || "").trim();
  const alipayQrUrl = ((process.env.MANUAL_PAY_QR_URL_ALIPAY || "").trim() || legacy).trim();
  const wechatQrUrl = (process.env.MANUAL_PAY_QR_URL_WECHAT || "").trim();

  const body = await req.json().catch(() => ({}));
  const parsed = CreateManualTopupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const { planId, period, channel } = parsed.data;
  const amountCny = amountFor(planId as PlanId, period);
  const qrUrl = channel === "WECHAT" ? wechatQrUrl : alipayQrUrl;
  if (!qrUrl) return NextResponse.json({ error: "manual_pay_not_configured" }, { status: 500 });
  const provider = channel === "WECHAT" ? "MANUAL_WECHAT_QR" : "MANUAL_ALIPAY_QR";

  // 用 cuid 生成后再拼参考码，确保唯一性与可读性
  const tmp = await prisma.manualTopup.create({
    data: {
      userId: me.id,
      provider,
      planId,
      period,
      amountCny,
      referenceCode: "tmp",
      status: "CREATED",
    },
    select: { id: true },
  });

  const referenceCode = `ss_topup_${tmp.id}`;
  await prisma.manualTopup.update({
    where: { id: tmp.id },
    data: { referenceCode },
  });

  const instructions =
    (process.env.MANUAL_PAY_INSTRUCTIONS || "").trim() ||
    "请扫码付款，并在“转账备注/留言”中填写参考码；付款后点击“我已付款”提交确认，管理员审核后开通。";

  return NextResponse.json({
    ok: true,
    topupId: tmp.id,
    qrUrl,
    instructions,
    referenceCode,
    amountCny,
    planId,
    period,
    channel,
  });
}


