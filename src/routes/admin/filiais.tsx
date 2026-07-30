import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/filiais")({
  component: AdminFiliais,
});

interface Filial {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
}

const columns: Column<Filial>[] = [
  {
    key: "id",
    label: "ID",
    sortable: true,
    searchable: true,
    render: (r) => <span className="font-mono text-xs text-slate-600 dark:text-slate-300">{r.id}</span>,
  },
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
    key: "cidade",
    label: "Cidade",
    searchable: true,
    render: (r) => r.cidade || "—",
  },
  {
    key: "estado",
    label: "Estado",
    render: (r) =>
      r.estado ? (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {r.estado}
        </span>
      ) : (
        "—"
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
  { key: "id", label: "ID", type: "text", required: true, placeholder: "Ex: 7537" },
  { key: "nome", label: "Nome", type: "text", required: true, placeholder: "Filial Centro" },
  { key: "endereco", label: "Endereço", type: "text", placeholder: "Rua, número, bairro" },
  { key: "cidade", label: "Cidade", type: "text", placeholder: "São Paulo" },
  { key: "estado", label: "Estado", type: "text", placeholder: "SP" },
  { key: "ativo", label: "Ativo", type: "checkbox", defaultValue: true },
];

function AdminFiliais() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Filial | null>(null);
  const [deleteRow, setDeleteRow] = useState<Filial | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Filial) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "filiais", id: deleteRow.id } });
      toast.success("Filial excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Filiais</h1>
        <p className="text-sm text-slate-500">
          Gerenciar filiais da rede PagueMenos.
        </p>
      </div>

      <DataTable
        table="filiais"
        columns={columns}
        searchColumns={["nome", "cidade"]}
        title="Filiais"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="filiais"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Filial" : "Criar Filial"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Filial"
        message={`Excluir permanentemente "${deleteRow?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
