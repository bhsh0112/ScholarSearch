import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { getActivePlanForUser, upsertSubscription } from "@/lib/subscription";
import { requireUser } from "@/lib/auth";
import { getAlipayConfig, alipayQueryTrade } from "@/lib/pay/alipay";
import { getWechatPayConfig, wechatQueryOrderByOutTradeNo } from "@/lib/pay/wechat";
import { normalizePlanId } from "@/lib/plans";

const QuerySchema = z.object({
  orderId: z.string().min(1),
});

/**
 * 轮询节流：两次主动查询支付网关之间的最小间隔（毫秒）。
 *
 * 前端默认 2.5s 轮询一次，如果每次都打支付网关会非常浪费且容易触发风控。
 */
const PROVIDER_QUERY_MIN_INTERVAL_MS = 10_000;

/**
 * 查询订单状态（前端轮询用）。
 *
 * - GET /api/pay/status?orderId=...
 */
export async function GET(req: Request) {
  let me: { id: string; email: string };
  try {
    me = await requireUser(req);
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : 500;
    return NextResponse.json({ error: status === 401 ? "unauthorized" : "server_error" }, { status });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const order = await prisma.paymentOrder.findFirst({
    where: { id: parsed.data.orderId, userId: me.id },
    select: {
      id: true,
      status: true,
      planId: true,
      period: true,
      amountCny: true,
      paidAt: true,
      provider: true,
      outTradeNo: true,
      providerTradeNo: true,
      lastQueriedAt: true,
    },
  });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  // 无公网回调/测试机联调：若订单还在 PENDING，则由服务端主动查询支付平台一次并对账入库。
  if (order.status === "PENDING") {
    const now = new Date();
    const last = order.lastQueriedAt;
    const shouldQuery = !last || now.getTime() - last.getTime() > PROVIDER_QUERY_MIN_INTERVAL_MS;

    if (shouldQuery) {
      try {
        if (order.provider === "ALIPAY") {
          const cfg = getAlipayConfig();
          if (cfg) {
            const q = await alipayQueryTrade({ cfg, outTradeNo: order.outTradeNo });
            await prisma.paymentOrder.update({
              where: { id: order.id },
              data: { lastQueriedAt: now, providerTradeNo: q.tradeNo ?? order.providerTradeNo ?? null },
            });

            // 常见状态：TRADE_SUCCESS / TRADE_FINISHED / WAIT_BUYER_PAY / TRADE_CLOSED
            if (q.tradeStatus === "TRADE_SUCCESS" || q.tradeStatus === "TRADE_FINISHED") {
              const updated = await prisma.paymentOrder.updateMany({
                where: { id: order.id, status: { not: "PAID" } },
                data: { status: "PAID", paidAt: now, providerTradeNo: q.tradeNo ?? order.providerTradeNo ?? null },
              });
              if (updated.count === 1) {
                await upsertSubscription({
                  userId: me.id,
                  planId: normalizePlanId(order.planId),
                  period: order.period,
                });
              }
            } else if (q.tradeStatus === "TRADE_CLOSED") {
              await prisma.paymentOrder.update({
                where: { id: order.id },
                data: { status: "CANCELED" },
              });
            }
          }
        } else if (order.provider === "WECHAT") {
          const cfg = getWechatPayConfig();
          if (cfg) {
            const q = await wechatQueryOrderByOutTradeNo({ cfg, outTradeNo: order.outTradeNo });
            await prisma.paymentOrder.update({
              where: { id: order.id },
              data: { lastQueriedAt: now, providerTradeNo: q.transactionId ?? order.providerTradeNo ?? null },
            });

            // 常见状态：SUCCESS / NOTPAY / CLOSED / REVOKED / PAYERROR
            if (q.tradeState === "SUCCESS") {
              const updated = await prisma.paymentOrder.updateMany({
                where: { id: order.id, status: { not: "PAID" } },
                data: { status: "PAID", paidAt: now, providerTradeNo: q.transactionId ?? order.providerTradeNo ?? null },
              });
              if (updated.count === 1) {
                await upsertSubscription({
                  userId: me.id,
                  planId: normalizePlanId(order.planId),
                  period: order.period,
                });
              }
            } else if (q.tradeState === "CLOSED" || q.tradeState === "REVOKED") {
              await prisma.paymentOrder.update({
                where: { id: order.id },
                data: { status: "CANCELED" },
              });
            } else if (q.tradeState === "PAYERROR") {
              await prisma.paymentOrder.update({
                where: { id: order.id },
                data: { status: "FAILED" },
              });
            }
          }
        }
      } catch {
        // 对账失败不影响接口返回：前端继续轮询即可（也避免把网关错误暴露给用户端）
        await prisma.paymentOrder.update({ where: { id: order.id }, data: { lastQueriedAt: now } }).catch(() => null);
      }
    }
  }

  // 对账后重新读取一次最新状态（避免前端要等下一轮轮询）
  const latest = await prisma.paymentOrder.findFirst({
    where: { id: parsed.data.orderId, userId: me.id },
    select: { id: true, status: true, planId: true, period: true, amountCny: true, paidAt: true },
  });
  if (!latest) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  const planId = (await getActivePlanForUser(me.id)) ?? "FREE";
  return NextResponse.json({ ok: true, order: latest, currentPlan: PLANS[planId] });
}


