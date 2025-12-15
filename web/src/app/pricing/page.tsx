import Link from "next/link";
import { getCurrentPlan, PLANS } from "@/lib/plans";

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.id === current.id;
          const isPro = p.id === "PRO";
          return (
            <div
              key={p.id}
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-sm ${
                isPro
                  ? "border-blue-200 bg-gradient-to-b from-blue-50/60 to-white dark:border-blue-500/30 dark:from-blue-500/10 dark:to-zinc-950"
                  : "border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950"
              }`}
            >
              {isPro ? (
                <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-500/20">
                  推荐
                </div>
              ) : null}

              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{p.name}</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{p.tagline}</div>

              <div className="mt-5 flex items-end gap-2">
                <div className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">¥{p.pricing.monthlyCny}</div>
                <div className="pb-1 text-xs text-zinc-500 dark:text-zinc-400">/月</div>
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">年付：¥{p.pricing.yearlyCny}</div>

              <div className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
                <div className="rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-100">配额</div>
                  <div className="mt-1">
                    主题数：{p.limits.maxTopics}；TopN：{p.limits.maxPushTopN}；AI：{p.limits.aiEnabled ? "可用" : "不可用"}；
                    邮件：{p.limits.emailEnabled ? "可用" : "不可用"}
                  </div>
                </div>

                <ul className="space-y-2">
                  {p.highlights.map((h, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <div className="rounded-xl bg-zinc-100 px-4 py-2 text-center text-sm font-semibold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                    当前方案
                  </div>
                ) : (
                  <Link
                    href="/"
                    className="block rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500"
                  >
                    升级（先回首页，后续接支付）
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-300">
        <div className="font-bold text-zinc-900 dark:text-zinc-50">说明</div>
        <div className="mt-2 space-y-2">
          <div> - 目前用环境变量 `APP_PLAN` 模拟计划（FREE/PRO/MAX）。</div>
          <div> - 后续接入支付后，会在此处提供订阅与发票能力。</div>
        </div>
      </div>
    </div>
  );
}


