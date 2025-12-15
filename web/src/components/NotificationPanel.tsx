import React from "react";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
}

interface NotificationPanelProps {
  notifs: Notification[];
  loading: boolean;
  refresh: () => void;
  markRead: (id: string) => void;
}

export function NotificationPanel({ notifs, loading, refresh, markRead }: NotificationPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
          站内通知
        </h2>
        <button
          onClick={refresh}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-200 active:scale-95 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
        >
          {loading ? "刷新中..." : "刷新列表"}
        </button>
      </div>

      <div className="space-y-3">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-8 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无新通知</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              保存检索任务后，系统会自动追踪新文献
            </p>
          </div>
        ) : null}

        {notifs.map((n) => (
          <div
            key={n.id}
            className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all dark:bg-white/5 ${
              n.readAt
                ? "border-zinc-100 opacity-75 dark:border-white/5"
                : "border-blue-100 ring-1 ring-blue-50 dark:border-blue-500/20 dark:ring-blue-500/10"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {n.title}
                  </h3>
                  {n.readAt && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                      已读
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              {!n.readAt && (
                <button
                  onClick={() => markRead(n.id)}
                  className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                >
                  标记已读
                </button>
              )}
            </div>
            {n.body && (
              <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:bg-black/20 dark:text-zinc-400">
                <pre className="whitespace-pre-wrap font-sans">{n.body}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

