"use client";

import { SortableTable, type Column } from "@/components/planilha/ui/sortable-table";

export type AtividadeLinha = {
  id: number;
  criadoEm: string;
  acao: string;
  entidade: string;
  referencia: string;
  descricao: string;
  valorAntes: string;
  valorDepois: string;
};

const ACAO_STYLE: Record<string, { cor: string; icone: string; label: string }> = {
  criar: { cor: "bg-emerald-100 text-emerald-700 border-emerald-300", icone: "➕", label: "Criação" },
  editar: { cor: "bg-amber-100 text-amber-700 border-amber-300", icone: "✎", label: "Edição" },
  excluir: { cor: "bg-rose-100 text-rose-700 border-rose-300", icone: "🗑", label: "Exclusão" },
  meta: { cor: "bg-violet-100 text-violet-700 border-violet-300", icone: "🎯", label: "Meta" },
  importar: { cor: "bg-sky-100 text-sky-700 border-sky-300", icone: "⬆", label: "Importação" },
  sync: { cor: "bg-slate-200 text-slate-700 border-slate-300", icone: "⟳", label: "Sync" },
};

const ENTIDADE_LABEL: Record<string, string> = {
  venda: "Venda",
  funcionario: "Funcionário",
  meta: "Meta",
  sistema: "Sistema",
};

function dataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function AuditoriaTable({ rows }: { rows: AtividadeLinha[] }) {
  const columns: Column<AtividadeLinha>[] = [
    {
      key: "criadoEm", label: "Data / Hora", sortable: true, value: (r) => r.criadoEm,
      render: (r) => <span className="whitespace-nowrap font-mono text-[10.5px] text-slate-600">{dataHora(r.criadoEm)}</span>,
    },
    {
      key: "acao", label: "Ação", align: "center", sortable: true, value: (r) => r.acao,
      render: (r) => {
        const s = ACAO_STYLE[r.acao] ?? ACAO_STYLE.sync;
        return (
          <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${s.cor}`}>
            <span>{s.icone}</span> {s.label}
          </span>
        );
      },
    },
    {
      key: "entidade", label: "Entidade", align: "center", sortable: true, value: (r) => r.entidade,
      render: (r) => <span className="text-[10.5px] font-semibold text-slate-700">{ENTIDADE_LABEL[r.entidade] ?? r.entidade}</span>,
    },
    { key: "descricao", label: "Descrição", sortable: true, value: (r) => r.descricao, render: (r) => <span className="text-slate-800">{r.descricao}</span> },
    {
      key: "referencia", label: "Referência", align: "center",
      render: (r) => r.referencia ? <span className="font-mono text-[10px] text-slate-500">{r.referencia}</span> : <span className="text-slate-300">—</span>,
    },
    {
      key: "mudanca", label: "Antes → Depois", align: "center",
      render: (r) => {
        if (!r.valorAntes && !r.valorDepois) return <span className="text-slate-300">—</span>;
        return (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px]">
            {r.valorAntes && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 line-through">{r.valorAntes}</span>}
            {r.valorAntes && r.valorDepois && <span className="text-slate-400">→</span>}
            {r.valorDepois && <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">{r.valorDepois}</span>}
          </span>
        );
      },
    },
  ];

  return (
    <SortableTable
      rows={rows}
      columns={columns}
      initialSort={{ key: "criadoEm", dir: "desc" }}
      searchFields={(r) => [r.descricao, r.referencia, r.acao, r.entidade, r.valorAntes, r.valorDepois]}
      searchPlaceholder="Buscar por descrição, ação, entidade ou referência..."
      emptyLabel="Nenhuma atividade registrada ainda — as alterações aparecerão aqui automaticamente"
    />
  );
}
