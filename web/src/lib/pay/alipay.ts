import { AlipaySdk } from "alipay-sdk";

/**
 * 支付宝配置（当面付/预创建）。
 */
export type AlipayConfig = {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  notifyUrl: string;
};

/**
 * 从环境变量读取支付宝配置。
 */
export function getAlipayConfig(): AlipayConfig | null {
  const appId = process.env.ALIPAY_APP_ID || "";
  const privateKey = process.env.ALIPAY_PRIVATE_KEY || "";
  const alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY || "";
  const notifyUrl = process.env.ALIPAY_NOTIFY_URL || "";
  if (!appId || !privateKey || !alipayPublicKey || !notifyUrl) return null;
  return { appId, privateKey, alipayPublicKey, notifyUrl };
}

/**
 * 创建支付宝 SDK 实例。
 */
function createSdk(cfg: AlipayConfig): AlipaySdk {
  return new AlipaySdk({
    appId: cfg.appId,
    privateKey: cfg.privateKey,
    alipayPublicKey: cfg.alipayPublicKey,
    signType: "RSA2",
  });
}

/**
 * 支付宝“当面付”预创建订单，返回二维码链接（qr_code）。
 */
export async function alipayPrecreate(params: {
  cfg: AlipayConfig;
  outTradeNo: string;
  subject: string;
  totalAmountYuan: string;
}): Promise<{ qrCode: string; tradeNo?: string | null }> {
  const sdk = createSdk(params.cfg);

  const res = (await sdk.exec("alipay.trade.precreate", {
    notifyUrl: params.cfg.notifyUrl,
    bizContent: {
      outTradeNo: params.outTradeNo,
      subject: params.subject,
      totalAmount: params.totalAmountYuan,
    },
  })) as unknown;

  const obj = res && typeof res === "object" ? (res as Record<string, unknown>) : {};
  const qrCode =
    typeof obj.qr_code === "string"
      ? obj.qr_code
      : typeof obj.qrCode === "string"
        ? obj.qrCode
        : null;
  const tradeNo =
    typeof obj.trade_no === "string"
      ? obj.trade_no
      : typeof obj.tradeNo === "string"
        ? obj.tradeNo
        : null;
  if (!qrCode) {
    throw new Error(`alipay_precreate_failed: ${JSON.stringify(res)}`);
  }
  return { qrCode, tradeNo };
}

/**
 * 验证支付宝异步通知签名。
 */
export function verifyAlipayNotify(params: { cfg: AlipayConfig; body: Record<string, string> }): boolean {
  const sdk = createSdk(params.cfg);
  return sdk.checkNotifySign(params.body);
}


