import { requireUser } from "@/lib/auth";

/**
 * 要求当前用户为管理员（V1：用 APP_USER_EMAIL 作为管理员邮箱）。
 *
 * 说明：
 * - 第一版“人工收款码开通会员”需要一个管理员审核入口
 * - 为避免引入复杂 RBAC，这里用环境变量指定管理员邮箱
 */
export async function requireAdmin(req: Request): Promise<{ id: string; email: string }> {
  const me = await requireUser(req);
  const adminEmail = (process.env.APP_USER_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) {
    const err = new Error("admin_not_configured") as Error & { status?: number };
    err.status = 500;
    throw err;
  }
  if (me.email.trim().toLowerCase() !== adminEmail) {
    const err = new Error("forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return me;
}


