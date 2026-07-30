import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/quick-links")({
  component: AdminQuickLinks,
});

interface QuickLink {
  id: string;
  label: string;
  url: string;
  icone: string | null;
  cor: string | null;
  ordem: number;
  created_at: string;
}

const columns: Column<QuickLink>[] = [
  {
    key: "label",
    label: "Label",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div className="flex items-center gap-2">
        {r.cor && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: r.cor }}
          />
        )}
        <span className="font-semibold text-slate-800 dark:text-slate-100">{r.label}</span>
      </div>
    ),
  },
  {
    key: "url",
    label: "URL",
    render: (r) => (
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-mono text-blue-600 hover:underline dark:text-blue-400"
      >
        {r.url}
      </a>
    ),
  },
  {
    key: "icone",
    label: "Ícone",
    render: (r) =>
      r.icone ? (
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {r.icone}
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "ordem",
    label: "Ordem",
    sortable: true,
    render: (r) => (
      <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">{r.ordem ?? 0}</span>
    ),
  },
];

const fields: FormField[] = [
  { key: "label", label: "Label", type: "text", required: true, placeholder: "Ex: Relatórios" },
  { key: "url", label: "URL", type: "text", required: true, placeholder: "https://..." },
  { key: "icone", label: "Ícone", type: "text", placeholder: "Ex: BarChart3 (lucide)" },
  { key: "cor", label: "Cor", type: "text", placeholder: "Ex: #3b82f6" },
  { key: "ordem", label: "Ordem", type: "number", defaultValue: 0, placeholder: "0" },
];

function AdminQuickLinks() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<QuickLink | null>(null);
  const [deleteRow, setDeleteRow] = useState<QuickLink | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: QuickLink) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "quick_links", id: deleteRow.id } });
      toast.success("Quick link excluído.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Quick Links</h1>
        <p className="text-sm text-slate-500">
          Gerenciar atalhos rápidos exibidos no painel dos usuários.
        </p>
      </div>

      <DataTable
        table="quick_links"
        columns={columns}
        searchColumns={["label"]}
        title="Quick Links"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="quick_links"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Quick Link" : "Criar Quick Link"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Quick Link"
        message={`Excluir permanentemente "${deleteRow?.label}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
