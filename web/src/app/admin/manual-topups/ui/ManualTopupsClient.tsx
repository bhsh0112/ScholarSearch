"use client";

import React, { useEffect, useState } from "react";

type Item = {
  id: string;
  status: string;
  provider: string;
  planId: string;
  period: string;
  amountCny: number;
  referenceCode: string;
  note: string | null;
  userConfirmedAt: string | null;
  createdAt: string;
  user: { id: string; email: string };
};

/**
 * 管理员审核列表（客户端）。
 */
export function ManualTopupsClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type ListResponse =
    | { ok: true; items: Item[] }
    | { error: string };

  type ApproveResponse =
    | { ok: true }
    | { error: string };

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/manual-topups");
      const json = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok || !("ok" in json) || !json.ok) throw new Error("error" in json ? json.error : "load_failed");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }

  async function approve(topupId: string) {
    setError(null);
    try {
      const res = await fetch("/api/admin/manual-topups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topupId }),
      });
      const json = (await res.json().catch(() => ({}))) as ApproveResponse;
      if (!res.ok || !("ok" in json) || !json.ok) throw new Error("error" in json ? json.error : "approve_failed");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "approve_failed");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">待处理记录</div>
        <button
          onClick={() => void refresh()}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-white/5"
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="py-2 pr-4">用户</th>
              <th className="py-2 pr-4">方案</th>
              <th className="py-2 pr-4">金额</th>
              <th className="py-2 pr-4">参考码</th>
              <th className="py-2 pr-4">状态</th>
              <th className="py-2 pr-4">备注</th>
              <th className="py-2 pr-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="text-zinc-800 dark:text-zinc-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  暂无待处理记录
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className="border-t border-zinc-100 dark:border-white/10">
                  <td className="py-3 pr-4">{it.user.email}</td>
                  <td className="py-3 pr-4">
                    {it.planId} / {it.period}
                  </td>
                  <td className="py-3 pr-4">¥{it.amountCny}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{it.referenceCode}</td>
                  <td className="py-3 pr-4">{it.status}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-600 dark:text-zinc-300">{it.note || "-"}</td>
                  <td className="py-3 pr-2 text-right">
                    <button
                      onClick={() => void approve(it.id)}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                    >
                      通过并开通
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


