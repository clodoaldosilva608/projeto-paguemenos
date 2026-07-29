import { motion } from "framer-motion";
import { brlMoeda, pct } from "../../utils/format";

// Filiais vindas do localStorage/Supabase — sem dados fake
const filiais: any[] = [
  
  
  
  
];

export default function FiliaisPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{filiais.length} filiais cadastradas</p>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500">
          <span>+</span> Nova Filial
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filiais.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-num text-sm font-bold text-white shadow">
                  {f.id}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Filial {f.id}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{f.cidade}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                f.status === "green"
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {f.status === "green" ? "Dentro da Meta" : "Fora da Meta"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Realizado</p>
                <p className="font-num text-sm font-bold text-slate-800 dark:text-white">{brlMoeda(f.realizado)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Meta</p>
                <p className="font-num text-sm font-bold text-slate-800 dark:text-white">{brlMoeda(f.meta)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Atingimento</p>
                <p className={`font-num text-sm font-bold ${f.status === "green" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {pct(f.atingimento)}
                </p>
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, f.atingimento)}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full ${f.status === "green" ? "bg-emerald-500" : "bg-red-500"}`}
              />
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Gerente: <span className="font-semibold text-slate-700 dark:text-slate-300">{f.gerente}</span>
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
