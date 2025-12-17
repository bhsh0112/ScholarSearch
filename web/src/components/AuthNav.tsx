"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type MeResponse =
  | { user: { id: string; email: string } }
  | { error: string };

/**
 * 顶部导航的登录状态（客户端拉取 /api/me）。
 *
 * 说明：
 * - RootLayout 是 server component，为了不把 prisma/动态渲染引入到 layout，这里用客户端拉取。
 * - 登录/退出后仅靠 `router.refresh()` 不一定会让该组件重新执行 `useEffect`，
 *   因此这里在路由变更时也触发一次 refresh，避免“已登录但导航仍显示登录/注册”。
 */
export function AuthNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/me");
      const json = (await res.json().catch(() => ({}))) as MeResponse;
      if (res.ok && "user" in json) setEmail(json.user.email);
      else setEmail(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await refresh();
  }

  useEffect(() => {
    void refresh();
  }, [pathname]);

  if (loading) {
    return <div className="text-xs text-zinc-400">…</div>;
  }

  if (!email) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-xl px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden max-w-[220px] truncate text-xs font-semibold text-zinc-600 dark:text-zinc-300 sm:block">
        {email}
      </div>
      <button
        onClick={logout}
        className="rounded-xl px-3 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10"
      >
        退出
      </button>
    </div>
  );
}


