import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "../../utils/cn";

type StatusCampanha = "ativa" | "rascunho" | "encerrada";

// Campanhas vindas do Supabase/admin — sem dados fake
const campanhas: any[] = [
  
  
  
  
];

const statusBadge: Record<string, string> = {
  ativa: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
  rascunho: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400",
  encerrada: "bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
};

export default function CampanhasPage() {
  const [filtro, setFiltro] = useState<"todas" | StatusCampanha>("todas");
  const filtradas = filtro === "todas" ? campanhas : campanhas.filter((c) => c.status === filtro);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["todas", "ativa", "rascunho", "encerrada"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                filtro === f ? "bg-blue-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
              )}
            >
              {f === "todas" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500">
          <span>+</span> Nova Campanha
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtradas.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">{c.nome}</h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{c.desc}</p>
              </div>
              <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1", statusBadge[c.status])}>
                {c.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Período</p>
                <p className="mt-0.5 font-num text-xs font-bold text-slate-800 dark:text-slate-200">{c.inicio} — {c.fim}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prêmio</p>
                <p className="mt-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">{c.premio}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">{c.participantes} participantes</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Líder: </span>
                <span className="font-cond text-xs font-bold text-slate-800 dark:text-white">{c.lider}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
