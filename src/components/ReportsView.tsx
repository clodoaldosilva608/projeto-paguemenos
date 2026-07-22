import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brlMoeda, pct } from "../utils/format";
import { FileBarChart, Loader2 } from "lucide-react";

export default function ReportsView() {
  const { usuario } = useAuth();
  const [metas, setMetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any).from("metas_individuais").select("*").eq("usuario_id", usuario.id).order("categoria, periodo");
        setMetas(data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [usuario]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;

  if (metas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <FileBarChart className="mx-auto mb-3 h-12 w-12 text-slate-300" />
        <p className="font-medium text-slate-700">Nenhum relatório disponível</p>
        <p className="mt-1 text-sm text-slate-500">Seus relatórios aparecerão aqui quando houver dados.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Meus Relatórios</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-2">Categoria</th><th className="px-4 py-2">Período</th>
            <th className="px-4 py-2 text-right">Meta</th><th className="px-4 py-2 text-right">Realizado</th>
            <th className="px-4 py-2 text-right">%</th><th className="px-4 py-2 text-center">Status</th>
          </tr></thead>
          <tbody>{metas.map(m => {
            const pctVal = m.valor_meta > 0 ? (m.valor_realizado / m.valor_meta) * 100 : 0;
            return (
              <tr key={m.id} className="border-b border-slate-50">
                <td className="px-4 py-2 font-medium capitalize">{m.categoria?.replace(/_/g, " ")}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{m.periodo}</td>
                <td className="px-4 py-2 text-right text-slate-600">{brlMoeda(m.valor_meta)}</td>
                <td className="px-4 py-2 text-right font-semibold">{brlMoeda(m.valor_realizado)}</td>
                <td className="px-4 py-2 text-right"><span className={`font-bold ${pctVal >= 100 ? "text-emerald-600" : pctVal >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct(pctVal)}</span></td>
                <td className="px-4 py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === "atingida" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{m.status}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </motion.div>
  );
}
