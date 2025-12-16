import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { emailVerifyExpiresAt, generateToken, hashToken } from "@/lib/tokens";

/**
 * 发送邮箱验证邮件。
 *
 * 说明：
 * - 生成 token 并落库（仅存 hash）
 * - SMTP 未配置时，开发环境返回调试链接（生产环境仅返回 sent=false）
 */
export async function sendVerificationEmail(params: { userId: string; email: string }): Promise<{
  sent: boolean;
  debugLink?: string;
}> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = emailVerifyExpiresAt();

  await prisma.emailVerificationToken.create({
    data: { userId: params.userId, tokenHash, expiresAt },
  });

  const base = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  const link = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "ScholarSearch 邮箱验证";
  const text = `请点击链接完成邮箱验证：\n${link}\n\n若不是你本人操作，请忽略。`;

  const sent = await sendEmail({ to: params.email, subject, text });
  if (!sent && process.env.NODE_ENV !== "production") {
    return { sent: false, debugLink: link };
  }
  return { sent };
}


