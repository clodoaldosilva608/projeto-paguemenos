import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import DataTable, { type Column } from "@/components/admin/DataTable";

export const Route = createFileRoute("/admin/auditoria")({
  component: AdminAuditoria,
});

interface AuditLog {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: any;
  after: any;
  metadata: any;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  bulk_delete: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

const columns: Column<AuditLog>[] = [
  {
    key: "created_at",
    label: "Data",
    sortable: true,
    render: (r) =>
      r.created_at
        ? new Date(r.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
  },
  {
    key: "actor_email",
    label: "Ator",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          {r.actor_email || "—"}
        </p>
        {r.actor_user_id && (
          <p className="text-[10px] text-slate-400">{String(r.actor_user_id).slice(0, 8)}...</p>
        )}
      </div>
    ),
  },
  {
    key: "action",
    label: "Ação",
    sortable: true,
    searchable: true,
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          ACTION_COLORS[r.action || ""] ||
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {r.action || "—"}
      </span>
    ),
  },
  {
    key: "entity",
    label: "Entidade",
    sortable: true,
    searchable: true,
    render: (r) => (
      <span className="font-mono text-xs text-slate-700 dark:text-slate-200">{r.entity || "—"}</span>
    ),
  },
  {
    key: "entity_id",
    label: "Entity ID",
    render: (r) =>
      r.entity_id ? (
        <span className="font-mono text-[10px] text-slate-500">{String(r.entity_id).slice(0, 16)}</span>
      ) : (
        "—"
      ),
  },
];

const ACTION_FILTERS = [
  { value: "", label: "Todas" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "bulk_delete", label: "Bulk Delete" },
];

function AdminAuditoria() {
  const [actionFilter, setActionFilter] = useState<string>("");

  const filters = actionFilter ? { action: actionFilter } : {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Auditoria</h1>
        <p className="text-sm text-slate-500">
          Log de auditoria — histórico de criações, atualizações e exclusões (somente leitura).
        </p>
      </div>

      {/* Filtros rápidos por ação */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Ação:
        </span>
        {ACTION_FILTERS.map((af) => (
          <button
            key={af.value || "all"}
            onClick={() => setActionFilter(af.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              actionFilter === af.value
                ? "bg-blue-600 text-white shadow"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            }`}
          >
            {af.label}
          </button>
        ))}
      </div>

      <DataTable
        table="audit_log"
        columns={columns}
        searchColumns={["actor_email", "entity", "action"]}
        filters={filters}
        title="Audit Log"
        canCreate={false}
        canEdit={false}
        canDelete={false}
        rowKey="id"
      />
    </div>
  );
}
