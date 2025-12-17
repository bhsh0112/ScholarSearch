import { Suspense } from "react";
import { VerifyEmailClient } from "./VerifyEmailClient";

/**
 * 邮箱验证页：
 * - 支持从链接带 token 自动验证
 * - 支持输入邮箱重新发送验证邮件
 */
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-md px-4 py-12 text-sm text-zinc-500 dark:text-zinc-400">加载中...</div>}
    >
      <VerifyEmailClient />
    </Suspense>
  );
}


