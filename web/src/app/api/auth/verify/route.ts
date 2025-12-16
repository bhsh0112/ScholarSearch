import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

const Schema = z.object({
  token: z.string().min(10).max(300),
});

/**
 * 邮箱验证：
 * - POST /api/auth/verify
 * body: { token }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const now = new Date();
  const rec = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash, expiresAt: { gt: now } },
    select: { id: true, userId: true },
  });
  if (!rec) return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: now } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: rec.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}


