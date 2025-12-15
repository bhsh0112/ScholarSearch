import React from "react";
import { AggregatedWork } from "@/lib/sources/types";

interface SearchResultCardProps {
  work: AggregatedWork;
}

export function SearchResultCard({ work }: SearchResultCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] ring-1 ring-zinc-900/5 transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1)] hover:ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10 dark:hover:ring-white/20">
      
      {/* 顶部隐形渐变条 */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
             {work.year && (
              <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {work.year}
              </span>
            )}
            {work.venue && (
              <span className="flex items-center gap-1.5 px-1">
                <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span className="line-clamp-1 max-w-[200px]">{work.venue}</span>
              </span>
            )}
             <span className="flex items-center gap-1.5 px-1">
                <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span className="uppercase tracking-wider text-[10px]">{work.sources.map((s) => s.source).join(" + ")}</span>
              </span>
          </div>

          <h3 className="text-lg font-bold leading-snug tracking-tight text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
            {work.title}
          </h3>
          
          {work.authors && work.authors.length > 0 && (
            <div className="flex flex-wrap gap-x-1 text-sm text-zinc-600 dark:text-zinc-400">
               {work.authors.slice(0, 5).map((a, i) => (
                 <span key={i} className={i === 0 ? "font-medium text-zinc-900 dark:text-zinc-200" : ""}>
                    {a.name}{i < Math.min(work.authors!.length, 5) - 1 ? "," : ""}
                 </span>
               ))}
               {work.authors.length > 5 && <span className="text-zinc-400 italic">et al.</span>}
            </div>
          )}

          {work.abstract ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {work.abstract}
            </p>
          ) : (
            <p className="text-sm italic text-zinc-400 dark:text-zinc-600">
              暂无摘要
            </p>
          )}
        </div>

        {work.url && (
          <a
            href={work.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 transition-all hover:bg-blue-500 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-blue-600 dark:hover:text-white"
            title="查看原文"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
