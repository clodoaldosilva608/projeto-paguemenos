import { motion } from "framer-motion";
import { useState } from "react";
import {
  colaboradores,
  filial,
  resultadoLoja,
  type ResultadoCategoria,
  type ResultadoFaturamento,
  type StatusMeta,
} from "../data/mockData";
import { brlMoeda, pct } from "../utils/format";
import CountUp from "./CountUp";
import { cn } from "../utils/cn";

const statusBg: Record<string, string> = {
  green: "bg-[var(--pm-green)] text-white dark:bg-emerald-600",
  red: "bg-[var(--pm-red)] text-white dark:bg-red-700",
  yellow: "bg-[var(--pm-yellow)] text-slate-900 dark:bg-yellow-500",
};

function StatusCell({ status, cor }: { status: StatusMeta; cor: string }) {
  return (
    <td className={cn("px-3 py-2.5 text-center font-cond text-[10px] font-bold uppercase tracking-wider sm:text-xs", statusBg[cor])}>
      {status}
    </td>
  );
}

function AtingimentoCell({ value, cor }: { value: number; cor: string }) {
  return (
    <td className={cn("px-3 py-2.5 text-center font-num font-bold", statusBg[cor])}>
      {pct(value)}
    </td>
  );
}

function RankingBadge({ pos }: { pos: number }) {
  const medal = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
  return (
    <td className="px-3 py-2.5 text-center">
      <span className="font-num font-bold text-slate-800 dark:text-slate-100">
        {medal ?? pos}
      </span>
    </td>
  );
}

function TableSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b-2 border-[var(--pm-navy)] bg-slate-50 px-4 py-2 text-center dark:border-blue-400 dark:bg-slate-800">
        <h3 className="font-cond text-sm uppercase tracking-[0.2em] text-[var(--pm-navy)] dark:text-blue-300">
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

const theadCls =
  "bg-[var(--pm-navy)] text-white dark:bg-blue-900 font-cond text-[10px] uppercase tracking-wider sm:text-xs";
const cellCls = "px-3 py-2.5 text-center font-num text-slate-800 dark:text-slate-100";
const nameCellCls =
  "px-3 py-2.5 text-left font-cond text-xs uppercase tracking-wide text-[var(--pm-navy)] dark:text-blue-300";

const ativos = colaboradores.filter((c) => !c.ferias && c.resultados);

