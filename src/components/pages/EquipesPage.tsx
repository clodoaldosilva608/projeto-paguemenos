import { motion } from "framer-motion";
import { colaboradores, filial } from "../../data/mockData";
import { brlMoeda, pct } from "../../utils/format";

export default function EquipesPage() {
  const ativos = colaboradores.filter((c) => !c.ferias && c.resultados);
  const ferias = colaboradores.filter((c) => c.ferias);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-900/20">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {filial.nome} · {ativos.length} ativos · {ferias.length} em férias
          </span>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500">
          <span>+</span> Criar Equipe
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 p-5 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white">Equipe Zênite</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Supervisor: Ana Costa · {filial.nome}</p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {colaboradores.map((c, i) => (
            <motion.div
              key={c.nome}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition hover:border-blue-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-blue-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow">
                {c.iniciais}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{c.nome}</p>
                {c.ferias ? (
                  <p className="text-xs italic text-slate-400">⛱ Férias</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="font-num text-xs text-slate-500 dark:text-slate-400">
                      {brlMoeda(c.resultados!.faturamento.realizado)}
                    </p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      c.resultados!.faturamento.corStatus === "green"
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : c.resultados!.faturamento.corStatus === "yellow"
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {pct(c.resultados!.faturamento.atingimento)}
                    </span>
                  </div>
                )}
              </div>
              {!c.ferias && (
                <span className="font-num text-xs font-bold text-slate-400">#{c.resultados!.faturamento.ranking}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
