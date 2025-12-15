"use client";

import { useMemo, useState } from "react";
import { AggregatedWork } from "@/lib/sources/types";
import { SearchInput } from "@/components/SearchInput";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchResultCard } from "@/components/SearchResultCard";
import { AiAssistant } from "@/components/AiAssistant";
import { NotificationPanel } from "@/components/NotificationPanel";

export default function Home() {
  const [q, setQ] = useState("retrieval augmented generation survey");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string>("");
  const [perSource, setPerSource] = useState(15);
  const [sourceOpenAlex, setSourceOpenAlex] = useState(true);
  const [sourceCrossref, setSourceCrossref] = useState(true);
  const [sourceArxiv, setSourceArxiv] = useState(true);
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");
  const [venues, setVenues] = useState<string>("");
  const [authors, setAuthors] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [works, setWorks] = useState<AggregatedWork[]>([]);
  const [stats, setStats] = useState<null | { counts?: unknown; ms?: number; errors?: unknown; filters?: unknown }>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<
    Array<{ id: string; title: string; body: string | null; createdAt: string; readAt: string | null }>
  >([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const total = works.length;
  // 增加到 100 个预览，体验更好
  const preview = useMemo(() => works.slice(0, 100), [works]);

  function buildFilters() {
    const sources: string[] = [];
    if (sourceOpenAlex) sources.push("OPENALEX");
    if (sourceCrossref) sources.push("CROSSREF");
    if (sourceArxiv) sources.push("ARXIV");

    const yf = yearFrom.trim() ? Number(yearFrom.trim()) : undefined;
    const yt = yearTo.trim() ? Number(yearTo.trim()) : undefined;
    const venueList = venues
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const authorList = authors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      sources,
      yearFrom: Number.isFinite(yf) ? yf : undefined,
      yearTo: Number.isFinite(yt) ? yt : undefined,
      venues: venueList.length > 0 ? venueList : undefined,
      authors: authorList.length > 0 ? authorList : undefined,
    };
  }

  function applyFiltersFromAi(filters: unknown) {
    if (!filters || typeof filters !== "object") return;
    const f = filters as {
      sources?: unknown;
      yearFrom?: unknown;
      yearTo?: unknown;
      venues?: unknown;
      authors?: unknown;
    };
    const sources = Array.isArray(f.sources) ? (f.sources as string[]) : [];
    setSourceOpenAlex(sources.length === 0 ? true : sources.includes("OPENALEX"));
    setSourceCrossref(sources.length === 0 ? true : sources.includes("CROSSREF"));
    setSourceArxiv(sources.length === 0 ? true : sources.includes("ARXIV"));
    setYearFrom(typeof f.yearFrom === "number" ? String(f.yearFrom) : "");
    setYearTo(typeof f.yearTo === "number" ? String(f.yearTo) : "");
    setVenues(Array.isArray(f.venues) ? (f.venues as string[]).join(", ") : "");
    setAuthors(Array.isArray(f.authors) ? (f.authors as string[]).join(", ") : "");
  }

  async function aiExpand() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/expand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const json = await res.json();
      if (!json?.ok) {
        const code = json?.error || "ai_failed";
        const message = json?.message || code;
        if (code === "llm_not_configured") {
          throw new Error("LLM 未配置：请在 web/.env 中设置 LLM_BASE_URL/LLM_API_KEY/LLM_MODEL");
        }
        throw new Error(message);
      }
      const draft = json?.result?.queryDraft ?? "";
      setAiDraft(draft);
      applyFiltersFromAi(json?.result?.filters);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "unknown_error";
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  }

  function useAiDraft() {
    if (!aiDraft.trim()) return;
    setQ(aiDraft.trim());
  }

  async function refreshNotifications() {
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      const json = await res.json();
      setNotifs(json.notifications ?? []);
    } finally {
      setNotifLoading(false);
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    await refreshNotifications();
  }

  async function ensureProject() {
    if (projectId) return projectId;
    const res = await fetch("/api/me");
    const json = await res.json();
    const first = json?.projects?.[0]?.id ?? null;
    setProjectId(first);
    return first;
  }

  async function saveSearch() {
    setSaving(true);
    setSaveError(null);
    setSaveOk(null);
    try {
      const pid = await ensureProject();
      if (!pid) throw new Error("no_project");
      const name = q.length > 60 ? `${q.slice(0, 57)}...` : q;
      const filters = buildFilters();
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: pid, name, query: q, schedule: "DAILY", filters }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "save_failed");
      setSaveOk("已保存（DAILY）");
      // 3秒后清除成功提示
      setTimeout(() => setSaveOk(null), 3000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "unknown_error";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const filters = buildFilters();
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, perSource, filters }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "search_failed");
      setWorks(json.works ?? []);
      setStats(json.stats ?? null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "unknown_error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20 dark:bg-black/20">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        
        {/* Header Section */}
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
            ScholarSearch <span className="text-blue-600 dark:text-blue-400">V1</span>
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            聚合检索 OpenAlex + Crossref + arXiv，让科研更高效。
          </p>
        </div>

        {/* Search Section */}
        <div className="sticky top-20 z-40 mb-6">
           <SearchInput
             value={q}
             onChange={setQ}
             onSearch={runSearch}
             loading={loading}
             onSave={saveSearch}
             saving={saving}
             canSave={!!q.trim()}
             stats={stats}
             total={total}
           />
           {(saveError || saveOk || error) && (
             <div className="absolute top-full left-0 right-0 mt-2 flex justify-center">
                {error && <div className="rounded-full bg-red-100 px-4 py-1 text-xs font-medium text-red-600 shadow-sm">{error}</div>}
                {saveError && <div className="rounded-full bg-red-100 px-4 py-1 text-xs font-medium text-red-600 shadow-sm">{saveError}</div>}
                {saveOk && <div className="rounded-full bg-emerald-100 px-4 py-1 text-xs font-medium text-emerald-600 shadow-sm">{saveOk}</div>}
             </div>
           )}
        </div>

        {/* Filters & AI */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SearchFilters
              sourceOpenAlex={sourceOpenAlex}
              setSourceOpenAlex={setSourceOpenAlex}
              sourceCrossref={sourceCrossref}
              setSourceCrossref={setSourceCrossref}
              sourceArxiv={sourceArxiv}
              setSourceArxiv={setSourceArxiv}
              yearFrom={yearFrom}
              setYearFrom={setYearFrom}
              yearTo={yearTo}
              setYearTo={setYearTo}
              venues={venues}
              setVenues={setVenues}
              authors={authors}
              setAuthors={setAuthors}
              perSource={perSource}
              setPerSource={setPerSource}
            />
             <AiAssistant
              aiLoading={aiLoading}
              aiError={aiError}
              aiDraft={aiDraft}
              setAiDraft={setAiDraft}
              aiExpand={aiExpand}
              useAiDraft={useAiDraft}
              q={q}
            />

            {/* Results List */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                 <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">检索结果</h2>
                 {preview.length > 0 && (
                   <span className="text-xs text-zinc-500">显示前 {preview.length} 条</span>
                 )}
               </div>
               
              {loading ? (
                // Simple Skeleton Loading
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-white/5" />
                  ))}
                </div>
              ) : preview.length > 0 ? (
                preview.map((w, idx) => (
                  <SearchResultCard
                    key={`${w.doi ?? w.arxivId ?? w.title}-${idx}`}
                    work={w}
                  />
                ))
              ) : (
                 !loading && stats && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                        <p>未找到相关结果</p>
                        <p className="text-xs">请尝试放宽筛选条件或更换关键词</p>
                    </div>
                 )
              )}
            </div>
          </div>

          {/* Sidebar: Notifications */}
          <div className="lg:col-span-1">
             <div className="sticky top-40">
                <NotificationPanel
                  notifs={notifs}
                  loading={notifLoading}
                  refresh={refreshNotifications}
                  markRead={markRead}
                />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
