import crypto from "crypto";

/**
 * 生成随机 token（用于邮箱验证/重置密码）。
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * token 哈希（SHA256），用于落库，避免数据库泄露后 token 可直接复用。
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 邮箱验证 token 过期时间（默认 24 小时，可用 EMAIL_VERIFY_TTL_HOURS 覆盖）。
 */
export function emailVerifyExpiresAt(): Date {
  const hours = Number(process.env.EMAIL_VERIFY_TTL_HOURS || "24");
  const ttl = Number.isFinite(hours) ? Math.max(1, Math.min(168, Math.floor(hours))) : 24;
  const d = new Date();
  d.setHours(d.getHours() + ttl);
  return d;
}

/**
 * 重置密码 token 过期时间（默认 30 分钟，可用 PASSWORD_RESET_TTL_MINUTES 覆盖）。
 */
export function passwordResetExpiresAt(): Date {
  const mins = Number(process.env.PASSWORD_RESET_TTL_MINUTES || "30");
  const ttl = Number.isFinite(mins) ? Math.max(5, Math.min(180, Math.floor(mins))) : 30;
  const d = new Date();
  d.setMinutes(d.getMinutes() + ttl);
  return d;
}


