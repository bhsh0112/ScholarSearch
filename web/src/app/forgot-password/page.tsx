"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * 忘记密码页：发送重置链接到邮箱。
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage(null);
    setDebugLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      setMessage("如果该邮箱存在，我们已发送重置密码邮件。");
      if (json?.debugLink) setDebugLink(json.debugLink);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">找回密码</div>
        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">输入你的邮箱，我们会发送重置链接。</div>

        {message ? (
          <div className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
            {message}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
            placeholder="you@example.com"
          />
          <button
            onClick={submit}
            disabled={loading || !email.trim()}
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "发送中…" : "发送重置邮件"}
          </button>
        </div>

        {debugLink ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            开发环境调试链接：{" "}
            <a className="font-semibold underline" href={debugLink}>
              点击重置
            </a>
          </div>
        ) : null}

        <div className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
          想起密码了？{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}


