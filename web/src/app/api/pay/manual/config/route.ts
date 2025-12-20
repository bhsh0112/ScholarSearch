import { NextResponse } from "next/server";

/**
 * 人工收款码支付配置（V1）。
 *
 * - GET /api/pay/manual/config
 * - 仅返回“展示用”的信息：二维码地址与说明文案
 */
export async function GET() {
  // 兼容：旧版本只配置 MANUAL_PAY_QR_URL（默认当作支付宝收款码）
  const legacy = (process.env.MANUAL_PAY_QR_URL || "").trim();
  const alipayQrUrl = ((process.env.MANUAL_PAY_QR_URL_ALIPAY || "").trim() || legacy).trim();
  const wechatQrUrl = (process.env.MANUAL_PAY_QR_URL_WECHAT || "").trim();
  const instructions =
    (process.env.MANUAL_PAY_INSTRUCTIONS || "").trim() ||
    "请扫码付款，并在“转账备注/留言”中填写参考码；付款后点击“我已付款”提交确认，管理员审核后开通。";

  return NextResponse.json({
    ok: true,
    enabled: Boolean(alipayQrUrl || wechatQrUrl),
    qrUrls: {
      ALIPAY: alipayQrUrl,
      WECHAT: wechatQrUrl,
    },
    instructions,
  });
}


