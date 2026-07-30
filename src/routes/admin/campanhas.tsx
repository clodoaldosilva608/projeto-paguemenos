import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/campanhas")({
  component: AdminCampanhas,
});

interface Campanha {
  id: string;
  nome: string;
  descricao: string | null;
  premio: string | null;
  regras: string | null;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
}

const columns: Column<Campanha>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    searchable: true,
    render: (r) => (
      <span className="font-semibold text-slate-800 dark:text-slate-100">{r.nome}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (r) => {
      const map: Record<string, string> = {
        ativa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        rascunho: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        encerrada: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      };
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            map[r.status] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {r.status || "—"}
        </span>
      );
    },
  },
  {
    key: "data_inicio",
    label: "Início",
    sortable: true,
    render: (r) => (r.data_inicio ? new Date(r.data_inicio).toLocaleDateString("pt-BR") : "—"),
  },
  {
    key: "data_fim",
    label: "Fim",
    sortable: true,
    render: (r) => (r.data_fim ? new Date(r.data_fim).toLocaleDateString("pt-BR") : "—"),
  },
];

const fields: FormField[] = [
  { key: "nome", label: "Nome", type: "text", required: true, placeholder: "Nome da campanha" },
  { key: "descricao", label: "Descrição", type: "textarea", placeholder: "Descrição da campanha" },
  { key: "premio", label: "Prêmio", type: "text", placeholder: "Ex: Viagem, Bônus, etc" },
  { key: "regras", label: "Regras", type: "textarea", placeholder: "Regras de participação" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "rascunho", label: "Rascunho" },
      { value: "ativa", label: "Ativa" },
      { value: "encerrada", label: "Encerrada" },
    ],
    defaultValue: "rascunho",
  },
  { key: "data_inicio", label: "Data de Início", type: "date" },
  { key: "data_fim", label: "Data de Fim", type: "date" },
];

function AdminCampanhas() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Campanha | null>(null);
  const [deleteRow, setDeleteRow] = useState<Campanha | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Campanha) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "campanhas", id: deleteRow.id } });
      toast.success("Campanha excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Campanhas</h1>
        <p className="text-sm text-slate-500">
          Gerenciar campanhas motivacionais e incentivos de vendas.
        </p>
      </div>

      <DataTable
        table="campanhas"
        columns={columns}
        searchColumns={["nome"]}
        title="Campanhas"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="campanhas"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Campanha" : "Criar Campanha"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Campanha"
        message={`Excluir permanentemente "${deleteRow?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
