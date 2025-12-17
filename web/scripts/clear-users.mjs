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
 * 清空“用户相关数据”：
 * - 删除 User 以及依赖它的会话/验证 token/项目/保存检索/通知/支付/反馈等
 * - 不删除 Work 主表（论文库），避免影响搜索缓存/种子数据
 *
 * ⚠️ 安全开关：
 * - 需要设置环境变量 CONFIRM_CLEAR_USERS=1 才会执行
 */
async function main() {
  loadDotEnvLikeNext();

  const confirm = process.env.CONFIRM_CLEAR_USERS;
  if (confirm !== "1") {
    console.error(
      "refuse_to_run",
      "请显式确认：CONFIRM_CLEAR_USERS=1 node scripts/clear-users.mjs",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();

  try {
    const before = {
      users: await prisma.user.count(),
      projects: await prisma.project.count(),
      savedSearches: await prisma.savedSearch.count(),
      sessions: await prisma.session.count(),
      notifications: await prisma.notification.count(),
      orders: await prisma.paymentOrder.count(),
      subscriptions: await prisma.subscription.count(),
      emailVerificationTokens: await prisma.emailVerificationToken.count(),
      passwordResetTokens: await prisma.passwordResetToken.count(),
      feedbacks: await prisma.workFeedback.count(),
      preferences: await prisma.topicPreference.count(),
      savedSearchWorks: await prisma.savedSearchWork.count(),
    };

    console.log("before", before);

    // 采用显式顺序 deleteMany，避免某些环境下外键级联未生效导致失败
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({}),
      prisma.passwordResetToken.deleteMany({}),
      prisma.session.deleteMany({}),
      prisma.paymentOrder.deleteMany({}),
      prisma.subscription.deleteMany({}),
      prisma.notification.deleteMany({}),
      prisma.workFeedback.deleteMany({}),
      prisma.topicPreference.deleteMany({}),
      prisma.savedSearchWork.deleteMany({}),
      prisma.searchRun.deleteMany({}),
      prisma.savedSearch.deleteMany({}),
      prisma.project.deleteMany({}),
      prisma.user.deleteMany({}),
    ]);

    const after = {
      users: await prisma.user.count(),
      projects: await prisma.project.count(),
      savedSearches: await prisma.savedSearch.count(),
      sessions: await prisma.session.count(),
      notifications: await prisma.notification.count(),
      orders: await prisma.paymentOrder.count(),
      subscriptions: await prisma.subscription.count(),
      emailVerificationTokens: await prisma.emailVerificationToken.count(),
      passwordResetTokens: await prisma.passwordResetToken.count(),
      feedbacks: await prisma.workFeedback.count(),
      preferences: await prisma.topicPreference.count(),
      savedSearchWorks: await prisma.savedSearchWork.count(),
    };

    console.log("after", after);
    console.log("clear_users_ok");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("clear_users_failed", e);
  process.exitCode = 1;
});



