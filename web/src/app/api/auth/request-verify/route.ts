import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/verifyEmail";

const Schema = z.object({
  email: z.string().email().max(200),
});

/**
 * 请求发送邮箱验证邮件（公开接口）。
 * - POST /api/auth/request-verify
 * body: { email }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true } });

  // 防枚举：无论是否存在都返回 ok=true
  if (!user) return NextResponse.json({ ok: true });
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, alreadyVerified: true });

  const r = await sendVerificationEmail({ userId: user.id, email: user.email });
  return NextResponse.json({ ok: true, sent: r.sent, debugLink: r.debugLink ?? null });
}


