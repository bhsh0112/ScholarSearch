import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "ss_session";

/**
 * 解析 Cookie header。
 */
function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(v);
  }
  return out;
}

/**
 * 获取 Request 中的某个 cookie 值。
 */
export function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  const parsed = parseCookieHeader(raw);
  return parsed[name] ?? null;
}

/**
 * 生成随机 session token（写入 cookie，数据库只存 hash）。
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 对 session token 做 SHA256（避免数据库泄露时 token 可直接复用）。
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 对密码做 bcrypt 哈希。
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

/**
 * 校验密码（bcrypt）。
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return await bcrypt.compare(password, passwordHash);
}

/**
 * 计算 session 过期时间（默认 30 天，可用 SESSION_TTL_DAYS 覆盖）。
 */
export function sessionExpiresAt(): Date {
  const days = Number(process.env.SESSION_TTL_DAYS || "30");
  const ttlDays = Number.isFinite(days) ? Math.max(1, Math.min(365, Math.floor(days))) : 30;
  const d = new Date();
  d.setDate(d.getDate() + ttlDays);
  return d;
}

/**
 * 创建 session，并返回 raw token（用于写入 cookie）。
 */
export async function createSessionForUser(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = sessionExpiresAt();
  await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
  return { token, expiresAt };
}

/**
 * 删除 session（按 raw token）。
 */
export async function deleteSessionByToken(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

/**
 * 获取当前登录用户（若未登录返回 null）。
 */
export async function getCurrentUser(req: Request): Promise<{ id: string; email: string } | null> {
  const token = getCookie(req, SESSION_COOKIE_NAME);
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const session = await prisma.session.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    select: { user: { select: { id: true, email: true } } },
  });
  return session?.user ?? null;
}

/**
 * 要求必须登录；否则抛出 401。
 */
export async function requireUser(req: Request): Promise<{ id: string; email: string }> {
  const u = await getCurrentUser(req);
  if (!u) {
    const err = new Error("unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return u;
}


