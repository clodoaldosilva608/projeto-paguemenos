import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

interface Company {
  id: string;
  name: string;
  slug: string;
  app_name: string;
  active: boolean;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  custom_domain: string | null;
  created_at: string;
}

const columns: Column<Company>[] = [
  {
    key: "name",
    label: "Nome",
    sortable: true,
    searchable: true,
    render: (r) => (
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: r.primary_color || "#1565C0" }}
        >
          {r.name?.charAt(0) || "?"}
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{r.name}</p>
          <p className="text-[10px] text-slate-400">{r.app_name || r.slug}</p>
        </div>
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
    key: "custom_domain",
    label: "Domínio",
    render: (r) => r.custom_domain || "—",
  },
  {
    key: "active",
    label: "Status",
    sortable: true,
    render: (r) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
          r.active
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
        }`}
      >
        {r.active ? "Ativo" : "Inativo"}
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
  { key: "name", label: "Nome da Empresa", type: "text", required: true, placeholder: "Pague Menos" },
  { key: "slug", label: "Slug (identificador)", type: "text", required: true, placeholder: "paguemenos" },
  { key: "app_name", label: "Nome do App", type: "text", placeholder: "PagueMenos" },
  { key: "primary_color", label: "Cor Primária", type: "text", placeholder: "#1B4F8C", defaultValue: "#1565C0" },
  { key: "secondary_color", label: "Cor Secundária", type: "text", placeholder: "#D64541", defaultValue: "#D64541" },
  { key: "custom_domain", label: "Domínio Customizado", type: "text", placeholder: "empresa.com.br" },
  { key: "logo_url", label: "URL do Logo", type: "text", placeholder: "https://..." },
  { key: "active", label: "Ativo", type: "checkbox", defaultValue: true },
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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Empresas & Membros</h1>
        <p className="text-sm text-slate-500">
          Gerenciar empresas (tenants) do sistema multi-tenant. Cada empresa é isolada com suas próprias filiais, vendas e usuários.
        </p>
      </div>

      <DataTable
        table="companies"
        columns={columns}
        searchColumns={["name", "slug", "app_name"]}
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
        message={`Excluir permanentemente "${deleteRow?.name}"? Todos os dados relacionados (filiais, vendas, usuários) podem ser afetados. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
