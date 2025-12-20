import crypto from "crypto";

/**
 * 微信支付 V3 配置（Native 扫码支付 + 回调验签/解密）。
 */
export type WechatPayConfig = {
  mchId: string;
  appId: string;
  serialNo: string;
  privateKeyPem: string;
  apiV3Key: string;
  platformCertPem: string;
  platformSerial: string;
  notifyUrl: string;
};

/**
 * 从环境变量读取微信支付配置。
 */
export function getWechatPayConfig(): WechatPayConfig | null {
  const mchId = process.env.WECHATPAY_MCH_ID || "";
  const appId = process.env.WECHATPAY_APP_ID || "";
  const serialNo = process.env.WECHATPAY_SERIAL_NO || "";
  const privateKeyPem = process.env.WECHATPAY_PRIVATE_KEY_PEM || "";
  const apiV3Key = process.env.WECHATPAY_API_V3_KEY || "";
  const platformCertPem = process.env.WECHATPAY_PLATFORM_CERT_PEM || "";
  const platformSerial = process.env.WECHATPAY_PLATFORM_SERIAL || "";
  const notifyUrl = process.env.WECHATPAY_NOTIFY_URL || "";
  if (!mchId || !appId || !serialNo || !privateKeyPem || !apiV3Key || !platformCertPem || !platformSerial || !notifyUrl) {
    return null;
  }
  return { mchId, appId, serialNo, privateKeyPem, apiV3Key, platformCertPem, platformSerial, notifyUrl };
}

/**
 * 生成随机字符串。
 */
function nonceStr(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * 构造微信支付 V3 Authorization 头（WECHATPAY2-SHA256-RSA2048）。
 */
function buildAuthorization(params: {
  cfg: WechatPayConfig;
  method: "POST" | "GET";
  pathWithQuery: string;
  body: string;
}): { authorization: string; timestamp: string; nonce: string } {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = nonceStr();
  const message = `${params.method}\n${params.pathWithQuery}\n${timestamp}\n${nonce}\n${params.body}\n`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  const signature = signer.sign(params.cfg.privateKeyPem, "base64");
  const token =
    `mchid="${params.cfg.mchId}",` +
    `nonce_str="${nonce}",` +
    `timestamp="${timestamp}",` +
    `serial_no="${params.cfg.serialNo}",` +
    `signature="${signature}"`;
  return { authorization: `WECHATPAY2-SHA256-RSA2048 ${token}`, timestamp, nonce };
}

/**
 * 创建微信 Native 扫码订单，返回 code_url。
 */
export async function wechatCreateNativeOrder(params: {
  cfg: WechatPayConfig;
  outTradeNo: string;
  description: string;
  amountFen: number;
}): Promise<{ codeUrl: string }> {
  const path = "/v3/pay/transactions/native";
  const bodyObj = {
    appid: params.cfg.appId,
    mchid: params.cfg.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.cfg.notifyUrl,
    amount: { total: params.amountFen, currency: "CNY" },
  };
  const body = JSON.stringify(bodyObj);
  const { authorization } = buildAuthorization({ cfg: params.cfg, method: "POST", pathWithQuery: path, body });

  const res = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "ScholarSearch/1.0",
    },
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`wechat_native_failed: ${res.status} ${JSON.stringify(json)}`);
  }
  const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const codeUrl = typeof obj.code_url === "string" ? obj.code_url : null;
  if (!codeUrl) throw new Error(`wechat_native_no_code_url: ${JSON.stringify(json)}`);
  return { codeUrl };
}

/**
 * 主动查询微信支付订单状态（通过商户侧 out_trade_no）。
 *
 * 用于无公网回调的本地/测试机联调：前端轮询 `/api/pay/status` 时由服务端触发查询并对账入库。
 */
export async function wechatQueryOrderByOutTradeNo(params: {
  cfg: WechatPayConfig;
  outTradeNo: string;
}): Promise<{ tradeState: string | null; transactionId: string | null }> {
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(params.outTradeNo)}?mchid=${encodeURIComponent(
    params.cfg.mchId,
  )}`;
  const { authorization } = buildAuthorization({ cfg: params.cfg, method: "GET", pathWithQuery: path, body: "" });

  const res = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method: "GET",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "User-Agent": "ScholarSearch/1.0",
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`wechat_query_failed: ${res.status} ${JSON.stringify(json)}`);
  }

  const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const tradeState = typeof obj.trade_state === "string" ? obj.trade_state : null;
  const transactionId = typeof obj.transaction_id === "string" ? obj.transaction_id : null;
  return { tradeState, transactionId };
}

/**
 * 验证微信支付回调签名。
 */
export function verifyWechatNotify(params: {
  cfg: WechatPayConfig;
  headers: Headers;
  rawBody: string;
}): boolean {
  const signature = params.headers.get("Wechatpay-Signature") || "";
  const timestamp = params.headers.get("Wechatpay-Timestamp") || "";
  const nonce = params.headers.get("Wechatpay-Nonce") || "";
  const serial = params.headers.get("Wechatpay-Serial") || "";
  if (!signature || !timestamp || !nonce || !serial) return false;
  if (serial !== params.cfg.platformSerial) return false;

  const message = `${timestamp}\n${nonce}\n${params.rawBody}\n`;
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(message);
  verifier.end();
  return verifier.verify(params.cfg.platformCertPem, signature, "base64");
}

/**
 * 解密微信支付回调 resource（AES-256-GCM）。
 */
export function decryptWechatResource(params: {
  cfg: WechatPayConfig;
  resource: { ciphertext: string; associated_data?: string; nonce: string };
}): string {
  const key = Buffer.from(params.cfg.apiV3Key, "utf8");
  const nonce = Buffer.from(params.resource.nonce, "utf8");
  const aad = Buffer.from(params.resource.associated_data || "", "utf8");
  const buf = Buffer.from(params.resource.ciphertext, "base64");
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  const decoded = Buffer.concat([decipher.update(data), decipher.final()]);
  return decoded.toString("utf8");
}


