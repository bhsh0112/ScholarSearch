import React, { useMemo, useState } from "react";

export type TopicSchedule = "MANUAL" | "DAILY" | "WEEKLY";
export type TopicPushStrategy = "RECENCY" | "IMPORTANCE" | "HYBRID";
export type TopicNoiseLevel = "STRICT" | "STANDARD" | "LOOSE";

export type TopicConfig = {
  schedule: TopicSchedule;
  pushStrategy: TopicPushStrategy;
  pushTopN: number;
  noiseLevel: TopicNoiseLevel;
};

interface SaveTopicModalProps {
  open: boolean;
  queryPreview: string;
  defaultName: string;
  initial: TopicConfig;
  onClose: () => void;
  onConfirm: (config: TopicConfig) => void;
  saving: boolean;
}

/**
 * 保存主题（Topic）的配置弹窗。
 *
 * 目标：
 * - 让用户在“保存”时顺手设置推送策略、频率和噪音控制
 * - 不引入复杂的账户/计费体系前，先把“可控的日常推送”跑通
 */
export function SaveTopicModal({
  open,
  queryPreview,
  defaultName,
  initial,
  onClose,
  onConfirm,
  saving,
}: SaveTopicModalProps) {
  const [schedule, setSchedule] = useState<TopicSchedule>(initial.schedule);
  const [pushStrategy, setPushStrategy] = useState<TopicPushStrategy>(initial.pushStrategy);
  const [pushTopN, setPushTopN] = useState<number>(initial.pushTopN);
  const [noiseLevel, setNoiseLevel] = useState<TopicNoiseLevel>(initial.noiseLevel);

  const nameHint = useMemo(() => {
    const n = defaultName.trim();
    return n.length > 24 ? `${n.slice(0, 24)}…` : n;
  }, [defaultName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-950 dark:ring-white/10">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5 dark:border-white/10">
          <div className="space-y-1">
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-50">保存为主题（Topic）</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              主题名将默认使用：<span className="font-medium text-zinc-700 dark:text-zinc-200">{nameHint || "（空）"}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/5 dark:hover:text-zinc-200"
            aria-label="关闭"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl bg-zinc-50 p-4 text-xs text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
            <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">检索式</div>
            <div className="line-clamp-3 whitespace-pre-wrap break-words">{queryPreview || "（空）"}</div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">推送频率</div>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as TopicSchedule)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="DAILY">每日</option>
                <option value="WEEKLY">每周</option>
                <option value="MANUAL">手动（不自动推送）</option>
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">推送偏重</div>
              <select
                value={pushStrategy}
                onChange={(e) => setPushStrategy(e.target.value as TopicPushStrategy)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="HYBRID">平衡（默认）</option>
                <option value="RECENCY">最新优先</option>
                <option value="IMPORTANCE">重要性优先</option>
              </select>
            </label>

            <label className="space-y-2">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">每次推送数量（Top N）</div>
              <input
                type="number"
                min={1}
                max={50}
                value={pushTopN}
                onChange={(e) => setPushTopN(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="text-[10px] text-zinc-400">建议：5–20</div>
            </label>

            <label className="space-y-2">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">噪音控制</div>
              <select
                value={noiseLevel}
                onChange={(e) => setNoiseLevel(e.target.value as TopicNoiseLevel)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none focus:border-blue-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100"
              >
                <option value="STRICT">严格（更少更准）</option>
                <option value="STANDARD">标准</option>
                <option value="LOOSE">宽松（更多覆盖）</option>
              </select>
              <div className="text-[10px] text-zinc-400">影响推送列表的过滤强度（不会影响你手动检索）。</div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4 dark:border-white/10">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm({ schedule, pushStrategy, pushTopN, noiseLevel })}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
          >
            {saving ? "保存中…" : "确认保存"}
          </button>
        </div>
      </div>
    </div>
  );
}


