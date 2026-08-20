import { useState, useTransition } from "react";
import { useRouter } from "@/components/planilha/noop-router";
import { Modal } from "@/components/planilha/ui/modal";
import { useToast } from "@/components/planilha/ui/toast";
import { SortableTable, type Column } from "@/components/planilha/ui/sortable-table";
import { Sparkline } from "@/components/planilha/charts-extra";
import { fmtBRL, fmtPct, statusDe } from "@/lib/planilha/format";
import { StatusPill } from "@/components/planilha/kit";

export type FuncionarioLinha = {
  id: number;
  nome: string;
  cargo: string;
  matricula: string;
  email: string;
  status: string;
  meta: number;
  realizado: number;
  projecao: number;
  atingimento: number;
  clientes: number;
  vendasValor: number;
  serie: number[];
  aba: string | null;
};

// Stubs simplificados — sem fetch para API (que não existe no TanStack)
function EditEmployee({ f }: { f: FuncionarioLinha }) {
  return <button className="rounded p-1 text-slate-500 hover:bg-slate-100" title={`Editar ${f.nome}`} aria-label={`Editar ${f.nome}`}>✎</button>;
}
function DeleteEmployee({ f }: { f: FuncionarioLinha }) {
  return <button className="rounded p-1 text-red-500 hover:bg-red-50" title={`Excluir ${f.nome}`} aria-label={`Excluir ${f.nome}`}>🗑</button>;
}
function StatusToggle({ f }: { f: FuncionarioLinha }) {
  const [status, setStatus] = useState(f.status);
  const cycle = () => {
    const next = status === "Ativo" ? "Férias" : status === "Férias" ? "Inativo" : "Ativo";
    setStatus(next);
  };
  const cor = status === "Ativo" ? "bg-emerald-100 text-emerald-700" : status === "Férias" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
  return (
    <button onClick={cycle} className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${cor}`} title="Clique para alternar status">
      {status}
    </button>
  );
}

export function EquipeTable({ rows, filterQuery }: { rows: FuncionarioLinha[]; filterQuery: string }) {
  const columns: Column<FuncionarioLinha>[] = [
    {
      key: "funcionario", label: "Funcionário", sortable: true, value: (r) => r.nome,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1a56c5] to-[#0d3b96] text-[11px] font-bold text-white">
            {r.nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-800">{r.nome}</div>
            <div className="truncate text-[10px] text-slate-500">{r.cargo}</div>
          </div>
        </div>
      ),
    },
    { key: "matricula", label: "Matrícula", sortable: true, value: (r) => r.matricula, render: (r) => <span className="font-mono text-[10.5px]">{r.matricula || "—"}</span> },
    {
      key: "email", label: "E-mail", sortable: true, value: (r) => r.email,
      render: (r) => r.email
        ? <a href={`mailto:${r.email}`} className="text-[#1a56c5] hover:underline">{r.email}</a>
        : <span className="text-slate-400">—</span>,
    },
    { key: "status", label: "Status", align: "center", sortable: true, value: (r) => r.status, render: (r) => <StatusToggle f={r} /> },
    { key: "meta", label: "Meta (R$)", align: "right", sortable: true, value: (r) => r.meta, render: (r) => fmtBRL(r.meta) },
    { key: "realizado", label: "Realizado (R$)", align: "right", sortable: true, value: (r) => r.realizado, render: (r) => <span className="font-semibold">{fmtBRL(r.realizado)}</span> },
    {
      key: "atingimento", label: "% Atingimento", align: "center", sortable: true, value: (r) => r.atingimento,
      render: (r) => (
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold">{fmtPct(r.atingimento)}</span>
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full" style={{ width: `${Math.min(r.atingimento, 100)}%`, background: r.atingimento >= 70 ? "#16a34a" : r.atingimento >= 30 ? "#f59e0b" : "#dc2626" }} />
          </div>
        </div>
      ),
    },
    { key: "situacao", label: "Situação", align: "center", render: (r) => <StatusPill status={statusDe(r.atingimento)} /> },
    { key: "tendencia", label: "Tendência", align: "center", render: (r) => <Sparkline values={r.serie} /> },
    { key: "clientes", label: "Clientes", align: "right", sortable: true, value: (r) => r.clientes, render: (r) => r.clientes },
    {
      key: "acoes", label: "Ações", align: "center",
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          {r.aba && (
            <a href={`/?tab=${r.aba}&${filterQuery}`} className="rounded p-1 text-emerald-600 transition hover:bg-emerald-50" title="Abrir painel individual" aria-label={`Abrir painel de ${r.nome}`}>📊</a>
          )}
          <EditEmployee f={r} />
          <DeleteEmployee f={r} />
        </div>
      ),
    },
  ];

  return (
    <SortableTable
      rows={rows}
      columns={columns}
      initialSort={{ key: "realizado", dir: "desc" }}
      searchFields={(r) => [r.nome, r.matricula, r.email, r.cargo, r.status]}
      searchPlaceholder="Buscar por nome, matrícula, e-mail, cargo ou status..."
      emptyLabel="Nenhum funcionário cadastrado"
    />
  );
}
