import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/integracoes")({
  component: AdminIntegracoes,
});

interface Integration {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  escopo: string;
  filial_id: string | null;
  sync_enabled: boolean;
  sync_interval_min: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  ativo: boolean;
  criado_em: string;
}

const columns: Column<Integration>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{r.nome}</p>
        <p className="text-[10px] text-slate-400">{r.tipo}</p>
      </div>
    ),
  },
  {
    key: "tipo",
    label: "Tipo",
    sortable: true,
    render: (r) => (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {r.tipo || "—"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          r.status === "ativo" || r.status === "conectado"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : r.status === "pendente"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        }`}
      >
        {r.status || "—"}
      </span>
    ),
  },
  {
    key: "escopo",
    label: "Escopo",
    render: (r) => r.escopo || "—",
  },
  {
    key: "sync_enabled",
    label: "Sync",
    render: (r) => (
      <span className={r.sync_enabled ? "text-emerald-600" : "text-slate-400"}>
        {r.sync_enabled ? "✓ Ativo" : "✗ Inativo"}
      </span>
    ),
  },
  {
    key: "ativo",
    label: "Ativo",
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          r.ativo
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        }`}
      >
        {r.ativo ? "Sim" : "Não"}
      </span>
    ),
  },
  {
    key: "last_sync_at",
    label: "Última Sync",
    render: (r) =>
      r.last_sync_at ? new Date(r.last_sync_at).toLocaleString("pt-BR") : "Nunca",
  },
];

const fields: FormField[] = [
  { key: "nome", label: "Nome", type: "text", required: true, placeholder: "Google Sheets — Vendas" },
  {
    key: "tipo",
    label: "Tipo",
    type: "select",
    required: true,
    options: [
      { value: "google_sheets", label: "Google Sheets" },
      { value: "powerbi", label: "Power BI" },
      { value: "webhook", label: "Webhook" },
      { value: "api", label: "API Externa" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "pendente", label: "Pendente" },
      { value: "conectado", label: "Conectado" },
      { value: "ativo", label: "Ativo" },
      { value: "erro", label: "Erro" },
    ],
    defaultValue: "pendente",
  },
  {
    key: "escopo",
    label: "Escopo",
    type: "select",
    options: [
      { value: "empresa", label: "Empresa" },
      { value: "filial", label: "Filial" },
      { value: "usuario", label: "Usuário" },
    ],
    defaultValue: "empresa",
  },
  { key: "filial_id", label: "Filial ID", type: "text", placeholder: "7537 (se escopo=filial)" },
  { key: "sync_enabled", label: "Sincronização Ativa", type: "checkbox", defaultValue: false },
  { key: "sync_interval_min", label: "Intervalo Sync (min)", type: "number", defaultValue: 60, min: 1, max: 1440 },
  { key: "config", label: "Configuração (JSON)", type: "json", placeholder: '{"key": "value"}' },
  { key: "ativo", label: "Ativo", type: "checkbox", defaultValue: true },
];

function AdminIntegracoes() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Integration | null>(null);
  const [deleteRow, setDeleteRow] = useState<Integration | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Integration) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "integrations", id: deleteRow.id } });
      toast.success("Integração excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Integrações</h1>
        <p className="text-sm text-slate-500">
          Gerenciar integrações com Google Sheets, Power BI, webhooks e APIs externas.
        </p>
      </div>

      <DataTable
        table="integrations"
        columns={columns}
        searchColumns={["nome", "tipo"]}
        title="Integrações"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="integrations"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Integração" : "Criar Integração"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Integração"
        message={`Excluir "${deleteRow?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
