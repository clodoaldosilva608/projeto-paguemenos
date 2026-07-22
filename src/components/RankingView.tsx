import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brlMoeda, pct } from "../utils/format";
import { Trophy, Loader2, Target } from "lucide-react";

export default function RankingView() {
  const { usuario } = useAuth();
  const [metas, setMetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await (supabase as any).from("metas_individuais").select("*").eq("usuario_id", usuario.id).eq("periodo", "mensal").order("categoria");
        setMetas(data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [usuario]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;

  if (metas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <Trophy className="mx-auto mb-3 h-12 w-12 text-slate-300" />
        <p className="font-medium text-slate-700">Nenhum resultado disponível</p>
        <p className="mt-1 text-sm text-slate-500">Seus resultados aparecerão aqui quando o gestor definir suas metas.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Meus Resultados</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metas.map((m, i) => {
          const pctVal = m.valor_meta > 0 ? (m.valor_realizado / m.valor_meta) * 100 : 0;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold capitalize text-slate-800">{m.categoria?.replace(/_/g, " ")}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pctVal >= 100 ? "bg-emerald-100 text-emerald-700" : pctVal >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{pct(pctVal)}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Meta:</span><span className="font-semibold">{brlMoeda(m.valor_meta)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Realizado:</span><span className="font-semibold text-emerald-600">{brlMoeda(m.valor_realizado)}</span></div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${pctVal >= 100 ? "bg-emerald-500" : pctVal >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, pctVal)}%` }} /></div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
