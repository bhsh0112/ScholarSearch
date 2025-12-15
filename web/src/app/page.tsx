"use client";

import { useMemo, useState } from "react";

type Work = {
  title: string;
  abstract?: string | null;
  year?: number | null;
  venue?: string | null;
  url?: string | null;
  doi?: string | null;
  arxivId?: string | null;
  openalexId?: string | null;
  sources: Array<{ source: string; sourceId: string }>;
};

export default function Home() {
  const [q, setQ] = useState("retrieval augmented generation survey");
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
  const [works, setWorks] = useState<Work[]>([]);
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
  const preview = useMemo(() => works.slice(0, 50), [works]);

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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">ScholarSearch V1</h1>
            <p className="mt-2 text-sm text-zinc-600">
              聚合检索：OpenAlex + Crossref + arXiv（含基础去重）。
            </p>
          </div>
          <div className="text-right text-sm text-zinc-600">
            <div>结果：{total}</div>
            <div>状态：{loading ? "检索中…" : "就绪"}</div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-5">
              <label className="text-xs font-medium text-zinc-700">查询</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="例如：graph neural network explainability survey"
              />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-zinc-700">每源数量</label>
              <input
                value={perSource}
                onChange={(e) => setPerSource(Number(e.target.value || 0))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                type="number"
                min={1}
                max={50}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-zinc-700">来源</label>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-700">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={sourceOpenAlex} onChange={(e) => setSourceOpenAlex(e.target.checked)} />
                  OpenAlex
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={sourceCrossref} onChange={(e) => setSourceCrossref(e.target.checked)} />
                  Crossref
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={sourceArxiv} onChange={(e) => setSourceArxiv(e.target.checked)} />
                  arXiv
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-zinc-700">年份区间</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="from"
                />
                <input
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="to"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-zinc-700">期刊/会议（逗号分隔）</label>
              <input
                value={venues}
                onChange={(e) => setVenues(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="例如：neurips, icml, sigir"
              />
              <label className="mt-2 block text-xs font-medium text-zinc-700">作者（逗号分隔）</label>
              <input
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="例如：kenton lee, jimmy lin"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={runSearch}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              运行检索
            </button>
            <button
              onClick={saveSearch}
              disabled={saving || !q.trim()}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-60"
            >
              保存检索
            </button>
            {error ? <div className="text-sm text-red-600">错误：{error}</div> : null}
          {saveError ? <div className="text-sm text-red-600">保存失败：{saveError}</div> : null}
          {saveOk ? <div className="text-sm text-emerald-700">{saveOk}</div> : null}
            {stats ? (
              <div className="ml-auto text-xs text-zinc-500">
                {JSON.stringify(stats.counts)} | {stats.ms}ms
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {preview.map((w, idx) => (
            <div key={`${w.doi ?? w.arxivId ?? w.title}-${idx}`} className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold leading-6">{w.title}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {w.year ?? "n/a"} · {w.venue ?? "n/a"} · 来源：{w.sources.map((s) => s.source).join("+")}
                  </div>
                </div>
                {w.url ? (
                  <a className="text-xs font-medium text-zinc-900 underline" href={w.url} target="_blank" rel="noreferrer">
                    打开
                  </a>
                ) : null}
              </div>
              {w.abstract ? (
                <p className="mt-3 line-clamp-4 text-sm text-zinc-700">{w.abstract}</p>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">暂无摘要</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">站内通知</h2>
            <button
              onClick={refreshNotifications}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium"
            >
              {notifLoading ? "刷新中…" : "刷新"}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {notifs.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500">
                暂无通知（先保存检索，然后运行一次追踪任务即可生成）。
              </div>
            ) : null}
            {notifs.map((n) => (
              <div key={n.id} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">
                      {n.title} {n.readAt ? <span className="text-xs text-zinc-400">(已读)</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.readAt ? (
                    <button
                      onClick={() => markRead(n.id)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      标记已读
                    </button>
                  ) : null}
                </div>
                {n.body ? <pre className="mt-3 whitespace-pre-wrap text-xs text-zinc-700">{n.body}</pre> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
