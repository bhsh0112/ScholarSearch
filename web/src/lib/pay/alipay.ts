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
 * 归一化环境变量中的 Key 文本。
 *
 * 常见问题：
 * - 部署平台用单行环境变量存 PEM，会把换行写成 `\n`
 * - 有些平台会在首尾带空格/换行
 */
function normalizeKeyText(input: string): string {
  return (input || "").replace(/\\n/g, "\n").trim();
}

/**
 * 将 SDK 返回值尽量转为对象（兼容不同版本/不同返回形态）。
 */
function asObject(res: unknown): Record<string, unknown> {
  if (res && typeof res === "object") return res as Record<string, unknown>;
  if (typeof res === "string") {
    const s = res.trim();
    if (s.startsWith("{") && s.endsWith("}")) {
      try {
        const parsed = JSON.parse(s) as unknown;
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      } catch {
        // ignore
      }
    }
  }
  return {};
}

/**
 * 获取支付宝响应 wrapper（如 alipay_trade_precreate_response）。
 */
function unwrapResponse(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = obj[key];
  return v && typeof v === "object" ? (v as Record<string, unknown>) : obj;
}

/**
 * 从环境变量读取支付宝配置。
 */
export function getAlipayConfig(): AlipayConfig | null {
  const appId = process.env.ALIPAY_APP_ID || "";
  const privateKey = normalizeKeyText(process.env.ALIPAY_PRIVATE_KEY || "");
  const alipayPublicKey = normalizeKeyText(process.env.ALIPAY_PUBLIC_KEY || "");
  const notifyUrl = (process.env.ALIPAY_NOTIFY_URL || "").trim();
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

  const obj = asObject(res);
  // alipay-sdk 常见结构：{ alipay_trade_precreate_response: { qr_code, trade_no, ... } }
  const data = unwrapResponse(obj, "alipay_trade_precreate_response");
  const qrCode =
    typeof data.qr_code === "string"
      ? data.qr_code
      : typeof data.qrCode === "string"
        ? data.qrCode
        : null;
  const tradeNo =
    typeof data.trade_no === "string"
      ? data.trade_no
      : typeof data.tradeNo === "string"
        ? data.tradeNo
        : null;
  if (!qrCode) {
    throw new Error(`alipay_precreate_failed: ${JSON.stringify(res)}`);
  }
  return { qrCode, tradeNo };
}

/**
 * 主动查询支付宝订单状态（用于无公网回调的本地/测试机联调）。
 *
 * 注意：返回值字段名在不同 SDK 版本可能有差异，这里做宽松兼容解析。
 */
export async function alipayQueryTrade(params: {
  cfg: AlipayConfig;
  outTradeNo: string;
}): Promise<{ tradeStatus: string | null; tradeNo: string | null }> {
  const sdk = createSdk(params.cfg);
  const res = (await sdk.exec("alipay.trade.query", {
    bizContent: { outTradeNo: params.outTradeNo },
  })) as unknown;

  const obj = asObject(res);
  const data = unwrapResponse(obj, "alipay_trade_query_response");
  const tradeStatus =
    typeof data.trade_status === "string"
      ? data.trade_status
      : typeof data.tradeStatus === "string"
        ? data.tradeStatus
        : null;
  const tradeNo =
    typeof data.trade_no === "string"
      ? data.trade_no
      : typeof data.tradeNo === "string"
        ? data.tradeNo
        : null;
  return { tradeStatus, tradeNo };
}

/**
 * 验证支付宝异步通知签名。
 */
export function verifyAlipayNotify(params: { cfg: AlipayConfig; body: Record<string, string> }): boolean {
  const sdk = createSdk(params.cfg);
  return sdk.checkNotifySign(params.body);
}


