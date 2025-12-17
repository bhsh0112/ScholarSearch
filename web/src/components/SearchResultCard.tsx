"use client";

import React, { useMemo, useState } from "react";
import { AggregatedWork } from "@/lib/sources/types";

type WorkSummary = {
  problem: string;
  contributions: string[];
  innovations: string[];
  coreIdea: string;
};

interface SearchResultCardProps {
  work: AggregatedWork;
}

/**
 * 单条检索结果卡片：展示元信息/摘要，并支持“生成概要”（调用 LLM，返回结构化四段内容）。
 */
export function SearchResultCard({ work }: SearchResultCardProps) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkSummary | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<{ inputUsed: "FULLTEXT" | "ABSTRACT" | "METADATA_ONLY"; inputNote?: string | null } | null>(null);

  const key = useMemo(() => {
    const base = work.doi ?? work.arxivId ?? work.openalexId ?? work.title;
    return String(base || "work").slice(0, 200);
  }, [work.arxivId, work.doi, work.openalexId, work.title]);

  /**
   * 请求后端生成概要。
   * - 若已生成过：直接展开/收起
   * - 否则：调用 /api/ai/summary 并缓存到组件 state
   */
  async function generateSummary() {
    if (summary) {
      setSummaryOpen((v) => !v);
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    setSummaryMeta(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          work: {
            title: work.title,
            abstract: work.abstract ?? null,
            year: work.year ?? null,
            venue: work.venue ?? null,
            url: work.url ?? null,
            doi: work.doi ?? null,
            arxivId: work.arxivId ?? null,
            openalexId: work.openalexId ?? null,
            authors: work.authors ?? null,
          },
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | null
        | { ok?: boolean; error?: string; message?: string; result?: unknown; inputUsed?: unknown; inputNote?: unknown };
      if (!json) {
        throw new Error(`summary_http_${res.status}`);
      }

      // 统一按 {ok:true/false} 处理，避免 401/500 之类把信息截断成裸 error code。
      if (!json.ok) {
        const code = json.error || (res.ok ? "summary_failed" : `summary_http_${res.status}`);
        const message = json.message || code;
        if (code === "llm_not_configured") {
          throw new Error("LLM 未配置：请在 web/.env 中设置 LLM_BASE_URL/LLM_API_KEY/LLM_MODEL");
        }
        if (code === "plan_required") {
          throw new Error(message || "当前计划不支持 AI 功能，请升级到 Pro/Max。");
        }
        if (code === "unauthorized") {
          throw new Error("请先登录后再使用“生成概要”。");
        }
        throw new Error(message);
      }

      const result = json.result as WorkSummary | undefined;
      if (!result?.problem || !result?.coreIdea) throw new Error("summary_invalid");

      setSummary(result);
      setSummaryMeta({
        inputUsed:
          json.inputUsed === "FULLTEXT" || json.inputUsed === "ABSTRACT" || json.inputUsed === "METADATA_ONLY"
            ? (json.inputUsed as "FULLTEXT" | "ABSTRACT" | "METADATA_ONLY")
            : "METADATA_ONLY",
        inputNote: typeof json.inputNote === "string" ? json.inputNote : null,
      });
      setSummaryOpen(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "unknown_error";
      setSummaryError(message);
      setSummaryOpen(true);
    } finally {
      setSummaryLoading(false);
    }
  }

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

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={generateSummary}
          disabled={summaryLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          aria-expanded={summaryOpen}
          aria-controls={`summary-${key}`}
        >
          {summaryLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />
              生成中...
            </span>
          ) : summary ? (
            summaryOpen ? (
              "收起概要"
            ) : (
              "查看概要"
            )
          ) : (
            "生成概要"
          )}
        </button>

        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {summaryMeta?.inputUsed === "FULLTEXT"
            ? "本次基于全文（PDF 解析，已截断）归纳"
            : summaryMeta?.inputUsed === "ABSTRACT"
              ? "本次基于摘要归纳"
              : "本次基于元信息/摘要归纳"}
        </span>
      </div>

      {summaryOpen ? (
        <div
          id={`summary-${key}`}
          className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700 ring-1 ring-zinc-900/5 dark:bg-white/5 dark:text-zinc-200 dark:ring-white/10"
        >
          {summaryMeta?.inputNote ? (
            <div className="mb-3 rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {summaryMeta.inputNote}
            </div>
          ) : null}
          {summaryError ? (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-red-600 dark:text-red-400">概要生成失败</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">{summaryError}</div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSummary(null);
                    setSummaryError(null);
                    void generateSummary();
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                >
                  重试
                </button>
              </div>
            </div>
          ) : summary ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">① 解决的问题</div>
                <div className="mt-1 leading-relaxed">{summary.problem}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">② 主要贡献</div>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {summary.contributions.map((t, i) => (
                    <li key={i} className="leading-relaxed">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">③ 创新点</div>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {summary.innovations.map((t, i) => (
                    <li key={i} className="leading-relaxed">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">④ 核心思路概述</div>
                <div className="mt-1 leading-relaxed">{summary.coreIdea}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">点击“生成概要”后将在此展示结果。</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
