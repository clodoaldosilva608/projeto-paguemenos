import { motion } from "framer-motion";
import { conquistas } from "../../data/mockData";
import { cn } from "../../utils/cn";

const raridadeCores: Record<string, string> = {
  comum: "from-slate-400 to-slate-500",
  rara: "from-blue-400 to-indigo-500",
  "épica": "from-purple-500 to-pink-500",
  "lendária": "from-amber-400 to-orange-500",
};

const raridadeBg: Record<string, string> = {
  comum: "bg-slate-100 dark:bg-slate-800",
  rara: "bg-blue-50 dark:bg-blue-900/30",
  "épica": "bg-purple-50 dark:bg-purple-900/30",
  "lendária": "bg-amber-50 dark:bg-amber-900/30",
};

export default function GamificacaoPage() {
  const desbloqueadas = conquistas.filter((c) => c.desbloqueada);
  const emProgresso = conquistas.filter((c) => !c.desbloqueada);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Pontuação resumo */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Pontos Totais", value: "2.480", icone: "⭐" },
          { label: "Conquistas", value: `${desbloqueadas.length}/${conquistas.length}`, icone: "🏆" },
          { label: "Nível Atual", value: "Executor", icone: "📈" },
          { label: "Próximo Nível", value: "520 pts", icone: "🎯" },
        ].map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</span>
              <span className="text-lg">{k.icone}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Desbloqueadas */}
      <div>
        <h3 className="mb-3 text-base font-bold text-slate-800 dark:text-white">🏆 Conquistas Desbloqueadas</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {desbloqueadas.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("relative overflow-hidden rounded-xl border border-slate-200 p-4 shadow-sm dark:border-slate-700", raridadeBg[c.raridade])}
            >
              <div className={cn("absolute right-0 top-0 h-1 w-full bg-gradient-to-r", raridadeCores[c.raridade])} />
              <div className="flex items-start gap-3">
                <span className="text-3xl">{c.icone}</span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{c.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{c.descricao}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white bg-gradient-to-r", raridadeCores[c.raridade])}>
                      {c.raridade}
                    </span>
                    {c.data && <span className="text-[10px] text-slate-400">{c.data}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Em progresso */}
      <div>
        <h3 className="mb-3 text-base font-bold text-slate-800 dark:text-white">🔓 Em Progresso</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {emProgresso.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl opacity-40">{c.icone}</span>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 dark:text-white">{c.titulo}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{c.descricao}</p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                      <span className="font-num font-bold text-slate-800 dark:text-white">{c.progresso}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.progresso}%` }}
                        transition={{ duration: 0.8 }}
                        className={cn("h-full rounded-full bg-gradient-to-r", raridadeCores[c.raridade])}
                      />
                    </div>
                  </div>
                  <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white bg-gradient-to-r opacity-60", raridadeCores[c.raridade])}>
                    {c.raridade}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
