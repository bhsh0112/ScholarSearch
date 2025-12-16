import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/verifyEmail";

const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  projectName: z.string().min(1).max(80).optional(),
});

/**
 * 注册：
 * - POST /api/auth/register
 * body: { email, password, projectName? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { email, passwordHash, emailVerifiedAt: null },
    select: { id: true, email: true, emailVerifiedAt: true },
  });

  // 默认创建一个 project，方便立即使用
  await prisma.project.create({
    data: { userId: user.id, name: parsed.data.projectName || "My Research" },
  });

  const r = await sendVerificationEmail({ userId: user.id, email: user.email });
  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, emailVerifiedAt: user.emailVerifiedAt },
    sent: r.sent,
    debugLink: r.debugLink ?? null,
  });
}


