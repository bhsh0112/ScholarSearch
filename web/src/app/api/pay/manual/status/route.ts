import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const QuerySchema = z.object({
  topupId: z.string().min(1),
});

/**
 * 查询人工充值状态（前端轮询用）。
 *
 * - GET /api/pay/manual/status?topupId=...
 */
export async function GET(req: Request) {
  const me = await requireUser(req);
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const topup = await prisma.manualTopup.findFirst({
    where: { id: parsed.data.topupId, userId: me.id },
    select: { id: true, status: true, referenceCode: true, amountCny: true, planId: true, period: true },
  });
  if (!topup) return NextResponse.json({ error: "topup_not_found" }, { status: 404 });

  return NextResponse.json({ ok: true, topup });
}


