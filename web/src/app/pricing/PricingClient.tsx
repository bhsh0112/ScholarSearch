"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PlanDefinition } from "@/lib/plans";
import Image from "next/image";

type PlanId = "FREE" | "PRO" | "MAX";
type BillingPeriod = "MONTHLY" | "YEARLY";
type Provider = "WECHAT" | "ALIPAY";

type CreateOrderResult =
  | { ok: true; orderId: string; provider: Provider; qrDataUrl: string; qrCodeUrl: string }
  | { error: string; message?: string };

export function PricingClient(props: { initialPlan: PlanDefinition; plans: PlanDefinition[] }) {
  const [currentPlan, setCurrentPlan] = useState<PlanDefinition>(props.initialPlan);
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [provider, setProvider] = useState<Provider>("WECHAT");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const priceLabel = useMemo(() => (period === "MONTHLY" ? "月付" : "年付"), [period]);

  async function refreshPlan() {
    const res = await fetch("/api/plan");
    const json = await res.json();
    if (json?.plan) setCurrentPlan(json.plan);
  }

  useEffect(() => {
    (async () => {
      await refreshPlan();
    })();
  }, [/* only run once on mount */]);

  async function startPay(planId: PlanId) {
    setPayError(null);
    setPaying(true);
    setOrderId(null);
    setQr(null);
    try {
      const res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, planId, period }),
      });
      const json = (await res.json().catch(() => ({}))) as CreateOrderResult;
      if (!res.ok || !("ok" in json)) {
        const err = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
        const message = typeof err.message === "string" ? err.message : typeof err.error === "string" ? err.error : "create_failed";
        throw new Error(message);
      }
      setOrderId(json.orderId);
      setQr(json.qrDataUrl);
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : "pay_failed");
      setPaying(false);
    }
  }

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped) return;
      const res = await fetch(`/api/pay/status?orderId=${encodeURIComponent(orderId)}`);
      const json = await res.json().catch(() => ({}));
      if (json?.order?.status === "PAID") {
        stopped = true;
        clearInterval(timer);
        setPaying(false);
        await refreshPlan();
      }
    }, 2500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            当前计划：
            <span className="ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              {currentPlan.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200"
            >
              <option value="WECHAT">微信支付（扫码）</option>
              <option value="ALIPAY">支付宝（扫码）</option>
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as BillingPeriod)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200"
            >
              <option value="MONTHLY">月付</option>
              <option value="YEARLY">年付</option>
            </select>
          </div>
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
          选择支付方式与{priceLabel}后，点击方案卡片内的“立即开通”生成二维码。支付成功会自动生效。
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {props.plans.map((p) => {
          const isCurrent = p.id === currentPlan.id;
          const amount = period === "MONTHLY" ? p.pricing.monthlyCny : p.pricing.yearlyCny;
          const canBuy = p.id === "PRO" || p.id === "MAX";
          return (
            <div
              key={p.id}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm ${
                p.id === "PRO"
                  ? "border-blue-200 bg-gradient-to-b from-blue-50/60 to-white dark:border-blue-500/30 dark:from-blue-500/10 dark:to-zinc-950"
                  : "border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950"
              }`}
            >
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{p.name}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{p.tagline}</div>

              <div className="mt-5 flex items-end gap-2">
                <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">¥{amount}</div>
                <div className="pb-1 text-xs text-zinc-500 dark:text-zinc-400">{period === "MONTHLY" ? "/月" : "/年"}</div>
              </div>

              <div className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
                <div className="rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-100">配额</div>
                  <div className="mt-1">
                    主题数：{p.limits.maxTopics}；TopN：{p.limits.maxPushTopN}；AI：{p.limits.aiEnabled ? "可用" : "不可用"}；
                    邮件：{p.limits.emailEnabled ? "可用" : "不可用"}
                  </div>
                </div>

                <ul className="space-y-2">
                  {p.highlights.map((h, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-xl bg-zinc-100 px-4 py-2 text-center text-sm font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                    当前方案
                  </div>
                ) : canBuy ? (
                  <button
                    onClick={() => startPay(p.id)}
                    disabled={paying}
                    className="block w-full rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-60"
                  >
                    {paying ? "生成中…" : "立即开通（扫码支付）"}
                  </button>
                ) : (
                  <div className="rounded-xl bg-zinc-100 px-4 py-2 text-center text-sm font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                    体验方案
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(qr || payError) && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">扫码支付</div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            支付完成后会自动生效（页面会轮询状态）。如果长时间不生效，请刷新后查看当前计划。
          </div>
          {payError ? (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {payError}
            </div>
          ) : null}
          {qr ? (
            <div className="mt-5 flex flex-col items-center gap-3">
              <Image
                src={qr}
                alt="支付二维码"
                width={224}
                height={224}
                className="h-56 w-56 rounded-xl border border-zinc-200 bg-white p-2 dark:border-white/10"
              />
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                订单：{orderId || "-"}（{provider}）
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}


