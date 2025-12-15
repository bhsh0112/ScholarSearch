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
  
  const SourceTag = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
        checked
          ? "bg-zinc-900 text-white shadow-md shadow-zinc-500/20 dark:bg-white dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
      }`}
    >
      <div className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"}`} />
      {label}
    </button>
  );

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="flex flex-col gap-6">
        
        {/* Sources Row */}
        <div>
           <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            数据来源
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <SourceTag label="OpenAlex" checked={sourceOpenAlex} onChange={setSourceOpenAlex} />
            <SourceTag label="Crossref" checked={sourceCrossref} onChange={setSourceCrossref} />
            <SourceTag label="arXiv" checked={sourceArxiv} onChange={setSourceArxiv} />
          </div>
        </div>

        <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800" />

        {/* Filters Grid */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
           {/* Year & Count */}
           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  年份范围 (Year)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                    className="w-20 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/20 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-800"
                    placeholder="From"
                  />
                  <span className="text-zinc-300">-</span>
                  <input
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                     className="w-20 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/20 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-800"
                    placeholder="To"
                  />
                </div>
              </div>
               <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  每源数量 (Limit)
                </label>
                 <input
                  value={perSource}
                  onChange={(e) => setPerSource(Number(e.target.value || 0))}
                  className="mt-2 w-20 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/20 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-800"
                  type="number"
                  min={1}
                  max={50}
                />
              </div>
           </div>

           {/* Text Filters */}
           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  期刊/会议 (Venues)
                </label>
                <input
                  value={venues}
                  onChange={(e) => setVenues(e.target.value)}
                  className="mt-2 w-full rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/20 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-800"
                  placeholder="e.g. neurips, icml"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  特定作者 (Authors)
                </label>
                <input
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                   className="mt-2 w-full rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 focus:ring-2 focus:ring-blue-500/20 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-zinc-800"
                  placeholder="e.g. yoshua bengio"
                />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
