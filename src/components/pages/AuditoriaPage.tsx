import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listarAuditoria } from "@/lib/admin.functions";
import { useAuth } from "@/contexts/AuthContext";

interface AuditRow {
  id: string; actor_user_id: string | null; actor_email: string | null;
  action: string; entity: string; entity_id: string | null;
  before: any; after: any; metadata: any; criado_em: string;
}

const acaoCor = (a: string): string => {
  if (a.includes("criar")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (a.includes("excluir")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (a.includes("ativar") || a.includes("desativar")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (a.includes("perfil") || a.includes("atualizar") || a.includes("reordenar")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

export default function AuditoriaPage() {
  const { usuario } = useAuth();
  const call = useServerFn(listarAuditoria);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await call({ data: { limit: 200 } });
      setLogs(r.logs as AuditRow[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (usuario?.perfil === "admin") void load(); }, [usuario?.perfil]);

  if (usuario?.perfil !== "admin") {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">Acesso restrito ao administrador.</div>;
  }

  const exportar = () => {
    const csv = ["Data,Ator,Ação,Entidade,ID,Detalhes"];
    for (const l of logs) {
      csv.push([new Date(l.criado_em).toLocaleString("pt-BR"), l.actor_email || "", l.action, l.entity, l.entity_id || "", JSON.stringify(l.after ?? l.before ?? {}).replace(/"/g, "'")].map((c) => `"${c}"`).join(","));
    }
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `auditoria-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">{logs.length} registros de auditoria</p>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recarregar
          </button>
          <button onClick={exportar} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data/Hora</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ator</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ação</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Entidade</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3 text-xs text-slate-500">{new Date(l.criado_em).toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{l.actor_email || "—"}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${acaoCor(l.action)}`}>{l.action}</span></td>
                  <td className="px-5 py-3 text-xs text-slate-500">{l.entity}<br /><span className="font-mono text-[10px] opacity-60">{l.entity_id?.slice(0, 8)}</span></td>
                  <td className="px-5 py-3 max-w-md truncate text-xs text-slate-500" title={JSON.stringify(l.after ?? l.before ?? {})}>{JSON.stringify(l.after ?? l.before ?? l.metadata ?? {}).slice(0, 120)}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Nenhum registro de auditoria ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
