"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * 邮箱验证页：
 * - 支持从链接带 token 自动验证
 * - 支持输入邮箱重新发送验证邮件
 */
export default function VerifyEmailPage() {
  const sp = useSearchParams();
  const [email, setEmail] = useState(sp.get("email") || "");
  const [token, setToken] = useState(sp.get("token") || "");
  const [status, setStatus] = useState<"idle" | "verifying" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  async function verify(t: string) {
    setStatus("verifying");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "verify_failed");
      setStatus("ok");
      setMessage("邮箱验证成功，可以去登录了。");
    } catch (e: unknown) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "verify_failed");
    }
  }

  async function resend() {
    setMessage(null);
    setDebugLink(null);
    const res = await fetch("/api/auth/request-verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json().catch(() => ({}));
    setMessage("如果该邮箱存在且未验证，我们已发送验证邮件。");
    if (json?.debugLink) setDebugLink(json.debugLink);
  }

  useEffect(() => {
    const t = sp.get("token");
    if (t) {
      setToken(t);
      void verify(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">邮箱验证</div>
        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          点击邮件中的验证链接，或在此粘贴 token 完成验证。
        </div>

        {message ? (
          <div
            className={`mt-4 rounded-xl p-3 text-sm ${
              status === "ok"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "bg-zinc-50 text-zinc-700 dark:bg-white/5 dark:text-zinc-200"
            }`}
          >
            {message}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <label className="block space-y-1">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">验证 token（可选）</div>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
              placeholder="从邮件链接里复制 token"
            />
          </label>
          <button
            onClick={() => token.trim() && verify(token.trim())}
            disabled={!token.trim() || status === "verifying"}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-60"
          >
            {status === "verifying" ? "验证中…" : "验证"}
          </button>
        </div>

        <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-white/10">
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">没收到邮件？</div>
          <div className="mt-2 space-y-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
              placeholder="输入注册邮箱"
            />
            <button
              onClick={resend}
              disabled={!email.trim()}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-white/5"
            >
              重新发送验证邮件
            </button>
            {debugLink ? (
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                开发环境调试链接：{" "}
                <a className="font-semibold underline" href={debugLink}>
                  点击验证
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
          已验证？{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}


