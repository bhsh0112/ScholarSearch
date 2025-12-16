import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/auth";

const Schema = z.object({
  token: z.string().min(10).max(300),
  newPassword: z.string().min(8).max(200),
});

/**
 * 重置密码（使用 token）。
 * - POST /api/auth/reset-password
 * body: { token, newPassword }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const now = new Date();
  const rec = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    select: { id: true, userId: true },
  });
  if (!rec) return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });

  const newHash = await hashPassword(parsed.data.newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: newHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: rec.userId } }),
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}


