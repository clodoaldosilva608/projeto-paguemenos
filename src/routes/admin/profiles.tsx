import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/profiles")({
  component: AdminProfiles,
});

interface Profile {
  id: string;
  nome: string;
  email: string;
  iniciais: string | null;
  cargo: string | null;
  filial_id: string | null;
  equipe_id: string | null;
  ativo: boolean;
  aprovado: boolean;
  onboarding_completo: boolean;
  plano: string | null;
  company_id: string | null;
  criado_em: string;
}

const columns: Column<Profile>[] = [
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{r.nome}</p>
        <p className="text-[10px] text-slate-400">{r.id.slice(0, 8)}...</p>
      </div>
    ),
  },
  {
    key: "email",
    label: "E-mail",
    sortable: true,
    searchable: true,
    render: (r) => <span className="text-xs">{r.email}</span>,
  },
  {
    key: "cargo",
    label: "Cargo",
    searchable: true,
    render: (r) => r.cargo || "—",
  },
  {
    key: "filial_id",
    label: "Filial",
    render: (r) => r.filial_id || "—",
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
  {
    key: "aprovado",
    label: "Aprovado",
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          r.aprovado
            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        }`}
      >
        {r.aprovado ? "Sim" : "Pendente"}
      </span>
    ),
  },
  {
    key: "plano",
    label: "Plano",
    render: (r) => r.plano || "—",
  },
];

const fields: FormField[] = [
  { key: "nome", label: "Nome", type: "text", required: true, placeholder: "Nome completo" },
  { key: "email", label: "E-mail", type: "email", required: true, placeholder: "email@empresa.com" },
  { key: "iniciais", label: "Iniciais", type: "text", placeholder: "Ex: CS" },
  { key: "cargo", label: "Cargo", type: "text", placeholder: "Ex: Vendedor" },
  { key: "filial_id", label: "Filial ID", type: "text", placeholder: "Ex: 7537" },
  { key: "equipe_id", label: "Equipe ID", type: "text" },
  { key: "ativo", label: "Ativo", type: "checkbox", defaultValue: true },
  { key: "aprovado", label: "Aprovado", type: "checkbox", defaultValue: true },
  { key: "onboarding_completo", label: "Onboarding Completo", type: "checkbox", defaultValue: true },
  {
    key: "plano",
    label: "Plano",
    type: "select",
    options: [
      { value: "ativo", label: "Ativo" },
      { value: "trial", label: "Trial" },
      { value: "limitado", label: "Limitado" },
    ],
    defaultValue: "ativo",
  },
];

function AdminProfiles() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Profile | null>(null);
  const [deleteRow, setDeleteRow] = useState<Profile | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Profile) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "profiles", id: deleteRow.id } });
      toast.success("Usuário excluído.");
      setDeleteRow(null);
      // Recarregar via key change no DataTable (forçar refresh)
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Usuários & Roles</h1>
        <p className="text-sm text-slate-500">
          Gerenciar profiles e user_roles (admin, gerente, supervisor, vendedor).
        </p>
      </div>

      <DataTable
        table="profiles"
        columns={columns}
        searchColumns={["nome", "email", "cargo"]}
        title="Profiles"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="profiles"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Usuário" : "Criar Usuário"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Usuário"
        message={`Excluir permanentemente "${deleteRow?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
