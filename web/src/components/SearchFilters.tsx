import React from "react";

interface SearchFiltersProps {
  sourceOpenAlex: boolean;
  setSourceOpenAlex: (v: boolean) => void;
  sourceCrossref: boolean;
  setSourceCrossref: (v: boolean) => void;
  sourceArxiv: boolean;
  setSourceArxiv: (v: boolean) => void;
  yearFrom: string;
  setYearFrom: (v: string) => void;
  yearTo: string;
  setYearTo: (v: string) => void;
  venues: string;
  setVenues: (v: string) => void;
  authors: string;
  setAuthors: (v: string) => void;
  perSource: number;
  setPerSource: (v: number) => void;
}

export function SearchFilters({
  sourceOpenAlex,
  setSourceOpenAlex,
  sourceCrossref,
  setSourceCrossref,
  sourceArxiv,
  setSourceArxiv,
  yearFrom,
  setYearFrom,
  yearTo,
  setYearTo,
  venues,
  setVenues,
  authors,
  setAuthors,
  perSource,
  setPerSource,
}: SearchFiltersProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/50 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Sources */}
        <div className="md:col-span-12 lg:col-span-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            数据来源
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "OpenAlex", checked: sourceOpenAlex, onChange: setSourceOpenAlex },
              { label: "Crossref", checked: sourceCrossref, onChange: setSourceCrossref },
              { label: "arXiv", checked: sourceArxiv, onChange: setSourceArxiv },
            ].map((source) => (
              <label
                key={source.label}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                  source.checked
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-blue-600"
                  checked={source.checked}
                  onChange={(e) => source.onChange(e.target.checked)}
                />
                {source.label}
              </label>
            ))}
          </div>
        </div>

        {/* Years & PerSource */}
        <div className="md:col-span-6 lg:col-span-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                年份范围
              </label>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-500/50"
                  placeholder="2020"
                />
                <span className="text-zinc-400">-</span>
                <input
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-500/50"
                  placeholder="2025"
                />
              </div>
            </div>
             <div>
               <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                每源数量
              </label>
              <div className="mt-3">
                 <input
                  value={perSource}
                  onChange={(e) => setPerSource(Number(e.target.value || 0))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-500/50"
                  type="number"
                  min={1}
                  max={50}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="md:col-span-6 lg:col-span-4 space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              期刊/会议
            </label>
            <input
              value={venues}
              onChange={(e) => setVenues(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-500/50"
              placeholder="e.g. neurips, icml (可选)"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              特定作者
            </label>
            <input
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:focus:border-blue-500/50"
              placeholder="e.g. yoshua bengio (可选)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

