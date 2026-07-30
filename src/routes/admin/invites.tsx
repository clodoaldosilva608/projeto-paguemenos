import { createFileRoute } from "@tanstack/react-router";
import DataTable, { type Column } from "@/components/admin/DataTable";

export const Route = createFileRoute("/admin/invites")({
  component: AdminInvites,
});

interface Invite {
  id: string;
  email: string;
  nome: string | null;
  perfil: string | null;
  filial_id: string | null;
  equipe_id: string | null;
  cargo: string | null;
  status: string;
  expira_em: string | null;
  created_at: string;
}

const columns: Column<Invite>[] = [
  {
    key: "email",
    label: "E-mail",
    sortable: true,
    searchable: true,
    render: (r) => <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{r.email}</span>,
  },
  {
    key: "nome",
    label: "Nome",
    sortable: true,
    searchable: true,
    render: (r) => r.nome || "—",
  },
  {
    key: "perfil",
    label: "Perfil",
    render: (r) => {
      const colors: Record<string, string> = {
        admin: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        gerente: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
        supervisor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
        vendedor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      };
      return (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            colors[r.perfil || ""] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {r.perfil || "—"}
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
        pendente: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
        aceito: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
        expirado: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        cancelado: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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
    key: "expira_em",
    label: "Expira em",
    sortable: true,
    render: (r) => (r.expira_em ? new Date(r.expira_em).toLocaleDateString("pt-BR") : "—"),
  },
];

function AdminInvites() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Convites</h1>
        <p className="text-sm text-slate-500">
          Acompanhar convites enviados (somente leitura — exclusão em lote permitida).
        </p>
      </div>

      <DataTable
        table="invites"
        columns={columns}
        searchColumns={["email", "nome"]}
        title="Invites"
        canCreate={false}
        canEdit={false}
        canDelete={true}
        rowKey="id"
      />
    </div>
  );
}
