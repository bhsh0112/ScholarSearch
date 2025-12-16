import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * 标记通知已读：
 * - POST /api/notifications/:id/read
 *
 * V1：单用户模式（APP_USER_EMAIL）
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const me = await requireUser(_req);

  const n = await prisma.notification.findFirst({
    where: { id, userId: me.id },
  });
  if (!n) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });

  return NextResponse.json({ notification: updated });
}


