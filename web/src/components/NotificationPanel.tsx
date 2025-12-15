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
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <span className="relative flex h-2 w-2">
             {notifs.some(n => !n.readAt) && (
               <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
             )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${notifs.some(n => !n.readAt) ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600"}`}></span>
          </span>
          站内通知
        </h2>
        <button
          onClick={refresh}
          className="text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {loading ? "刷新中..." : "刷新"}
        </button>
      </div>

      <div className="space-y-3">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-12 text-center dark:border-white/5 dark:bg-white/5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">暂无新通知</p>
            <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
              保存检索任务后，系统会自动追踪新文献
            </p>
          </div>
        ) : null}

        {notifs.map((n) => (
          <div
            key={n.id}
            className={`group relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md ${
              n.readAt
                ? "border-zinc-100 bg-zinc-50/50 opacity-60 hover:opacity-100 dark:border-white/5 dark:bg-white/5"
                : "border-blue-100 bg-white shadow-sm ring-1 ring-blue-50 dark:border-blue-500/20 dark:bg-zinc-900 dark:ring-blue-500/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                 <div className="flex items-center gap-2">
                    <h3 className={`text-xs font-semibold ${n.readAt ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>
                      {n.title}
                    </h3>
                    {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                 </div>
                
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              
              {!n.readAt && (
                <button
                  onClick={() => markRead(n.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="标记已读"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-zinc-400 hover:text-blue-500">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {n.body && (
              <div className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                {n.body}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
