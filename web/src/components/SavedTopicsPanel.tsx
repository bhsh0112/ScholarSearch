import React from "react";

export type SavedTopic = {
  id: string;
  name: string;
  query: string;
  active: boolean;
  schedule: "MANUAL" | "DAILY" | "WEEKLY";
  pushStrategy: "RECENCY" | "IMPORTANCE" | "HYBRID";
  pushTopN: number;
  noiseLevel: "STRICT" | "STANDARD" | "LOOSE";
  lastCheckedAt: string | null;
  updatedAt: string;
};

interface SavedTopicsPanelProps {
  items: SavedTopic[];
  loading: boolean;
  refresh: () => void;
}

/**
 * 已保存主题（Topics）列表面板。
 *
 * 目标：
 * - 让用户对“我在追踪什么、怎么推送”有持续可见性
 * - 为后续的“编辑/暂停/反馈闭环/付费墙”预留 UI 位置
 */
export function SavedTopicsPanel({ items, loading, refresh }: SavedTopicsPanelProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50">已保存主题</div>
          <div className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
            用于日常推送（Radar/Digest/Hybrid）
          </div>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg px-3 py-1.5 text-[10px] font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
        >
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center text-xs text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
          暂无主题。点击搜索框右侧“收藏/保存”按钮创建一个主题。
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.slice(0, 8).map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border p-4 ${
                t.active
                  ? "border-zinc-100 bg-white dark:border-white/10 dark:bg-zinc-950"
                  : "border-zinc-100 bg-zinc-50/60 opacity-70 dark:border-white/10 dark:bg-white/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t.name}</div>
                  <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {t.query}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-500">
                  {t.active ? "启用" : "暂停"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-white/5">{t.schedule}</span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-white/5">{t.pushStrategy}</span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-white/5">Top {t.pushTopN}</span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 dark:bg-white/5">{t.noiseLevel}</span>
                <span className="ml-auto text-[10px] text-zinc-400 dark:text-zinc-500">
                  上次检查：{t.lastCheckedAt ? new Date(t.lastCheckedAt).toLocaleString() : "未运行"}
                </span>
              </div>
            </div>
          ))}

          {items.length > 8 ? (
            <div className="text-center text-[10px] text-zinc-400 dark:text-zinc-500">仅展示前 8 个主题</div>
          ) : null}
        </div>
      )}
    </div>
  );
}


