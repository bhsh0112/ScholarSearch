import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * 站内通知：
 * - GET /api/notifications?limit=20
 *
 * V1：单用户模式（APP_USER_EMAIL）
 */
export async function GET(req: Request) {
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });

  const url = new URL(req.url);
  const parsed = ListSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  const limit = parsed.success ? parsed.data.limit : 20;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      createdAt: true,
      readAt: true,
    },
  });

  return NextResponse.json({ notifications });
}


