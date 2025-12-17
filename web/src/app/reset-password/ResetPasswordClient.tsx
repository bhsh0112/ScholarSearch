"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

/**
 * 重置密码页（Client Component）：从邮件链接带 token。
 *
 * 注意：该组件使用 useSearchParams，必须由外层 Page 用 <Suspense> 包裹（Next 要求）。
 */
export function ResetPasswordClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(sp.get("token") || "");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = sp.get("token");
    if (t) setToken(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "reset_failed");
      setMessage("密码已重置，请用新密码登录。");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 800);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "reset_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">重置密码</div>
        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">输入新密码完成重置。</div>

        {message ? (
          <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
            {message}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <label className="block space-y-1">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">token</div>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
              placeholder="从邮件链接里自动带入"
            />
          </label>
          <label className="block space-y-1">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">新密码</div>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
              placeholder="至少 8 位"
            />
          </label>
          <button
            onClick={submit}
            disabled={loading || !token.trim() || pw.trim().length < 8}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "提交中…" : "重置密码"}
          </button>
        </div>

        <div className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
          返回{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}


