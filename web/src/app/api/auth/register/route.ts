import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/verifyEmail";
import { Prisma } from "@prisma/client";

const RegisterSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
  projectName: z.string().min(1).max(80).optional(),
});

/**
 * 判断是否为“数据库尚未初始化/表不存在”的 Prisma 错误。
 * 典型表现：SQLite 初次启动未执行 migrate，导致出现 P2021（table does not exist）。
 */
function isDbNotInitializedError(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2021";
}

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

  try {
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
  } catch (err) {
    // 数据库没初始化（首次启动未迁移）时，给前端一个明确错误码，方便提示用户执行迁移
    if (isDbNotInitializedError(err)) {
      return NextResponse.json(
        {
          error: "db_not_initialized",
          hint: "请先在 web/ 下执行：npm run db:migrate（或直接 npm run dev 会自动 migrate deploy）",
        },
        { status: 503 },
      );
    }

    console.error("register_failed", err);
    return NextResponse.json({ error: "register_failed" }, { status: 500 });
  }
}


