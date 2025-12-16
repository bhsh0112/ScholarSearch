import { getCurrentPlan, PLANS } from "@/lib/plans";
import { PricingClient } from "@/app/pricing/PricingClient";

/**
 * 定价页（产品化雏形）。
 *
 * 说明：
 * - 当前以 APP_PLAN 模拟当前用户计划
 * - 真实支付接入后，把“升级按钮”替换为支付/订阅流程
 */
export default function PricingPage() {
  const current = getCurrentPlan();
  const plans = [PLANS.FREE, PLANS.PRO, PLANS.MAX];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
      <div className="mb-10 flex flex-col gap-3">
        <div className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">定价与方案</div>
        <div className="text-zinc-600 dark:text-zinc-400">
          主打“研究雷达”：调研时高效检索，不调研时持续推送。当前计划：
          <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-sm font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            {current.name}
          </span>
        </div>
      </div>

      <PricingClient initialPlan={current} plans={plans} />

      <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
        <div className="font-bold text-zinc-900 dark:text-zinc-50">说明</div>
        <div className="mt-2 space-y-2">
          <div> - 计划优先级：订阅（支付成功写入）优先于 `APP_PLAN` 环境变量。</div>
          <div> - 需要配置微信/支付宝商户参数与回调 URL 才能完成真实支付。</div>
        </div>
      </div>
    </div>
  );
}


