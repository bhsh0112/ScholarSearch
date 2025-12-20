import { ManualTopupsClient } from "@/app/admin/manual-topups/ui/ManualTopupsClient";

/**
 * 管理员：人工充值审核页。
 *
 * 说明：
 * - 需要先登录
 * - 管理员身份由 APP_USER_EMAIL 控制（见 `requireAdmin`）
 */
export default function ManualTopupsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="mb-8">
        <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">人工充值审核</div>
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          用户扫码付款后会生成一条记录，管理员在此审核通过后自动开通/续费订阅。
        </div>
      </div>
      <ManualTopupsClient />
    </div>
  );
}


