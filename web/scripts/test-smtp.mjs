import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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
  const a = loadEnvFile(path.join(cwd, ".env.local"));
  const b = loadEnvFile(path.join(cwd, ".env"));
  if (a.loaded || b.loaded) {
    console.log("dotenv_loaded", {
      envLocal: a.loaded ? a.count : 0,
      env: b.loaded ? b.count : 0,
    });
  }
}

/**
 * 读取 SMTP 环境变量并做基础校验。
 * @returns {{ ok: boolean, missing: string[], cfg?: { host: string, port: number, user: string, pass: string, from: string } }}
 */
function readSmtpConfig() {
  const host = process.env.SMTP_HOST || "";
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : NaN;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || "";

  const missing = [];
  if (!host) missing.push("SMTP_HOST");
  if (!Number.isFinite(port)) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (!from) missing.push("SMTP_FROM");

  if (missing.length) return { ok: false, missing };
  return { ok: true, missing: [], cfg: { host, port, user, pass, from } };
}

/**
 * 脱敏字符串（用于打印配置，不泄露密码）。
 * @param {string} s
 * @returns {string}
 */
function mask(s) {
  if (!s) return "";
  if (s.length <= 4) return "*".repeat(s.length);
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

/**
 * 主程序：
 * - transporter.verify() 检查连通性/鉴权
 * - 可选发送测试邮件：SMTP_TEST_TO=xxx
 */
async function main() {
  // 让脚本行为更贴近 Next：支持直接在 web/.env(.local) 配置后运行测试。
  loadDotEnvLikeNext();

  const to = process.env.SMTP_TEST_TO || "";
  const r = readSmtpConfig();
  if (!r.ok) {
    console.error("smtp_config_invalid", { missing: r.missing });
    process.exitCode = 1;
    return;
  }

  const { cfg } = r;
  console.log("smtp_config", {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    user: cfg.user,
    pass: mask(cfg.pass),
    from: cfg.from,
    testTo: to || null,
  });

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  try {
    await transporter.verify();
    console.log("smtp_verify_ok");
  } catch (e) {
    console.error("smtp_verify_failed", e);
    process.exitCode = 1;
    return;
  }

  if (!to) {
    console.log("smtp_send_skipped", "set SMTP_TEST_TO=you@example.com to send a test email");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: cfg.from,
      to,
      subject: "ScholarSearch SMTP 测试邮件",
      text: "如果你收到这封邮件，说明 SMTP 配置正确。",
    });
    console.log("smtp_send_ok", { messageId: info?.messageId || null });
  } catch (e) {
    console.error("smtp_send_failed", e);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("smtp_test_crashed", e);
  process.exitCode = 1;
});


