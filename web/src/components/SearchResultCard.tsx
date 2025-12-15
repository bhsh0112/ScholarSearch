import React from "react";
import { AggregatedWork } from "@/lib/sources/types";

interface SearchResultCardProps {
  work: AggregatedWork;
}

export function SearchResultCard({ work }: SearchResultCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white/50 p-5 shadow-sm transition-all duration-300 hover:border-blue-200 hover:bg-white hover:shadow-md hover:shadow-blue-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-500/30 dark:hover:bg-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
            {work.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            {work.year && (
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-white/10 dark:text-zinc-300">
                {work.year}
              </span>
            )}
            {work.venue && (
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span>{work.venue}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              <span>
                {work.sources.map((s) => s.source).join(" + ")}
              </span>
            </span>
          </div>
        </div>
        {work.url && (
          <a
            href={work.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-all hover:bg-blue-100 hover:text-blue-600 active:scale-95 dark:bg-white/10 dark:text-zinc-400 dark:hover:bg-blue-500/20 dark:hover:text-blue-400"
            title="打开链接"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        )}
      </div>
      
      {work.authors && work.authors.length > 0 && (
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
           {work.authors.map(a => a.name).slice(0, 5).join(", ")}
           {work.authors.length > 5 ? " et al." : ""}
        </div>
      )}

      {work.abstract ? (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {work.abstract}
        </p>
      ) : (
        <p className="mt-4 text-sm italic text-zinc-400 dark:text-zinc-600">
          暂无摘要
        </p>
      )}
    </div>
  );
}

