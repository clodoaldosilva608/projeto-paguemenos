import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/integracoes")({
  component: AdminIntegracoes,
});

interface Integracao {
  id: string;
  connector_id: string;
  connection_key_ciphertext: string | null;
  user_id: string | null;
  created_at: string;
}

const columns: Column<Integracao>[] = [
  {
    key: "connector_id",
    label: "Connector ID",
    sortable: true,
    searchable: true,
    render: (r) => (
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
        {r.connector_id}
      </span>
    ),
  },
  {
    key: "connection_key_ciphertext",
    label: "Connection Key",
    render: (r) => {
      if (!r.connection_key_ciphertext) return "—";
      const val = String(r.connection_key_ciphertext);
      const truncated = val.length > 32 ? val.slice(0, 32) + "..." : val;
      return (
        <span className="font-mono text-[10px] text-slate-500" title={val}>
          {truncated}
        </span>
      );
    },
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
  {
    key: "connector_id",
    label: "Connector ID",
    type: "text",
    required: true,
    placeholder: "Ex: whatsapp, hubspot, etc",
  },
  {
    key: "connection_key_ciphertext",
    label: "Connection Key (ciphertext)",
    type: "textarea",
    required: true,
    placeholder: "Chave criptografada (base64/JSON)",
  },
  { key: "user_id", label: "User ID", type: "text", placeholder: "UUID do usuário (opcional)" },
];

function AdminIntegracoes() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<Integracao | null>(null);
  const [deleteRow, setDeleteRow] = useState<Integracao | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: Integracao) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "integration_credentials", id: deleteRow.id } });
      toast.success("Integração excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Integrações</h1>
        <p className="text-sm text-slate-500">
          Gerenciar credenciais de integrações externas (connectors).
        </p>
      </div>

      <DataTable
        table="integration_credentials"
        columns={columns}
        searchColumns={["connector_id"]}
        title="Integration Credentials"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="integration_credentials"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Integração" : "Criar Integração"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Integração"
        message={`Excluir permanentemente a integração "${deleteRow?.connector_id}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
