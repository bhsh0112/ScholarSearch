import React from "react";

interface AiAssistantProps {
  aiLoading: boolean;
  aiError: string | null;
  aiDraft: string;
  setAiDraft: (v: string) => void;
  aiExpand: () => void;
  useAiDraft: () => void;
  q: string;
}

export function AiAssistant({
  aiLoading,
  aiError,
  aiDraft,
  setAiDraft,
  aiExpand,
  useAiDraft,
  q,
}: AiAssistantProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-white p-[1px] shadow-sm transition-shadow hover:shadow-md dark:from-violet-900/20 dark:to-zinc-900">
      <div className="relative h-full rounded-2xl bg-white/60 p-5 backdrop-blur-sm dark:bg-zinc-900/60">
        
        {/* 装饰性背景 */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                 {/* Sparkles Icon */}
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-base font-bold text-violet-900 dark:text-violet-100">AI 智能增强</span>
            </div>
            <p className="text-xs font-medium text-violet-600/70 dark:text-violet-300/60">
              自动优化检索词，并智能推荐过滤条件
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={aiExpand}
              disabled={aiLoading || !q.trim()}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:bg-violet-500 hover:shadow-violet-500/40 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {aiLoading && (
                 <div className="absolute inset-0 bg-white/20 animate-pulse" />
              )}
              {aiLoading ? (
                 <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5H4.25a.75.75 0 000 1.5h5v5a.75.75 0 001.5 0v-5h5a.75.75 0 000-1.5h-5v-5z" clipRule="evenodd" />
                </svg>
              )}
              {aiLoading ? "思考中..." : "生成优化方案"}
            </button>
            
            <button
              onClick={useAiDraft}
              disabled={!aiDraft.trim()}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 py-2 text-xs font-semibold text-violet-700 shadow-sm transition-all hover:bg-violet-50 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:border-violet-500/30 dark:bg-transparent dark:text-violet-300 dark:hover:bg-violet-500/10"
            >
              应用
            </button>
          </div>
        </div>

        {aiError && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <span className="font-semibold">出错啦:</span> {aiError}
          </div>
        )}

        {(aiDraft || aiLoading) && (
          <div className="group relative mt-5">
              <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 opacity-30 blur-sm transition group-focus-within:opacity-60 dark:opacity-20"></div>
              <textarea
                  value={aiDraft}
                  onChange={(e) => setAiDraft(e.target.value)}
                  className="relative block w-full rounded-xl border-0 bg-white p-3 text-sm text-zinc-800 shadow-inner placeholder:text-zinc-400 focus:ring-0 dark:bg-zinc-950 dark:text-zinc-200"
                  rows={2}
                  placeholder="AI 建议将出现在这里..."
              />
          </div>
        )}
      </div>
    </div>
  );
}
