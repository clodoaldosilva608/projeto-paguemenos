import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/vendas")({
  component: AdminVendas,
});

interface Venda {
  id: string;
  usuario_id: string;
  data: string;
  categoria: string | null;
  valor_venda: number | null;
  ticket_medio: number | null;
  clientes: number | null;
  observacao: string | null;
}

const columns: Column<Venda>[] = [
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
    key: "data",
    label: "Data",
    sortable: true,
    render: (r) => (r.data ? new Date(r.data).toLocaleDateString("pt-BR") : "—"),
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
    key: "valor_venda",
    label: "Valor Venda",
    sortable: true,
    render: (r) =>
      r.valor_venda != null
        ? Number(r.valor_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—",
  },
  {
    key: "ticket_medio",
    label: "Ticket Médio",
    render: (r) =>
      r.ticket_medio != null
        ? Number(r.ticket_medio).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—",
  },
  {
    key: "clientes",
    label: "Clientes",
    render: (r) => r.clientes ?? "—",
  },
];

const fields: FormField[] = [
  { key: "usuario_id", label: "Usuário ID", type: "text", required: true, placeholder: "UUID do usuário" },
  { key: "data", label: "Data", type: "date", required: true },
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
  { key: "valor_venda", label: "Valor da Venda", type: "number", required: true, placeholder: "0.00" },
  { key: "ticket_medio", label: "Ticket Médio", type: "number", placeholder: "0.00" },
  { key: "clientes", label: "Clientes", type: "number", placeholder: "0" },
  { key: "observacao", label: "Observação", type: "textarea", placeholder: "Notas adicionais" },
];

function AdminVendas() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Venda | null>(null);
  const [deleteRow, setDeleteRow] = useState<Venda | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Venda) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "vendas_diarias", id: deleteRow.id } });
      toast.success("Venda excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Vendas Diárias</h1>
        <p className="text-sm text-slate-500">
          Registrar e acompanhar vendas diárias por usuário e categoria.
        </p>
      </div>

      <DataTable
        table="vendas_diarias"
        columns={columns}
        searchColumns={["categoria"]}
        title="Vendas"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="vendas_diarias"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Venda" : "Criar Venda"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Venda"
        message={`Excluir permanentemente o registro de venda? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
