import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/**
 * 当前用户与项目列表：
 * - GET /api/me
 * - 需要已登录（cookie session）
 */
export async function GET(req: Request) {
  try {
    const me = await requireUser(req);
    const user = await prisma.user.findUnique({
      where: { id: me.id },
      include: { projects: true },
    });
    if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      projects: user.projects.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: status === 401 ? "unauthorized" : "server_error" }, { status });
  }
}


