/**
 * V1 worker（本地触发器）：
 * - 通过调用 Next API（/api/cron/run）执行追踪任务
 *
 * 运行方式：
 * - 先启动 dev server：npm run dev
 * - 再运行：
 *   $env:DATABASE_URL="file:./dev.db"; $env:CRON_SECRET="dev"; npm run worker
 */
async function main() {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  const secret = process.env.CRON_SECRET || "";

  const res = await fetch(`${base}/api/cron/run`, {
    method: "POST",
    headers: secret ? { "x-cron-secret": secret } : {},
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("worker_failed", res.status, json);
    process.exitCode = 1;
    return;
  }

  console.log("worker_ok", json);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


