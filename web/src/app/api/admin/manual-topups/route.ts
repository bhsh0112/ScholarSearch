import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { upsertSubscription } from "@/lib/subscription";
import { normalizePlanId } from "@/lib/plans";

const ApproveSchema = z.object({
  topupId: z.string().min(1),
});

/**
 * 管理员：人工充值审核（列表 + 审核通过）。
 *
 * - GET /api/admin/manual-topups
 * - POST /api/admin/manual-topups  { topupId }  -> approve
 */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const items = await prisma.manualTopup.findMany({
      where: { status: { in: ["CREATED", "USER_CONFIRMED"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        provider: true,
        planId: true,
        period: true,
        amountCny: true,
        referenceCode: true,
        note: true,
        userConfirmedAt: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
      },
      take: 100,
    });
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: status === 403 ? "forbidden" : "server_error" }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const parsed = ApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", detail: parsed.error.flatten() }, { status: 400 });
    }

    const topup = await prisma.manualTopup.findUnique({
      where: { id: parsed.data.topupId },
      select: { id: true, status: true, userId: true, planId: true, period: true },
    });
    if (!topup) return NextResponse.json({ error: "topup_not_found" }, { status: 404 });

    // 幂等：已批准不重复续费
    if (topup.status === "APPROVED") return NextResponse.json({ ok: true });
    if (topup.status === "REJECTED" || topup.status === "CANCELED") {
      return NextResponse.json({ error: "topup_not_approvable" }, { status: 409 });
    }

    const updated = await prisma.manualTopup.updateMany({
      where: { id: topup.id, status: { not: "APPROVED" } },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    if (updated.count !== 1) return NextResponse.json({ ok: true });

    await upsertSubscription({
      userId: topup.userId,
      planId: normalizePlanId(topup.planId),
      period: topup.period,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: status === 403 ? "forbidden" : "server_error" }, { status });
  }
}


