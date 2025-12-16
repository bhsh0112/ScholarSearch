import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { passwordResetExpiresAt, generateToken, hashToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";

const Schema = z.object({
  email: z.string().email().max(200),
});

/**
 * 忘记密码：发送重置链接（公开接口，防邮箱枚举）。
 * - POST /api/auth/forgot-password
 * body: { email }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ ok: true });

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = passwordResetExpiresAt();
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const base = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "ScholarSearch 重置密码";
  const text = `请点击链接重置密码（有效期有限）：\n${link}\n\n若不是你本人操作，请忽略。`;

  const sent = await sendEmail({ to: user.email, subject, text });
  const debugLink = !sent && process.env.NODE_ENV !== "production" ? link : null;
  return NextResponse.json({ ok: true, sent, debugLink });
}