export default function RankingView() {
  if (!colaboradores?.length || !resultadoLoja) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <p className="font-medium text-slate-600">Nenhum resultado disponível</p>
        <p className="mt-1 text-sm text-slate-500">Os resultados aparecerão aqui quando houver dados.</p>
      </div>
    );
  }
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b-2 border-[var(--pm-navy)] pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-blue-400">
        <div>
          <p className="font-cond text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Planilha Consolidada · {filial.nome}
          </p>
          <h1 className="font-display mt-1 text-3xl uppercase leading-none tracking-tight text-[var(--pm-navy)] sm:text-[40px] dark:text-blue-300">
            Resultado de {filial.periodoResultado}
          </h1>
        </div>
        <div className="flex items-end gap-3">
          <div className="text-right">
            <p className="font-cond text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              Atingimento Filial
            </p>
            <p className="font-num text-4xl font-bold text-[var(--pm-green)] dark:text-emerald-400 sm:text-5xl">
              <CountUp value={filial.atingimentoLoja} digits={2} suffix="%" />
            </p>
          </div>
          <div className="h-16 w-16 rounded-md border-2 border-[var(--pm-green)] p-1 dark:border-emerald-500">
            <svg viewBox="0 0 36 36" className="h-full w-full">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-200 dark:text-slate-700" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${filial.atingimentoLoja}, 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
                className="text-[var(--pm-green)] dark:text-emerald-400"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* FATURAMENTO */}
      <TableSection title="Faturamento">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className={theadCls}>
              <th className="px-3 py-3 text-left">Colaborador</th>
              <th className="px-3 py-3 text-center">Metas</th>
              <th className="px-3 py-3 text-center">Realizado</th>
              <th className="px-3 py-3 text-center">Ranking</th>
              <th className="px-3 py-3 text-center">% Atingimento</th>
              <th className="px-3 py-3 text-center">Projeção</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-3 py-3 text-center">Clientes</th>
              <th className="px-3 py-3 text-center">Ticket Médio</th>
            </tr>
          </thead>
          <tbody>
            {ativos
              .slice()
              .sort((a, b) => a.resultados!.faturamento.ranking - b.resultados!.faturamento.ranking)
              .map((c, idx) => {
                const f = c.resultados!.faturamento as ResultadoFaturamento;
                const hovered = hoverRow === c.nome;
                return (
                  <tr
                    key={c.nome}
                    onMouseEnter={() => setHoverRow(c.nome)}
                    onMouseLeave={() => setHoverRow(null)}
                    className={cn(
                      "border-t border-slate-100 transition dark:border-slate-800",
                      idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-800/50",
                      hovered && "ring-2 ring-inset ring-blue-400/60"
                    )}
                  >
                    <td className={nameCellCls}>{c.nome}</td>
                    <td className={cellCls}>{brlMoeda(f.meta)}</td>
                    <td className={cn(cellCls, "font-bold")}>{brlMoeda(f.realizado)}</td>
                    <RankingBadge pos={f.ranking} />
                    <AtingimentoCell value={f.atingimento} cor={f.corStatus} />
                    <td className={cellCls}>{brlMoeda(f.projecao)}</td>
                    <StatusCell status={f.status} cor={f.corStatus} />
                    <td className={cn(cellCls, "font-bold")}>{f.clientes}</td>
                    <td className={cn(cellCls, "font-bold")}>{brlMoeda(f.ticketMedio)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </TableSection>

      {/* MARCAS EXCLUSIVAS */}
      <TableSection title="Marcas Exclusivas">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className={theadCls}>
              <th className="px-3 py-3 text-left">Colaborador</th>
              <th className="px-3 py-3 text-center">Metas</th>
              <th className="px-3 py-3 text-center">Realizado</th>
              <th className="px-3 py-3 text-center">Ranking</th>
              <th className="px-3 py-3 text-center">% Atingimento</th>
              <th className="px-3 py-3 text-center">Projeção</th>
              <th className="px-3 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {ativos
              .slice()
              .sort((a, b) => a.resultados!.me.ranking - b.resultados!.me.ranking)
              .map((c, idx) => {
                const m = c.resultados!.me as ResultadoCategoria;
                return (
                  <tr
                    key={c.nome}
                    className={cn(
                      "border-t border-slate-100 transition hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-blue-900/20",
                      idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-800/50"
                    )}
                  >
                    <td className={nameCellCls}>{c.nome}</td>
                    <td className={cellCls}>{brlMoeda(m.meta)}</td>
                    <td className={cn(cellCls, "font-bold")}>{brlMoeda(m.realizado)}</td>
                    <RankingBadge pos={m.ranking} />
                    <AtingimentoCell value={m.atingimento} cor={m.corStatus} />
                    <td className={cellCls}>{brlMoeda(m.projecao)}</td>
                    <StatusCell status={m.status} cor={m.corStatus} />
                  </tr>
                );
              })}
          </tbody>
        </table>
      </TableSection>

      {/* GENÉRICOS */}
      <TableSection title="Genéricos">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className={theadCls}>
              <th className="px-3 py-3 text-left">Colaborador</th>
              <th className="px-3 py-3 text-center">Metas</th>
              <th className="px-3 py-3 text-center">Realizado</th>
              <th className="px-3 py-3 text-center">Ranking</th>
              <th className="px-3 py-3 text-center">% Atingimento</th>
              <th className="px-3 py-3 text-center">Projeção</th>
              <th className="px-3 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {ativos
              .filter((c) => c.resultados!.genericos.meta > 0)
              .sort((a, b) => a.resultados!.genericos.ranking - b.resultados!.genericos.ranking)
              .map((c, idx) => {
                const g = c.resultados!.genericos as ResultadoCategoria;
                return (
                  <tr
                    key={c.nome}
                    className={cn(
                      "border-t border-slate-100 transition hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-blue-900/20",
                      idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/60 dark:bg-slate-800/50"
                    )}
                  >
                    <td className={nameCellCls}>{c.nome}</td>
                    <td className={cellCls}>{brlMoeda(g.meta)}</td>
                    <td className={cn(cellCls, "font-bold")}>{brlMoeda(g.realizado)}</td>
                    <RankingBadge pos={g.ranking} />
                    <AtingimentoCell value={g.atingimento} cor={g.corStatus} />
                    <td className={cellCls}>{brlMoeda(g.projecao)}</td>
                    <StatusCell status={g.status} cor={g.corStatus} />
                  </tr>
                );
              })}
          </tbody>
        </table>
      </TableSection>

      {/* Consolidado da loja */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TableSection title="Faturamento Loja">
          <table className="w-full text-sm">
            <thead>
              <tr className={theadCls}>
                <th className="px-3 py-2 text-center">Loja</th>
                <th className="px-3 py-2 text-center">Metas</th>
                <th className="px-3 py-2 text-center">Realizado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cn(cellCls, "font-bold")}>{filial.id}</td>
                <td className={cellCls}>{brlMoeda(resultadoLoja.faturamento.meta)}</td>
                <td className={cn(cellCls, "font-bold")}>{brlMoeda(resultadoLoja.faturamento.realizado)}</td>
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  % Atingimento
                </td>
                <AtingimentoCell value={resultadoLoja.faturamento.atingimento} cor={resultadoLoja.faturamento.corStatus} />
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Projeção
                </td>
                <td className={cn(cellCls, "font-bold")}>{brlMoeda(resultadoLoja.faturamento.projecao)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </td>
                <StatusCell status={resultadoLoja.faturamento.status} cor={resultadoLoja.faturamento.corStatus} />
              </tr>
            </tbody>
          </table>
        </TableSection>

        <TableSection title="Marcas Exclusivas Loja">
          <table className="w-full text-sm">
            <thead>
              <tr className={theadCls}>
                <th className="px-3 py-2 text-center">Loja</th>
                <th className="px-3 py-2 text-center">Metas</th>
                <th className="px-3 py-2 text-center">Realizado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cn(cellCls, "font-bold")}>{filial.id}</td>
                <td className={cellCls}>{brlMoeda(resultadoLoja.me.meta)}</td>
                <td className={cn(cellCls, "font-bold")}>{brlMoeda(resultadoLoja.me.realizado)}</td>
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  % Atingimento
                </td>
                <AtingimentoCell value={resultadoLoja.me.atingimento} cor={resultadoLoja.me.corStatus} />
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Projeção
                </td>
                <td className={cn(cellCls, "font-bold")}>{brlMoeda(resultadoLoja.me.projecao)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </td>
                <StatusCell status={resultadoLoja.me.status} cor={resultadoLoja.me.corStatus} />
              </tr>
            </tbody>
          </table>
        </TableSection>

        <TableSection title="Genéricos Loja">
          <table className="w-full text-sm">
            <thead>
              <tr className={theadCls}>
                <th className="px-3 py-2 text-center">Loja</th>
                <th className="px-3 py-2 text-center">Metas</th>
                <th className="px-3 py-2 text-center">Realizado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cn(cellCls, "font-bold")}>{filial.id}</td>
                <td className={cellCls}>{brlMoeda(resultadoLoja.genericos.meta)}</td>
                <td className={cn(cellCls, "font-bold")}>{brlMoeda(resultadoLoja.genericos.realizado)}</td>
              </tr>
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  % Atingimento
                </td>
                <AtingimentoCell value={resultadoLoja.genericos.atingimento} cor={resultadoLoja.genericos.corStatus} />
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Projeção
                </td>
                <td className={cn(cellCls, "font-bold")}>{brlMoeda(resultadoLoja.genericos.projecao)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="px-3 py-2 text-center font-cond text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </td>
                <StatusCell status={resultadoLoja.genericos.status} cor={resultadoLoja.genericos.corStatus} />
              </tr>
            </tbody>
          </table>
        </TableSection>
      </div>

      <p className="text-center font-cond text-xs uppercase tracking-[0.3em] text-slate-400">
        Página 1 · {filial.nome}
      </p>
    </motion.div>
  );
}
