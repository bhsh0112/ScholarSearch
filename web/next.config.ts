import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
  console.log("[next.config] allowedDevOrigins:", [
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1:3000",
    "http://127.0.0.1",
    "http://172.17.50.21:3000",
    "http://172.17.50.21",
    "http://192.168.31.17:3000",
    "http://192.168.31.17",
    "https://172.17.50.21:3000",
    "https://172.17.50.21",
    "https://192.168.31.17:3000",
    "https://192.168.31.17",
  ]);
}

/**
 * 追加 Webpack watch ignored 规则：
 * - Next dev（webpack）会监听项目文件变化，某些二进制/数据库文件频繁写入会触发 Fast Refresh，
 *   导致页面“隔一段时间刷新”、用户输入/页面状态丢失。
 * - 这里显式忽略 Prisma/SQLite 的本地数据库文件及其 wal/shm/journal 衍生文件。
 */
type WebpackConfigWithWatchOptions = {
  watchOptions?: { ignored?: unknown };
  externals?: unknown;
};

/**
 * 追加 `config.watchOptions.ignored` 的 glob（仅 string）。
 */
function appendWebpackIgnored(config: Record<string, unknown>, patterns: (string | RegExp)[]) {
  const cfg = config as unknown as WebpackConfigWithWatchOptions;
  const watchOptions = cfg.watchOptions ?? {};
  const existingIgnored = watchOptions.ignored;
  const nextIgnored: string[] = [];

  /**
   * 仅接受非空字符串（glob）。
   *
   * 说明：
   * - 某些 Next/webpack 组合在校验 schema 时，对 ignored 数组只允许 string，
   *   若把 RegExp（如 /node_modules/）合并进去会触发 ValidationError。
   * @param {unknown} v
   */
  function pushIfValid(v: unknown) {
    if (typeof v === "string") {
      const s = v.trim();
      if (s) nextIgnored.push(s);
      return;
    }
  }

  if (Array.isArray(existingIgnored)) {
    for (const v of existingIgnored) pushIfValid(v);
  } else if (typeof existingIgnored === "string") {
    pushIfValid(existingIgnored);
  }
  for (const p of patterns) pushIfValid(p);

  cfg.watchOptions = {
    ...watchOptions,
    ignored: nextIgnored,
  };
}

const nextConfig: NextConfig = {
  /**
   * Turbopack/Workspace Root
   * 由于仓库根目录与 web 目录同时存在 lockfile，Next 可能误判 workspace root，
   * 从而在启动时输出警告。这里显式指定 Turbopack 的 root 为 web 目录。
   */
  turbopack: {
    root: __dirname,
  },
  /**
   * Prisma 在 dev 下配合 Turbopack 时，建议将其标记为 Server External Package，
   * 避免被打包进 bundle 导致运行时无法正确定位生成产物（从而报
   * “@prisma/client did not initialize yet …”）。
   */
  serverExternalPackages: ["@prisma/client", "prisma"],
  /**
   * 允许 dev 环境下来自特定 Origin 的 /_next/* 资源请求，避免跨域警告。
   * 如果你在局域网用 IP 访问（如 http://172.17.50.21:3000），可把该 Origin 加进来。
   */
  // 说明：Next dev 对 Origin/Host 的判断在不同网络/代理场景下可能出现“看起来没带端口”的情况，
  // 为了避免 HMR 与 /_next 资源被拦截导致页面反复刷新，这里把常见访问方式都加入白名单。
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1:3000",
    "http://127.0.0.1",
    "http://172.17.50.21:3000",
    "http://172.17.50.21",
    "http://192.168.31.17:3000",
    "http://192.168.31.17",
    // 某些环境下 Next 的告警里会出现“裸 host”（无 scheme/端口），这里也一并兼容
    "192.168.31.17",
    "192.168.31.17:3000",
    "172.17.50.21",
    "172.17.50.21:3000",
    "https://172.17.50.21:3000",
    "https://172.17.50.21",
    "https://192.168.31.17:3000",
    "https://192.168.31.17",
  ],
  /**
   * Webpack 模式下显式 externalize Prisma，避免被打包导致初始化异常。
   * - 注意：仅对 `next dev --webpack` / `next build` 的 Webpack pipeline 生效
   */
  webpack: (config, { isServer }) => {
    // 避免 SQLite 数据库文件写入触发 dev 环境的 Fast Refresh / 全局刷新
    appendWebpackIgnored(config as unknown as Record<string, unknown>, [
      // 默认 V1 本地 SQLite：web/.env 里常用 DATABASE_URL="file:./dev.db"
      // dev.db / dev.db-wal / dev.db-shm 等频繁写入会触发监听，从而导致页面“自动刷新、状态丢失”
      // 说明：某些 watchpack 版本对 "**/*.db" 这类 glob 的匹配并不稳定，这里同时加入更“直给”的模式兜底。
      "dev.db",
      "dev.db-*",
      "**/dev.db",
      "**/dev.db-*",
      "**/*.db",
      "**/*.db-journal",
      "**/*.db-wal",
      "**/*.db-shm",
      "**/prisma/*.db",
      "**/prisma/*.db-journal",
      "**/prisma/*.db-wal",
      "**/prisma/*.db-shm",
      "**/*.sqlite",
      "**/*.sqlite3",
    ]);

    if (isServer) {
      const cfg = config as unknown as WebpackConfigWithWatchOptions;
      const externals = cfg.externals ?? [];
      cfg.externals = Array.isArray(externals) ? externals : [externals];
      config.externals.push({
        "@prisma/client": "commonjs @prisma/client",
        prisma: "commonjs prisma",
      });
    }
    return config;
  },
};

export default nextConfig;
