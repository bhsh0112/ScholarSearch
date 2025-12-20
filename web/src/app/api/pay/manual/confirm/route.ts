import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const ConfirmSchema = z.object({
  topupId: z.string().min(1),
  note: z.string().max(500).optional(),
});

/**
 * 用户提交“我已付款”确认（等待管理员审核）。
 *
 * - POST /api/pay/manual/confirm
 */
export async function POST(req: Request) {
  const me = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const topup = await prisma.manualTopup.findFirst({
    where: { id: parsed.data.topupId, userId: me.id },
    select: { id: true, status: true },
  });
  if (!topup) return NextResponse.json({ error: "topup_not_found" }, { status: 404 });

  // 幂等：已确认/已审核的记录不重复写
  if (topup.status === "USER_CONFIRMED" || topup.status === "APPROVED" || topup.status === "REJECTED") {
    return NextResponse.json({ ok: true });
  }

  await prisma.manualTopup.update({
    where: { id: topup.id },
    data: {
      status: "USER_CONFIRMED",
      userConfirmedAt: new Date(),
      note: parsed.data.note ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}


