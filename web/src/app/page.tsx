"use client";

import { useEffect, useMemo, useState } from "react";
import { AggregatedWork } from "@/lib/sources/types";
import { SearchInput } from "@/components/SearchInput";
import { SearchFilters } from "@/components/SearchFilters";
import { SearchResultCard } from "@/components/SearchResultCard";
import { AiAssistant } from "@/components/AiAssistant";
import { NotificationPanel } from "@/components/NotificationPanel";
import { SaveTopicModal, type TopicConfig } from "@/components/SaveTopicModal";
import { SavedTopicsPanel, type SavedTopic } from "@/components/SavedTopicsPanel";

type HomePersistedState = {
  /** 版本号：避免后续字段变更导致解析失败 */
  v: 1;
  savedAt: number;
  q: string;
  perSource: number;
  sourceOpenAlex: boolean;
  sourceArxiv: boolean;
  sourceSemanticScholar: boolean;
  sourceDblp: boolean;
  sourcePubmed: boolean;
  yearFrom: string;
  yearTo: string;
  venues: string;
  authors: string;
  works: AggregatedWork[];
  stats: null | { counts?: unknown; ms?: number; errors?: unknown; filters?: unknown };
};

const HOME_STATE_KEY = "ss_home_state_v1";

export default function Home() {
  const [q, setQ] = useState("retrieval augmented generation survey");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string>("");
  const [perSource, setPerSource] = useState(15);
  const [sourceOpenAlex, setSourceOpenAlex] = useState(true);
  const [sourceArxiv, setSourceArxiv] = useState(true);
  const [sourceSemanticScholar, setSourceSemanticScholar] = useState(true);
  const [sourceDblp, setSourceDblp] = useState(true);
  const [sourcePubmed, setSourcePubmed] = useState(true);
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
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [topicConfig, setTopicConfig] = useState<TopicConfig>({
    // 默认值尽量与 FREE 计划兼容，避免用户不改配置直接保存时报 402。
    // 付费用户可在弹窗里改成 DAILY / 更高 TopN。
    schedule: "WEEKLY",
    pushStrategy: "HYBRID",
    pushTopN: 5,
    noiseLevel: "STANDARD",
  });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<
    Array<{ id: string; title: string; body: string | null; data?: unknown; createdAt: string; readAt: string | null }>
  >([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [topics, setTopics] = useState<SavedTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const total = works.length;
  const preview = useMemo(() => works.slice(0, 100), [works]);

  /**
   * dev 环境下可能发生 Fast Refresh/整页刷新（例如数据库文件写入触发 watcher、HMR 断连等）。
   * 这里将搜索状态写入 sessionStorage，并在页面初始化时自动恢复，避免“刷新丢结果”。
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(HOME_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<HomePersistedState> | null;
      if (!parsed || parsed.v !== 1 || typeof parsed.savedAt !== "number") return;
      // 24 小时过期，避免长期脏数据
      if (Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) return;

      if (typeof parsed.q === "string") setQ(parsed.q);
      if (typeof parsed.perSource === "number") setPerSource(parsed.perSource);
      if (typeof parsed.sourceOpenAlex === "boolean") setSourceOpenAlex(parsed.sourceOpenAlex);
      if (typeof parsed.sourceArxiv === "boolean") setSourceArxiv(parsed.sourceArxiv);
      if (typeof parsed.sourceSemanticScholar === "boolean") setSourceSemanticScholar(parsed.sourceSemanticScholar);
      if (typeof parsed.sourceDblp === "boolean") setSourceDblp(parsed.sourceDblp);
      if (typeof parsed.sourcePubmed === "boolean") setSourcePubmed(parsed.sourcePubmed);
      if (typeof parsed.yearFrom === "string") setYearFrom(parsed.yearFrom);
      if (typeof parsed.yearTo === "string") setYearTo(parsed.yearTo);
      if (typeof parsed.venues === "string") setVenues(parsed.venues);
      if (typeof parsed.authors === "string") setAuthors(parsed.authors);
      if (Array.isArray(parsed.works)) setWorks(parsed.works as AggregatedWork[]);
      if (parsed.stats === null || typeof parsed.stats === "object") setStats(parsed.stats as HomePersistedState["stats"]);
    } catch {
      // ignore
    }
    // 仅初始化时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // loading 期间不覆盖已保存状态，避免中间态写入
    if (loading) return;
    const state: HomePersistedState = {
      v: 1,
      savedAt: Date.now(),
      q,
      perSource,
      sourceOpenAlex,
      sourceArxiv,
      sourceSemanticScholar,
      sourceDblp,
      sourcePubmed,
      yearFrom,
      yearTo,
      venues,
      authors,
      works,
      stats,
    };
    try {
      window.sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage 容量不足等情况直接忽略
    }
  }, [
    q,
    perSource,
    sourceOpenAlex,
    sourceArxiv,
    sourceSemanticScholar,
    sourceDblp,
    sourcePubmed,
    yearFrom,
    yearTo,
    venues,
    authors,
    works,
    stats,
    loading,
  ]);

  function buildFilters() {
    const sources: string[] = [];
    if (sourceOpenAlex) sources.push("OPENALEX");
    if (sourceArxiv) sources.push("ARXIV");
    if (sourceSemanticScholar) sources.push("SEMANTIC_SCHOLAR");
    if (sourceDblp) sources.push("DBLP");
    if (sourcePubmed) sources.push("PUBMED");

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
    setSourceArxiv(sources.length === 0 ? true : sources.includes("ARXIV"));
    setSourceSemanticScholar(sources.length === 0 ? true : sources.includes("SEMANTIC_SCHOLAR"));
    setSourceDblp(sources.length === 0 ? true : sources.includes("DBLP"));
    setSourcePubmed(sources.length === 0 ? true : sources.includes("PUBMED"));
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

  async function refreshTopics() {
    setTopicsLoading(true);
    try {
      const res = await fetch("/api/saved-searches");
      const json = await res.json();
      setTopics(json.savedSearches ?? []);
    } finally {
      setTopicsLoading(false);
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
    if (!res.ok) {
      throw new Error("unauthorized");
    }
    const first = json?.projects?.[0]?.id ?? null;
    setProjectId(first);
    return first;
  }

  function openSaveModal() {
    setSaveError(null);
    setSaveOk(null);
    setSaveModalOpen(true);
  }

  async function saveSearchWithConfig(config: TopicConfig) {
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
        body: JSON.stringify({
          projectId: pid,
          name,
          query: q,
          schedule: config.schedule,
          pushStrategy: config.pushStrategy,
          pushTopN: config.pushTopN,
          noiseLevel: config.noiseLevel,
          filters,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          typeof json?.message === "string"
            ? json.message
            : typeof json?.error === "string"
              ? json.error
              : "save_failed";
        throw new Error(msg);
      }
      setTopicConfig(config);
      setSaveOk(`已保存（${config.schedule} / ${config.pushStrategy} / Top ${config.pushTopN}）`);
      // 3秒后清除成功提示
      setTimeout(() => setSaveOk(null), 3000);
      setSaveModalOpen(false);
      await refreshTopics();
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
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
            ScholarSearch <span className="text-blue-600 dark:text-blue-400">V1</span>
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            聚合检索 OpenAlex + Crossref + arXiv，让科研更高效。
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            如果保存主题/推送等功能不可用，请先{" "}
            <a className="font-semibold text-blue-600 hover:underline dark:text-blue-400" href="/login">
              登录
            </a>
            。
          </p>
        </div>

        <div className="sticky top-20 z-40 mb-6">
          <SearchInput
            value={q}
            onChange={setQ}
            onSearch={runSearch}
            loading={loading}
            onSave={openSaveModal}
            saving={saving}
            canSave={!!q.trim()}
            stats={stats}
            total={total}
          />
          {(saveError || saveOk || error) && (
            <div className="absolute top-full left-0 right-0 mt-2 flex justify-center">
              {error && (
                <div className="rounded-full bg-red-100 px-4 py-1 text-xs font-medium text-red-600 shadow-sm">
                  {error}
                </div>
              )}
              {saveError && (
                <div className="rounded-full bg-red-100 px-4 py-1 text-xs font-medium text-red-600 shadow-sm">
                  {saveError}
                </div>
              )}
              {saveOk && (
                <div className="rounded-full bg-emerald-100 px-4 py-1 text-xs font-medium text-emerald-600 shadow-sm">
                  {saveOk}
                </div>
              )}
            </div>
          )}
        </div>

        <SaveTopicModal
          open={saveModalOpen}
          queryPreview={q}
          defaultName={q.length > 60 ? `${q.slice(0, 57)}...` : q}
          initial={topicConfig}
          saving={saving}
          onClose={() => setSaveModalOpen(false)}
          onConfirm={(cfg) => saveSearchWithConfig(cfg)}
        />

        <div className="relative">
          {/* 右侧通知栏：仅在超宽屏(2xl)把它放到主容器右侧的空白区域，不影响内容右边界对齐 */}
          <div className="hidden 2xl:block">
            <div className="absolute right-0 top-0 w-72 translate-x-[calc(100%+1.5rem)]">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-auto rounded-2xl">
                <NotificationPanel
                  notifs={notifs}
                  loading={notifLoading}
                  refresh={refreshNotifications}
                  markRead={markRead}
                />
              </div>
            </div>
          </div>

          <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <SearchFilters
                sourceOpenAlex={sourceOpenAlex}
                setSourceOpenAlex={setSourceOpenAlex}
                sourceArxiv={sourceArxiv}
                setSourceArxiv={setSourceArxiv}
                sourceSemanticScholar={sourceSemanticScholar}
                setSourceSemanticScholar={setSourceSemanticScholar}
                sourceDblp={sourceDblp}
                setSourceDblp={setSourceDblp}
                sourcePubmed={sourcePubmed}
                setSourcePubmed={setSourcePubmed}
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
            </div>
            <div className="lg:col-span-4">
              <div className="space-y-6">
                <AiAssistant
                  aiLoading={aiLoading}
                  aiError={aiError}
                  aiDraft={aiDraft}
                  setAiDraft={setAiDraft}
                  aiExpand={aiExpand}
                  useAiDraft={useAiDraft}
                  q={q}
                />
                <SavedTopicsPanel items={topics} loading={topicsLoading} refresh={refreshTopics} />
              </div>
            </div>
            <div className="lg:col-span-2 2xl:hidden">
              <NotificationPanel
                notifs={notifs}
                loading={notifLoading}
                refresh={refreshNotifications}
                markRead={markRead}
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">检索结果</h2>
              {preview.length > 0 ? <span className="text-xs text-zinc-500">显示前 {preview.length} 条</span> : null}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-44 w-full animate-pulse rounded-2xl bg-zinc-200 dark:bg-white/5" />
                ))}
              </div>
            ) : preview.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {preview.map((w, idx) => (
                  <SearchResultCard key={`${w.doi ?? w.arxivId ?? w.title}-${idx}`} work={w} />
                ))}
              </div>
            ) : !loading && stats ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                <p>未找到相关结果</p>
                <p className="text-xs">请尝试放宽筛选条件或更换关键词</p>
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
