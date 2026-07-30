import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  Search, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown,
  Trash2, Download, Plus, RefreshCw, Loader2, CheckSquare, Square,
  X, Filter,
} from "lucide-react";
import { crudList, crudBulkDelete } from "@/lib/admin/crud.functions";

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  searchable?: boolean;
  width?: string;
}

interface DataTableProps {
  table: string;
  columns: Column[];
  searchColumns?: string[];
  filters?: Record<string, any>;
  title?: string;
  pageSize?: number;
  onEdit?: (row: any) => void;
  onCreate?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  extraActions?: (row: any) => React.ReactNode;
  rowKey?: string;
}

export default function DataTable({
  table,
  columns,
  searchColumns = [],
  filters: externalFilters = {},
  title,
  pageSize = 20,
  onEdit,
  onCreate,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  extraActions,
  rowKey = "id",
}: DataTableProps) {
  const fnList = useServerFn(crudList);
  const fnBulkDelete = useServerFn(crudBulkDelete);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDesc, setOrderDesc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<Record<string, any>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fnList({
        data: {
          table,
          page,
          pageSize,
          search: search || undefined,
          searchColumns: searchColumns.length > 0 ? searchColumns : undefined,
          orderBy,
          orderDesc,
          filters: { ...externalFilters, ...localFilters },
        },
      });
      setRows(r.rows);
      setTotal(r.total);
      setTotalPages(r.totalPages);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, page, pageSize, search, orderBy, orderDesc, JSON.stringify(externalFilters), JSON.stringify(localFilters), JSON.stringify(searchColumns)]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Reset página quando busca muda
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, localFilters, externalFilters]);

  function toggleSort(col: string) {
    if (orderBy === col) {
      if (!orderDesc) setOrderDesc(true);
      else { setOrderBy(undefined); setOrderDesc(false); }
    } else {
      setOrderBy(col);
      setOrderDesc(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r[rowKey])));
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Excluir ${selected.size} registro(s)? Esta ação não pode ser desfeita.`)) return;
    try {
      const r = await fnBulkDelete({ data: { table, ids: Array.from(selected) } });
      toast.success(`${r.deleted} registro(s) excluído(s).`);
      setSelected(new Set());
      await fetchData();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  function exportCSV() {
    if (rows.length === 0) return;
    const headers = columns.map((c) => c.label);
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        columns
          .map((c) => {
            const val = c.render ? "" : (row[c.key] ?? "");
            const str = typeof val === "object" ? JSON.stringify(val) : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado.");
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const allSelected = selected.size > 0 && selected.size === rows.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {title && <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2>}
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {total} {total === 1 ? "registro" : "registros"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && onCreate && (
            <button
              onClick={onCreate}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" /> Novo
            </button>
          )}
          <button
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button
            onClick={() => void fetchData()}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
            title="Atualizar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Busca + Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {searchColumns.length > 0 && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        )}
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
        </button>
      </div>

      {/* Filtros expansíveis */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800/50">
              {columns.filter((c) => c.searchable).map((col) => (
                <input
                  key={col.key}
                  value={localFilters[col.key] || ""}
                  onChange={(e) => setLocalFilters((f) => ({ ...f, [col.key]: e.target.value }))}
                  placeholder={col.label}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
              ))}
              <button
                onClick={() => setLocalFilters({})}
                className="rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"
              >
                Limpar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ações em lote */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-950/30"
          >
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {selected.size} selecionado(s)
            </span>
            <div className="flex gap-2">
              {canDelete && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              )}
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
              >
                Limpar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-white/5">
            <tr>
              <th className="px-3 py-2.5 w-10">
                <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {allSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                </button>
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${col.width || ""}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {col.label}
                      {orderBy === col.key ? (
                        orderDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
              {(canEdit || canDelete || extraActions) && (
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-12 text-center text-sm text-slate-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = row[rowKey];
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={`border-t border-slate-100 dark:border-white/5 ${isSelected ? "bg-blue-50/50 dark:bg-blue-950/20" : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"}`}
                  >
                    <td className="px-3 py-2.5">
                      <button onClick={() => toggleSelect(id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-2.5 text-slate-700 dark:text-slate-200">
                        {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {extraActions && extraActions(row)}
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="rounded p-1.5 text-slate-400 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-white/10"
                            title="Editar"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Mostrando {from}–{to} de {total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5"
            >
              <ChevronsUpDown className="h-3.5 w-3.5 rotate-90" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/5"
            >
              <ChevronsUpDown className="h-3.5 w-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
