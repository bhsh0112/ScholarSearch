"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PlanDefinition } from "@/lib/plans";
import Image from "next/image";

type PlanId = "FREE" | "PRO" | "MAX";
type BillingPeriod = "MONTHLY" | "YEARLY";
type Provider = "WECHAT" | "ALIPAY" | "MANUAL";
type ManualChannel = "ALIPAY" | "WECHAT";

type CreateOrderResult =
  | { ok: true; orderId: string; provider: Provider; qrDataUrl: string; qrCodeUrl: string }
  | { error: string; message?: string };

type ManualPayConfigResult =
  | { ok: true; enabled: boolean; qrUrls: { ALIPAY: string; WECHAT: string }; instructions: string }
  | { error: string };

type CreateManualTopupResult =
  | {
      ok: true;
      topupId: string;
      qrUrl: string;
      instructions: string;
      referenceCode: string;
      amountCny: number;
      planId: PlanId;
      period: BillingPeriod;
      channel: ManualChannel;
    }
  | { error: string; message?: string };

export function PricingClient(props: { initialPlan: PlanDefinition; plans: PlanDefinition[] }) {
  const [currentPlan, setCurrentPlan] = useState<PlanDefinition>(props.initialPlan);
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [provider, setProvider] = useState<Provider>("WECHAT");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [manualEnabled, setManualEnabled] = useState(false);
  const [manualInstructions, setManualInstructions] = useState<string | null>(null);
  const [manualQrUrls, setManualQrUrls] = useState<{ ALIPAY: string; WECHAT: string } | null>(null);
  const [manualChannel, setManualChannel] = useState<ManualChannel>("ALIPAY");
  const [manualTopupId, setManualTopupId] = useState<string | null>(null);
  const [manualReference, setManualReference] = useState<string | null>(null);
  const [manualNote, setManualNote] = useState<string>("");

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

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/pay/manual/config");
      const json = (await res.json().catch(() => ({}))) as ManualPayConfigResult;
      if ("ok" in json && json.ok) {
        setManualEnabled(Boolean(json.enabled));
        setManualInstructions(json.instructions || null);
        setManualQrUrls(json.qrUrls || null);
        // 默认选择“已配置的渠道”：优先微信，其次支付宝
        const hasWechat = Boolean(json.qrUrls?.WECHAT);
        const hasAlipay = Boolean(json.qrUrls?.ALIPAY);
        setManualChannel(hasWechat ? "WECHAT" : hasAlipay ? "ALIPAY" : "ALIPAY");
      }
    })();
  }, []);

  async function startPay(planId: PlanId) {
    setPayError(null);
    setPaying(true);
    setOrderId(null);
    setQr(null);
    setManualTopupId(null);
    setManualReference(null);
    try {
      if (provider === "MANUAL") {
        const res = await fetch("/api/pay/manual/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ planId, period, channel: manualChannel }),
        });
        const json = (await res.json().catch(() => ({}))) as CreateManualTopupResult;
        if (!res.ok || !("ok" in json)) {
          const err = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
          const message = typeof err.message === "string" ? err.message : typeof err.error === "string" ? err.error : "create_failed";
          throw new Error(message);
        }
        setManualTopupId(json.topupId);
        setManualReference(json.referenceCode);
        setQr(json.qrUrl);
        setPaying(false);
        return;
      }

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

  useEffect(() => {
    if (!manualTopupId) return;
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped) return;
      const res = await fetch(`/api/pay/manual/status?topupId=${encodeURIComponent(manualTopupId)}`);
      const json = await res.json().catch(() => ({}));
      if (json?.topup?.status === "APPROVED") {
        stopped = true;
        clearInterval(timer);
        await refreshPlan();
      }
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [manualTopupId]);

  async function confirmManualPaid() {
    if (!manualTopupId) return;
    setPayError(null);
    try {
      const res = await fetch("/api/pay/manual/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topupId: manualTopupId, note: manualNote || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "confirm_failed");
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : "confirm_failed");
    }
  }

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
              {manualEnabled ? <option value="MANUAL">收款码（人工开通）</option> : null}
            </select>
            {provider === "MANUAL" ? (
              <select
                value={manualChannel}
                onChange={(e) => setManualChannel(e.target.value as ManualChannel)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200"
              >
                {manualQrUrls?.WECHAT ? <option value="WECHAT">微信收款码</option> : null}
                {manualQrUrls?.ALIPAY ? <option value="ALIPAY">支付宝收款码</option> : null}
              </select>
            ) : null}
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
          选择支付方式与{priceLabel}后，点击方案卡片内的“立即开通”生成二维码。
          {provider === "MANUAL" ? "人工收款码需管理员审核后生效。" : "支付成功会自动生效。"}
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
            {provider === "MANUAL"
              ? manualInstructions || "请扫码付款并填写参考码，付款后点击“我已付款”提交确认，管理员审核后开通。"
              : "支付完成后会自动生效（页面会轮询状态）。如果长时间不生效，请刷新后查看当前计划。"}
          </div>
          {payError ? (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {payError}
            </div>
          ) : null}
          {qr ? (
            <div className="mt-5 flex flex-col items-center gap-3">
              {qr.startsWith("data:") ? (
                <Image
                  src={qr}
                  alt="支付二维码"
                  width={224}
                  height={224}
                  className="h-56 w-56 rounded-xl border border-zinc-200 bg-white p-2 dark:border-white/10"
                />
              ) : (
                // 外链二维码：避免 next/image 域名白名单限制
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt="支付二维码"
                  className="h-56 w-56 rounded-xl border border-zinc-200 bg-white p-2 dark:border-white/10"
                />
              )}
              {provider === "MANUAL" ? (
                <div className="w-full max-w-md space-y-3">
                  <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
                    <div className="font-semibold">参考码（建议填在转账备注/留言）</div>
                    <div className="mt-1 font-mono">{manualReference || "-"}</div>
                  </div>
                  <input
                    value={manualNote}
                    onChange={(e) => setManualNote(e.target.value)}
                    placeholder="可选：填写你的付款备注/金额/时间（便于管理员对账）"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                  <button
                    onClick={() => void confirmManualPaid()}
                    className="block w-full rounded-xl bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    我已付款（提交确认）
                  </button>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    管理员审核入口：/admin/manual-topups
                  </div>
                </div>
              ) : null}
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {provider === "MANUAL" ? `充值单：${manualTopupId || "-"}` : `订单：${orderId || "-"}`}（{provider}）
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}


