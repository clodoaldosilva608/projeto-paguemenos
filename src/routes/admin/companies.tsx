import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

interface Company {
  id: string;
  name: string;
  slug: string;
  status: string;
  domain: string | null;
  created_at: string;
}

const columns: Column<Company>[] = [
  {
    key: "name",
    label: "Nome",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{r.name}</p>
        <p className="text-[10px] text-slate-400">{r.id.slice(0, 8)}...</p>
      </div>
    ),
  },
  {
    key: "slug",
    label: "Slug",
    sortable: true,
    searchable: true,
    render: (r) => <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{r.slug}</span>,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          r.status === "active"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : r.status === "inactive"
              ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
        }`}
      >
        {r.status || "—"}
      </span>
    ),
  },
  {
    key: "created_at",
    label: "Criado em",
    sortable: true,
    render: (r) =>
      r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "—",
  },
];

const fields: FormField[] = [
  { key: "name", label: "Nome", type: "text", required: true, placeholder: "Nome da empresa" },
  { key: "slug", label: "Slug", type: "text", required: true, placeholder: "minha-empresa" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Ativo" },
      { value: "inactive", label: "Inativo" },
    ],
    defaultValue: "active",
  },
  { key: "domain", label: "Domínio", type: "text", placeholder: "empresa.com.br" },
];

function AdminCompanies() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Company | null>(null);
  const [deleteRow, setDeleteRow] = useState<Company | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Company) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "companies", id: deleteRow.id } });
      toast.success("Empresa excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Empresas</h1>
        <p className="text-sm text-slate-500">
          Gerenciar empresas (tenants) do sistema multi-tenant.
        </p>
      </div>

      <DataTable
        table="companies"
        columns={columns}
        searchColumns={["name", "slug"]}
        title="Companies"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="companies"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Empresa" : "Criar Empresa"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Empresa"
        message={`Excluir permanentemente "${deleteRow?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
