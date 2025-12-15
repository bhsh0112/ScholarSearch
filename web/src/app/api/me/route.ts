import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * V1：单用户模式（通过 APP_USER_EMAIL 获取当前用户与默认项目）。
 */
export async function GET() {
  const email = process.env.APP_USER_EMAIL || "you@example.com";
  const user = await prisma.user.findUnique({
    where: { email },
    include: { projects: true },
  });

  if (!user) {
    return NextResponse.json({ error: "user_not_seeded" }, { status: 500 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    projects: user.projects.map((p) => ({ id: p.id, name: p.name })),
  });
}


