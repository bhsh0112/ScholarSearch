import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Dev 刷新诊断探针（proxy 版）：
 *
 * Next 的提示 “middleware file convention is deprecated, use proxy instead”
 * 表示在当前 Next/webpack dev pipeline 下，推荐用 `src/proxy.ts` 代替 `src/middleware.ts` 来做请求层面的拦截/诊断。
 *
 * 这里做两件事：
 * - 给响应加 `x-ss-proxy: 1`，方便确认 probe 生效
 * - 对 `/`、`/api/me`、`/_next/*` 打印一次性日志，帮助定位跨域/HMR 导致的自动刷新
 */
const seen = new Set<string>();

export default function proxy(req: NextRequest) {
  const res = NextResponse.next();

  if (process.env.NODE_ENV === "development") {
    res.headers.set("x-ss-proxy", "1");

    const path = req.nextUrl.pathname;
    const prefix = path.startsWith("/_next/") ? "/_next/*" : path;
    if (prefix === "/" || prefix === "/api/me" || prefix === "/_next/*") {
      const origin = req.headers.get("origin") || "";
      const host = req.headers.get("host") || "";
      const referer = req.headers.get("referer") || "";
      const accept = req.headers.get("accept") || "";
      const rsc = req.headers.get("rsc") || "";
      const key = `${prefix}|origin=${origin}|host=${host}`;
      if (!seen.has(key)) {
        seen.add(key);
        // eslint-disable-next-line no-console
        console.log(
          `[dev-probe] path=${prefix} origin=${origin || "-"} host=${host || "-"} rsc=${rsc || "-"} accept=${accept.slice(0, 40) || "-"} referer=${referer || "-"}`,
        );
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/", "/api/me", "/_next/:path*"],
};


