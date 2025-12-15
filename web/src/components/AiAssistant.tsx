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
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 backdrop-blur-sm dark:border-violet-500/20 dark:bg-violet-500/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">AI 智能辅助</span>
          </div>
          <p className="text-xs text-violet-700/80 dark:text-violet-300/70">
            优化你的检索词，并自动推荐过滤条件
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={aiExpand}
            disabled={aiLoading || !q.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-violet-500 hover:shadow-violet-500/25 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:bg-violet-500 dark:hover:bg-violet-400"
          >
            {aiLoading ? (
               <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.96l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.96 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.96l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.683a1 1 0 01.633.633l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
              </svg>
            )}
            {aiLoading ? "生成中..." : "AI 生成优化"}
          </button>
          
          <button
            onClick={useAiDraft}
            disabled={!aiDraft.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-xs font-semibold text-violet-700 shadow-sm transition-all hover:bg-violet-50 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:border-violet-500/30 dark:bg-transparent dark:text-violet-300 dark:hover:bg-violet-500/10"
          >
            应用到搜索
          </button>
        </div>
      </div>

      {aiError && (
        <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <span className="font-semibold">Error:</span> {aiError}
        </div>
      )}

      {(aiDraft || aiLoading) && (
        <div className="group mt-4 relative">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-violet-400 to-indigo-400 opacity-20 blur transition group-hover:opacity-40"></div>
            <textarea
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                className="relative block w-full rounded-xl border-0 bg-white/80 p-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-500/50 dark:bg-black/50 dark:text-zinc-200"
                rows={3}
                placeholder="AI 生成的检索式草案将出现在这里..."
            />
        </div>
      )}
    </div>
  );
}

