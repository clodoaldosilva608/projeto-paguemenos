import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/credenciais")({
  component: AdminCredenciais,
});

interface Credencial {
  id: string;
  user_id: string;
  primeiro_nome: string;
  matricula: string;
  ativo: boolean;
  created_at: string;
}

const columns: Column<Credencial>[] = [
  {
    key: "primeiro_nome",
    label: "Nome",
    sortable: true,
    searchable: true,
    render: (r) => (
      <span className="font-semibold text-slate-800 dark:text-slate-100">{r.primeiro_nome}</span>
    ),
  },
  {
    key: "matricula",
    label: "Matrícula",
    sortable: true,
    searchable: true,
    render: (r) => (
      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{r.matricula}</span>
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
  { key: "user_id", label: "User ID", type: "text", required: true, placeholder: "UUID do usuário" },
  { key: "primeiro_nome", label: "Primeiro Nome", type: "text", required: true, placeholder: "João" },
  { key: "matricula", label: "Matrícula", type: "text", required: true, placeholder: "Ex: 12345" },
  { key: "ativo", label: "Ativo", type: "checkbox", defaultValue: true },
];

function AdminCredenciais() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Credencial | null>(null);
  const [deleteRow, setDeleteRow] = useState<Credencial | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Credencial) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "login_matricula", id: deleteRow.id } });
      toast.success("Credencial excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Credenciais</h1>
        <p className="text-sm text-slate-500">
          Gerenciar credenciais de login por matrícula.
        </p>
      </div>

      <DataTable
        table="login_matricula"
        columns={columns}
        searchColumns={["primeiro_nome", "matricula"]}
        title="Login por Matrícula"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="login_matricula"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Credencial" : "Criar Credencial"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Credencial"
        message={`Excluir permanentemente a credencial de "${deleteRow?.primeiro_nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
