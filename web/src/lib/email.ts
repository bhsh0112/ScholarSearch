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
 * 发送邮件（若未配置 SMTP 则静默跳过并返回 false）。
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const cfg = getSmtpConfig();
  if (!cfg) return false;

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });

  return true;
}


