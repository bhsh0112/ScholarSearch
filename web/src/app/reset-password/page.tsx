import { Suspense } from "react";
import { ResetPasswordClient } from "./ResetPasswordClient";

/**
 * 重置密码页：从邮件链接带 token。
 */
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-md px-4 py-12 text-sm text-zinc-500 dark:text-zinc-400">加载中...</div>}
    >
      <ResetPasswordClient />
    </Suspense>
  );
}


