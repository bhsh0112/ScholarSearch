import nodemailer from "nodemailer";

/**
 * 邮件发送配置（通过环境变量提供）。
 */
export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

/**
 * 从环境变量读取 SMTP 配置；未配置则返回 null（V1 允许只站内通知）。
 */
export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

/**
 * 发送邮件。
 *
 * 说明：
 * - 若未配置 SMTP 则静默跳过并返回 false（V1 允许只站内通知）。
 * - 若 SMTP 配置存在但连接/鉴权/发送失败，也不会抛出到上层（避免影响注册/找回密码主流程）。
 * - 在 dev 下会打印错误，方便定位配置问题。
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const cfg = getSmtpConfig();
  if (!cfg) return false;

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: { user: cfg.user, pass: cfg.pass },
      // 避免 SMTP 卡住导致接口长时间 pending（例如网络/防火墙/服务器主动断开）
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
    });

    await transporter.sendMail({
      from: cfg.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });

    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("smtp_send_failed", err);
    }
    return false;
  }
}


