"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * 注册页（最小账号系统）。
 */
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [projectName, setProjectName] = useState("My Research");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, projectName }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "register_failed");
      // 注册后需先完成邮箱验证
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "register_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">注册</div>
        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">创建账号后会自动创建一个默认项目。</div>
        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          注册后需要完成邮箱验证才能登录（未配置 SMTP 的开发环境会返回调试链接）。
        </div>

        {error ? (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <label className="block space-y-1">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">邮箱</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
              placeholder="you@example.com"
            />
          </label>
          <label className="block space-y-1">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">密码</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
              placeholder="至少 8 位"
            />
          </label>
          <label className="block space-y-1">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">默认项目名</div>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
            />
          </label>
        </div>

        <button
          onClick={onSubmit}
          disabled={loading || !email.trim() || password.trim().length < 8}
          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "创建中…" : "创建账号"}
        </button>

        <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          已有账号？{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            去登录
          </Link>
        </div>
      </div>
    </div>
  );
}


