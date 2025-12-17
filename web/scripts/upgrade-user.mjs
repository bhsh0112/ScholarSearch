import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

/**
 * 解析一行 dotenv 风格的 KEY=VALUE。
 * - 支持空行/注释行
 * - 支持 value 被单双引号包裹
 * @param {string} line
 * @returns {{ key: string, value: string } | null}
 */
function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

/**
 * 从指定路径加载 .env 文件（只填充尚未设置的环境变量）。
 * @param {string} filePath
 * @returns {{ loaded: boolean, count: number }}
 */
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { loaded: false, count: 0 };
    const content = fs.readFileSync(filePath, "utf8");
    let count = 0;
    for (const line of content.split(/\r?\n/)) {
      const kv = parseEnvLine(line);
      if (!kv) continue;
      if (process.env[kv.key] == null || process.env[kv.key] === "") {
        process.env[kv.key] = kv.value;
        count += 1;
      }
    }
    return { loaded: true, count };
  } catch {
    return { loaded: false, count: 0 };
  }
}

/**
 * 按 Next.js 常见习惯加载环境变量：
 * - 优先 `.env.local`
 * - 其次 `.env`
 */
function loadDotEnvLikeNext() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env.local"));
  loadEnvFile(path.join(cwd, ".env"));
}

/**
 * 读取命令行参数：
 * - --email=xxx@xx.com（必填）
 * - --plan=PRO|MAX（必填）
 * - --period=MONTHLY|YEARLY（可选，默认 MONTHLY）
 * @returns {{ email: string, plan: "PRO"|"MAX", period: "MONTHLY"|"YEARLY" }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (!m) continue;
    map[m[1]] = m[2];
  }
  const email = String(map.email || "").trim().toLowerCase();
  const planRaw = String(map.plan || "").trim().toUpperCase();
  const periodRaw = String(map.period || "MONTHLY").trim().toUpperCase();

  if (!email) throw new Error("missing_arg: --email=xxx");
  if (planRaw !== "PRO" && planRaw !== "MAX") throw new Error("invalid_arg: --plan must be PRO or MAX");
  if (periodRaw !== "MONTHLY" && periodRaw !== "YEARLY") throw new Error("invalid_arg: --period must be MONTHLY or YEARLY");

  return { email, plan: planRaw, period: periodRaw };
}

/**
 * 计算订阅到期时间（按月/年延长）。
 * @param {Date} base
 * @param {"MONTHLY"|"YEARLY"} period
 */
function calcPeriodEnd(base, period) {
  const end = new Date(base);
  if (period === "MONTHLY") end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}

/**
 * 主程序：将指定用户直接升级为 PRO/MAX（写入 ACTIVE Subscription）。
 *
 * ⚠️ 安全开关：需要设置环境变量 CONFIRM_UPGRADE_USER=1 才会执行写入。
 *
 * 示例：
 * - CONFIRM_UPGRADE_USER=1 npm run -s db:upgrade-user -- --email=you@example.com --plan=PRO --period=MONTHLY
 */
async function main() {
  loadDotEnvLikeNext();

  const { email, plan, period } = parseArgs();
  if (process.env.CONFIRM_UPGRADE_USER !== "1") {
    console.error("refuse_to_run", "请显式确认：CONFIRM_UPGRADE_USER=1");
    console.error("usage", "npm run -s db:upgrade-user -- --email=you@example.com --plan=PRO --period=MONTHLY");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) {
      console.error("user_not_found", { email });
      process.exitCode = 1;
      return;
    }

    const now = new Date();
    const existing = await prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", currentPeriodEnd: { gt: now } },
      orderBy: { currentPeriodEnd: "desc" },
      select: { id: true, currentPeriodEnd: true, planId: true },
    });

    const base = existing?.currentPeriodEnd && existing.currentPeriodEnd > now ? existing.currentPeriodEnd : now;
    const end = calcPeriodEnd(base, period);

    const result = await prisma.$transaction(async (tx) => {
      // 保持数据库干净：先把其他 ACTIVE 的订阅都标记为 CANCELED（即便存在多条）
      await tx.subscription.updateMany({ where: { userId: user.id, status: "ACTIVE" }, data: { status: "CANCELED" } });

      if (existing) {
        const updated = await tx.subscription.update({
          where: { id: existing.id },
          data: { planId: plan, currentPeriodEnd: end, status: "ACTIVE" },
          select: { id: true, planId: true, status: true, currentPeriodEnd: true },
        });
        return { mode: "updated", subscription: updated };
      }

      const created = await tx.subscription.create({
        data: { userId: user.id, planId: plan, status: "ACTIVE", currentPeriodEnd: end },
        select: { id: true, planId: true, status: true, currentPeriodEnd: true },
      });
      return { mode: "created", subscription: created };
    });

    console.log("upgrade_user_ok", {
      email: user.email,
      userId: user.id,
      mode: result.mode,
      planId: result.subscription.planId,
      status: result.subscription.status,
      currentPeriodEnd: result.subscription.currentPeriodEnd,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("upgrade_user_failed", e);
  process.exitCode = 1;
});


