"use client";

import { useMemo, useState } from "react";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
  sortable?: boolean;
  value?: (row: T) => number | string; // valor usado para ordenação
  render: (row: T, index: number) => React.ReactNode;
};

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  emptyLabel?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  footer?: React.ReactNode;
  searchPlaceholder?: string;
  searchFields?: (row: T) => string[];
  headerAction?: React.ReactNode;
  bodyClassName?: string;
}

export function SortableTable<T>({
  columns,
  rows,
  emptyLabel = "Nenhum registro para exibir",
  initialSort,
  footer,
  searchPlaceholder,
  searchFields,
  headerAction,
  bodyClassName,
}: Props<T>) {
  const [sortKey, setSortKey] = useState(initialSort?.key ?? "");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSort?.dir ?? "desc");
  const [query, setQuery] = useState("");

  const activeCol = columns.find((c) => c.key === sortKey);

  const filtered = useMemo(() => {
    if (!searchFields || !query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => searchFields(r).some((v) => v.toLowerCase().includes(q)));
  }, [rows, query, searchFields]);

  const sorted = useMemo(() => {
    if (!activeCol?.value) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = activeCol.value!(a);
      const vb = activeCol.value!(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
  }, [filtered, activeCol, sortDir]);

  const toggle = (key: string, sortable?: boolean) => {
    if (!sortable) return;
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  return (
    <div>
      {(searchFields || headerAction) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
          {searchFields && (
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="text-sm text-slate-400">🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder ?? "Buscar..."}
                className="w-full bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
                aria-label="Buscar na tabela"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Limpar busca">✕</button>
              )}
            </div>
          )}
          {headerAction}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full bg-white text-[11px]">
          <thead>
            <tr className="bg-[#12315e] text-white text-[10px] uppercase">
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggle(c.key, c.sortable)}
                  className={`px-3 py-2 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${c.sortable ? "cursor-pointer select-none hover:bg-[#1a3a72]" : ""} ${c.className ?? ""}`}
                  aria-sort={sortKey === c.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable && (
                      <span className={`text-[9px] ${sortKey === c.key ? "text-sky-200" : "text-white/40"}`}>
                        {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={bodyClassName}>
            {sorted.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">{emptyLabel}</td></tr>
            )}
            {sorted.map((row, i) => (
              <tr key={i} className={`border-b border-slate-100 transition hover:bg-blue-50/50 ${i % 2 ? "bg-slate-50/60" : ""}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}>
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
            {footer}
          </tbody>
        </table>
      </div>
    </div>
  );
}
