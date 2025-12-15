import React from "react";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  onSearch: () => void;
  loading: boolean;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  stats: { counts?: unknown; ms?: number } | null;
  total: number;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  loading,
  onSave,
  saving,
  canSave,
  stats,
  total,
}: SearchInputProps) {
  return (
    <div className="group relative w-full">
      <div className="relative z-10 flex items-center overflow-hidden rounded-full bg-white p-2 shadow-xl shadow-black/5 ring-1 ring-zinc-900/5 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 dark:bg-zinc-900 dark:ring-white/10 dark:focus-within:ring-blue-500/40">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center text-zinc-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-5 w-5 transition-colors group-focus-within:text-blue-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="h-full w-full bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          placeholder="搜索论文... (例如: LLM hallucinations survey)"
        />
        <div className="flex shrink-0 items-center gap-2 pr-1">
          {stats ? (
            <div className="hidden items-center gap-2 text-xs text-zinc-400 lg:flex">
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                {total} 结果
              </span>
            </div>
          ) : null}
          <button
            onClick={onSearch}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white shadow-lg shadow-zinc-500/20 transition-all hover:bg-zinc-800 hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:active:scale-100 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              "搜索"
            )}
          </button>
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            className="group/save inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-all hover:bg-blue-50 hover:text-blue-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
            title="保存此检索任务"
          >
             {saving ? (
               <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
             )}
          </button>
        </div>
      </div>
      <div className="absolute -inset-1 -z-10 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 opacity-0 blur transition duration-500 group-focus-within:opacity-20" />
    </div>
  );
}
