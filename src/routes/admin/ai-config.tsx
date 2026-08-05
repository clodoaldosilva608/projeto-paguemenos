import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import DataTable, { type Column } from "@/components/admin/DataTable";
import FormDrawer, { type FormField } from "@/components/admin/FormDrawer";
import { crudDelete } from "@/lib/admin/crud.functions";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/ai-config")({
  component: AdminAiConfig,
});

interface AiConfig {
  id: string;
  provider: string;
  model: string;
  base_url: string | null;
  system_prompt: string | null;
  assistant_prompt: string | null;
  tom: string | null;
  temperature: number | null;
  ativo: boolean;
  created_at: string;
}

const columns: Column<AiConfig>[] = [
  {
    key: "provider",
    label: "Provider",
    sortable: true,
    searchable: true,
    render: (r) => {
      const colors: Record<string, string> = {
        openai: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        anthropic: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        google: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      };
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            colors[r.provider || ""] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {r.provider || "—"}
        </span>
      );
    },
  },
  {
    key: "model",
    label: "Modelo",
    sortable: true,
    render: (r) => (
      <span className="font-mono text-xs text-slate-700 dark:text-slate-200">{r.model}</span>
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
  {
    key: "provider",
    label: "Provider",
    type: "select",
    options: [
      
      { value: "openai", label: "OpenAI" },
      { value: "anthropic", label: "Anthropic" },
      { value: "google", label: "Google" },
    ],
    defaultValue: "huggingface",
  },
  { key: "model", label: "Modelo", type: "text", required: true, placeholder: "Ex: gpt-4o, claude-3-5-sonnet" },
  { key: "base_url", label: "Base URL", type: "text", placeholder: "https://api.openai.com/v1" },
  { key: "system_prompt", label: "System Prompt", type: "textarea", placeholder: "Instruções de sistema..." },
  { key: "assistant_prompt", label: "Assistant Prompt", type: "textarea", placeholder: "Instruções do assistente..." },
  { key: "tom", label: "Tom de Voz", type: "text", placeholder: "Ex: amigável, profissional" },
  { key: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, placeholder: "0.7" },
  { key: "ativo", label: "Ativo", type: "checkbox", defaultValue: true },
];

function AdminAiConfig() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<AiConfig | null>(null);
  const [deleteRow, setDeleteRow] = useState<AiConfig | null>(null);
  const fnDelete = useServerFn(crudDelete);

  function handleCreate() {
    setEditRow(null);
    setDrawerOpen(true);
  }

  function handleEdit(row: AiConfig) {
    setEditRow(row);
    setDrawerOpen(true);
  }

  async function handleDelete() {
    if (!deleteRow) return;
    try {
      await fnDelete({ data: { table: "ai_config", id: deleteRow.id } });
      toast.success("Configuração de IA excluída.");
      setDeleteRow(null);
      window.location.reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Configuração de IA</h1>
        <p className="text-sm text-slate-500">
          Gerenciar providers, prompts e parâmetros do assistente de IA.
        </p>
      </div>

      <DataTable
        table="ai_config"
        columns={columns}
        searchColumns={["provider"]}
        title="AI Config"
        onEdit={handleEdit}
        onCreate={handleCreate}
        rowKey="id"
      />

      <FormDrawer
        table="ai_config"
        fields={fields}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editRow={editRow}
        title={editRow ? "Editar Configuração" : "Criar Configuração"}
        onSuccess={() => window.location.reload()}
      />

      <ConfirmDialog
        open={!!deleteRow}
        title="Excluir Configuração de IA"
        message={`Excluir permanentemente a configuração "${deleteRow?.provider}/${deleteRow?.model}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onClose={() => setDeleteRow(null)}
      />
    </div>
  );
}
