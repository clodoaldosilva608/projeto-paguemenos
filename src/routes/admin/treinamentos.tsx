import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/treinamentos")({
  component: AdminTreinamentos,
});

interface Treinamento {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  video_url: string | null;
  ativo: boolean;
  created_at: string;
}

const columns: Column<Treinamento>[] = [
  {
    key: "titulo",
    label: "Título",
    sortable: true,
    searchable: true,
    render: (r) => (
      <span className="font-semibold text-slate-800 dark:text-slate-100">{r.titulo}</span>
    ),
  },
  {
    key: "categoria",
    label: "Categoria",
    render: (r) => (
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {r.categoria || "—"}
      </span>
    ),
  },
  {
    key: "ativo",
    label: "Status",
    sortable: true,
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          r.ativo
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        }`}
      >
        {r.ativo ? "Ativo" : "Inativo"}
      </span>
    ),
  },
];

const fields: FormField[] = [
  { key: "titulo", label: "Título", type: "text", required: true, placeholder: "Título do treinamento" },
  { key: "descricao", label: "Descrição", type: "textarea", placeholder: "Descrição do conteúdo" },
  { key: "categoria", label: "Categoria", type: "text", placeholder: "Ex: Vendas, Produto, etc" },
  { key: "video_url", label: "URL do Vídeo", type: "text", placeholder: "https://..." },
  { key: "ativo", label: "Ativo", type: "checkbox", defaultValue: true },
];

function AdminTreinamentos() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Treinamento | null>(null);
  const [deleteRow, setDeleteRow] = useState<Treinamento | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Treinamento) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "treinamentos", id: deleteRow.id } });
      toast.success("Treinamento excluído.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Treinamentos</h1>
        <p className="text-sm text-slate-500">
          Gerenciar conteúdos de treinamento e capacitação da equipe.
        </p>
      </div>

      <DataTable
        table="treinamentos"
        columns={columns}
        searchColumns={["titulo"]}
        title="Treinamentos"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="treinamentos"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Treinamento" : "Criar Treinamento"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Treinamento"
        message={`Excluir permanentemente "${deleteRow?.titulo}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
