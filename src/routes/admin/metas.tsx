import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/metas")({
  component: AdminMetas,
});

interface Meta {
  id: string;
  usuario_id: string;
  categoria: string | null;
  periodo: string | null;
  valor_meta: number | null;
  valor_realizado: number | null;
  valor_projecao: number | null;
  data_inicio: string;
}

const columns: Column<Meta>[] = [
  {
    key: "usuario_id",
    label: "Usuário",
    sortable: true,
    render: (r) => (
      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
        {String(r.usuario_id).slice(0, 8)}...
      </span>
    ),
  },
  {
    key: "categoria",
    label: "Categoria",
    searchable: true,
    render: (r) => (
      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {r.categoria || "—"}
      </span>
    ),
  },
  {
    key: "periodo",
    label: "Período",
    render: (r) => (
      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
        {r.periodo || "—"}
      </span>
    ),
  },
  {
    key: "valor_meta",
    label: "Meta",
    sortable: true,
    render: (r) =>
      r.valor_meta != null
        ? Number(r.valor_meta).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—",
  },
  {
    key: "valor_realizado",
    label: "Realizado",
    render: (r) =>
      r.valor_realizado != null
        ? Number(r.valor_realizado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—",
  },
  {
    key: "valor_projecao",
    label: "Projeção",
    render: (r) =>
      r.valor_projecao != null
        ? Number(r.valor_projecao).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—",
  },
  {
    key: "data_inicio",
    label: "Início",
    sortable: true,
    render: (r) => (r.data_inicio ? new Date(r.data_inicio).toLocaleDateString("pt-BR") : "—"),
  },
];

const fields: FormField[] = [
  { key: "usuario_id", label: "Usuário ID", type: "text", required: true, placeholder: "UUID do usuário" },
  {
    key: "categoria",
    label: "Categoria",
    type: "select",
    options: [
      { value: "faturamento", label: "Faturamento" },
      { value: "marcas_exclusivas", label: "Marcas Exclusivas" },
      { value: "genericos", label: "Genéricos" },
      { value: "super_desconto", label: "Super Desconto" },
    ],
    defaultValue: "faturamento",
  },
  {
    key: "periodo",
    label: "Período",
    type: "select",
    options: [
      { value: "mensal", label: "Mensal" },
      { value: "diaria", label: "Diária" },
      { value: "semanal", label: "Semanal" },
      { value: "trimestral", label: "Trimestral" },
    ],
    defaultValue: "mensal",
  },
  { key: "valor_meta", label: "Valor da Meta", type: "number", required: true, placeholder: "0.00" },
  { key: "valor_realizado", label: "Valor Realizado", type: "number", placeholder: "0.00" },
  { key: "valor_projecao", label: "Valor Projeção", type: "number", placeholder: "0.00" },
  { key: "data_inicio", label: "Data de Início", type: "date", required: true },
];

function AdminMetas() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Meta | null>(null);
  const [deleteRow, setDeleteRow] = useState<Meta | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Meta) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "metas_individuais", id: deleteRow.id } });
      toast.success("Meta excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Metas Individuais</h1>
        <p className="text-sm text-slate-500">
          Definir e acompanhar metas individuais por categoria e período.
        </p>
      </div>

      <DataTable
        table="metas_individuais"
        columns={columns}
        searchColumns={["categoria"]}
        title="Metas"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="metas_individuais"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Meta" : "Criar Meta"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Meta"
        message={`Excluir permanentemente esta meta? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
