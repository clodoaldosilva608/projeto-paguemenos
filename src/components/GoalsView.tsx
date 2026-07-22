import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { colaboradores, filial } from "../data/mockData";
import { brlMoeda, pct } from "../utils/format";
import { cn } from "../utils/cn";

type FiltroStatus = "Todos" | "Dentro da Meta" | "Fora da Meta" | "Atenção" | "Férias";

const filtros: FiltroStatus[] = ["Todos", "Dentro da Meta", "Atenção", "Fora da Meta", "Férias"];

const statusInfo: Record<string, { label: string; badge: string; bg: string }> = {
  green: {
    label: "Dentro da Meta",
    badge: "bg-[var(--pm-green)] text-white",
    bg: "from-emerald-500/10 to-transparent",
  },
  red: {
    label: "Fora da Meta",
    badge: "bg-[var(--pm-red)] text-white",
    bg: "from-red-500/10 to-transparent",
  },
  yellow: {
    label: "Atenção",
    badge: "bg-[var(--pm-yellow)] text-slate-900",
    bg: "from-yellow-500/10 to-transparent",
  },
  ferias: {
    label: "Férias",
    badge: "bg-slate-400 text-white",
    bg: "from-slate-400/10 to-transparent",
  },
};

export default function GoalsView() {
  const [filtro, setFiltro] = useState<FiltroStatus>("Todos");

  const lista = useMemo(() => {
    return colaboradores.filter((c) => {
      if (filtro === "Todos") return true;
      if (filtro === "Férias") return c.ferias;
      if (!c.resultados) return false;
      const cor = c.resultados.faturamento.corStatus;
      if (filtro === "Dentro da Meta") return cor === "green";
      if (filtro === "Fora da Meta") return cor === "red";
      if (filtro === "Atenção") return cor === "yellow";
      return true;
    });
  }, [filtro]);

  const stats = useMemo(() => {
    const ativos = colaboradores.filter((c) => !c.ferias && c.resultados);
    const dentro = ativos.filter((c) => c.resultados!.faturamento.corStatus === "green").length;
    const fora = ativos.filter((c) => c.resultados!.faturamento.corStatus === "red").length;
    const atencao = ativos.filter((c) => c.resultados!.faturamento.corStatus === "yellow").length;
    const ferias = colaboradores.filter((c) => c.ferias).length;
    const totalRealizado = ativos.reduce((s, c) => s + c.resultados!.faturamento.realizado, 0);
    return { total: colaboradores.length, dentro, fora, atencao, ferias, totalRealizado };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-2 border-b-2 border-[var(--pm-navy)] pb-4 dark:border-blue-400">
        <p className="font-cond text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          {filial.nome} · {filial.periodo}
        </p>
        <h1 className="font-display text-3xl uppercase tracking-tight text-[var(--pm-navy)] dark:text-blue-300 sm:text-[40px]">
          Desempenho por Colaborador
        </h1>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "text-[var(--pm-navy)] dark:text-blue-300" },
          { label: "Dentro da Meta", value: stats.dentro, color: "text-[var(--pm-green)] dark:text-emerald-400" },
          { label: "Atenção", value: stats.atencao, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Fora da Meta", value: stats.fora, color: "text-[var(--pm-red)] dark:text-red-400" },
          { label: "Férias", value: stats.ferias, color: "text-slate-500 dark:text-slate-400" },
          { label: "Realizado Filial", value: brlMoeda(stats.totalRealizado), color: "text-[var(--pm-navy)] dark:text-blue-300", raw: true },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-md border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="font-cond text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {s.label}
            </p>
            <p className={cn("font-num mt-1 text-xl font-bold", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {filtros.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "font-cond rounded-md px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition",
              filtro === f
                ? "bg-[var(--pm-navy)] text-white shadow-md dark:bg-blue-700"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((c, i) => {
          const info = c.ferias
            ? statusInfo.ferias
            : statusInfo[c.resultados!.faturamento.corStatus];
          const f = c.resultados?.faturamento;
          const me = c.resultados?.me;
          const gen = c.resultados?.genericos;

          return (
            <motion.div
              key={c.nome}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="group relative overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-70", info.bg)} />
              <div className="relative p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-[var(--pm-navy)] to-[var(--pm-purple)] font-cond text-sm font-bold text-white shadow-md">
                      {c.iniciais}
                    </div>
                    <div>
                      <p className="font-cond text-base uppercase tracking-wide text-[var(--pm-navy)] dark:text-blue-300">
                        {c.nome}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {c.ferias ? "Período de férias" : `Ranking #${f!.ranking} · Filial ${filial.id}`}
                      </p>
                    </div>
                  </div>
                  <span className={cn("font-cond rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider", info.badge)}>
                    {info.label}
                  </span>
                </div>

                {c.ferias ? (
                  <div className="mt-4 rounded-md bg-slate-50 p-4 text-center dark:bg-slate-800">
                    <p className="text-2xl">⛱</p>
                    <p className="mt-1 font-cond text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Retorno em 01/08
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="font-cond text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Realizado
                        </p>
                        <p className="font-num mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                          {brlMoeda(f!.realizado)}
                        </p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="font-cond text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Clientes
                        </p>
                        <p className="font-num mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                          {f!.clientes}
                        </p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
                        <p className="font-cond text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          TKM
                        </p>
                        <p className="font-num mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
                          {brlMoeda(f!.ticketMedio)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {[
                        { label: "Faturamento", val: f!.atingimento, meta: f!.meta, real: f!.realizado, cor: f!.corStatus },
                        { label: "Marcas Exclusivas", val: me!.atingimento, meta: me!.meta, real: me!.realizado, cor: me!.corStatus },
                        { label: "Genéricos", val: gen!.meta > 0 ? gen!.atingimento : 0, meta: gen!.meta, real: gen!.realizado, cor: gen!.corStatus },
                      ].map((bar) => {
                        const barColor =
                          bar.cor === "green"
                            ? "bg-[var(--pm-green)]"
                            : bar.cor === "yellow"
                            ? "bg-[var(--pm-yellow)]"
                            : "bg-[var(--pm-red)]";
                        return (
                          <div key={bar.label}>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-cond uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                {bar.label}
                              </span>
                              <span className="font-num font-bold text-slate-800 dark:text-slate-100">
                                {bar.meta > 0 ? pct(bar.val) : "—"}
                              </span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, bar.val)}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={cn("h-full rounded-full", barColor)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-xs dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400">
                        Projeção: <span className="font-num font-bold text-slate-800 dark:text-slate-100">{brlMoeda(f!.projecao)}</span>
                      </span>
                      <button className="font-cond text-xs uppercase tracking-wider text-[var(--pm-navy)] hover:underline dark:text-blue-300">
                        Detalhes →
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
