import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Download, X, Eye } from "lucide-react";
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
  const [detalheSelecionado, setDetalheSelecionado] = useState<AuditRow | null>(null);

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
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{logs.length} registros de auditoria</p>
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
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Data/Hora</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Ator</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Ação</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Entidade</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-5 py-3 text-xs text-slate-500">{new Date(l.criado_em).toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{l.actor_email || "—"}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${acaoCor(l.action)}`}>{l.action}</span></td>
                  <td className="px-5 py-3 text-xs text-slate-500">{l.entity}<br /><span className="font-mono text-[10px] opacity-60">{l.entity_id?.slice(0, 8)}</span></td>
                  <td className="px-5 py-3">
                    {/* Bug 4 fix: botão para abrir modal com detalhes completos */}
                    <button
                      onClick={() => setDetalheSelecionado(l)}
                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-blue-950/40"
                      title="Ver detalhes completos"
                      aria-label="Ver detalhes completos"
                    >
                      <Eye className="h-3 w-3" />
                      {JSON.stringify(l.after ?? l.before ?? l.metadata ?? {}).slice(0, 60)}
                      {JSON.stringify(l.after ?? l.before ?? l.metadata ?? {}).length > 60 ? "…" : ""}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">Nenhum registro de auditoria ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHES COMPLETOS */}
      <AnimatePresence>
        {detalheSelecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetalheSelecionado(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-slate-800 px-5 py-3 text-white dark:border-white/10">
                <h2 className="text-sm font-bold uppercase">Detalhes da Auditoria</h2>
                <button onClick={() => setDetalheSelecionado(null)} aria-label="Fechar" className="rounded-lg p-1.5 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-bold uppercase text-slate-500">Data/Hora</p>
                    <p className="text-slate-800 dark:text-slate-200">{new Date(detalheSelecionado.criado_em).toLocaleString("pt-BR")}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-500">Ator</p>
                    <p className="text-slate-800 dark:text-slate-200">{detalheSelecionado.actor_email || "—"}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-500">Ação</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${acaoCor(detalheSelecionado.action)}`}>{detalheSelecionado.action}</span>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-500">Entidade</p>
                    <p className="text-slate-800 dark:text-slate-200">{detalheSelecionado.entity}</p>
                    <p className="font-mono text-[10px] text-slate-500">{detalheSelecionado.entity_id}</p>
                  </div>
                </div>

                {detalheSelecionado.before && (
                  <div>
                    <p className="mb-1 font-bold uppercase text-xs text-red-600">🔴 Antes (Before)</p>
                    <pre className="overflow-auto rounded-lg bg-red-50 p-3 text-xs dark:bg-red-950/30">
                      <code>{JSON.stringify(detalheSelecionado.before, null, 2)}</code>
                    </pre>
                  </div>
                )}

                {detalheSelecionado.after && (
                  <div>
                    <p className="mb-1 font-bold uppercase text-xs text-emerald-600">🟢 Depois (After)</p>
                    <pre className="overflow-auto rounded-lg bg-emerald-50 p-3 text-xs dark:bg-emerald-950/30">
                      <code>{JSON.stringify(detalheSelecionado.after, null, 2)}</code>
                    </pre>
                  </div>
                )}

                {detalheSelecionado.metadata && (
                  <div>
                    <p className="mb-1 font-bold uppercase text-xs text-blue-600">📋 Metadata</p>
                    <pre className="overflow-auto rounded-lg bg-blue-50 p-3 text-xs dark:bg-blue-950/30">
                      <code>{JSON.stringify(detalheSelecionado.metadata, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
