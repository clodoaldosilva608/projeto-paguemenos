import { createFileRoute } from "@tanstack/react-router";
import DataTable, { type Column } from "@/components/admin/DataTable";

export const Route = createFileRoute("/admin/ai-logs")({
  component: AdminAiLogs,
});

interface AiLog {
  id: string;
  created_at: string;
  user_id: string | null;
  pergunta: string | null;
  resposta: string | null;
  status: string | null;
  tempo_ms: number | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
}

const columns: Column<AiLog>[] = [
  {
    key: "created_at",
    label: "Data",
    sortable: true,
    render: (r) =>
      r.created_at
        ? new Date(r.created_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
  },
  {
    key: "user_id",
    label: "Usuário",
    render: (r) => (
      <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
        {r.user_id ? String(r.user_id).slice(0, 8) + "..." : "—"}
      </span>
    ),
  },
  {
    key: "pergunta",
    label: "Pergunta",
    searchable: true,
    render: (r) => {
      if (!r.pergunta) return "—";
      const truncated =
        r.pergunta.length > 60 ? r.pergunta.slice(0, 60) + "..." : r.pergunta;
      return (
        <span className="text-xs text-slate-700 dark:text-slate-200" title={r.pergunta}>
          {truncated}
        </span>
      );
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (r) => {
      const colors: Record<string, string> = {
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        error: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
      };
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            colors[r.status || ""] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {r.status || "—"}
        </span>
      );
    },
  },
  {
    key: "tempo_ms",
    label: "Tempo (ms)",
    sortable: true,
    render: (r) =>
      r.tempo_ms != null ? (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
          {Number(r.tempo_ms).toLocaleString("pt-BR")} ms
        </span>
      ) : (
        "—"
      ),
  },
];

function AdminAiLogs() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Logs de IA</h1>
        <p className="text-sm text-slate-500">
          Histórico de interações com o assistente de IA (somente leitura).
        </p>
      </div>

      <DataTable
        table="ai_logs"
        columns={columns}
        searchColumns={["pergunta"]}
        title="AI Logs"
        canCreate={false}
        canEdit={false}
        canDelete={false}
        rowKey="id"
      />
    </div>
  );
}
