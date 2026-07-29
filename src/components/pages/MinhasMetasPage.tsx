import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brlMoeda, pct } from "../../utils/format";
import { Target, Loader2, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function MinhasMetasPage() {
  const { usuario } = useAuth();
  const [metas, setMetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    if (!usuario) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("metas_individuais")
        .select("*")
        .eq("usuario_id", usuario.id)
        .order("categoria, periodo");
      if (error) throw error;
      setMetas(data || []);
    } catch (e: any) {
      toast.error("Erro ao carregar metas: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [usuario]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  if (metas.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <Target className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">Nenhuma meta definida</h3>
          <p className="mt-1 text-sm text-slate-500">Olá, <strong>{usuario?.nome}</strong>! Seu gestor ainda não definiu suas metas. Quando as metas forem cadastradas, elas aparecerão aqui.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Minhas Metas</h2>
          <p className="text-sm text-slate-500">Suas metas individuais definidas pelo gestor</p>
        </div>
      </div>

      {/* Cards de metas */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metas.map((m, i) => {
          const pctVal = m.valor_meta > 0 ? (m.valor_realizado / m.valor_meta) * 100 : 0;
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">{m.periodo}</p>
              <h3 className="mt-1 text-sm font-bold capitalize text-slate-800">{m.categoria?.replace(/_/g, " ")}</h3>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs"><span className="text-slate-500">Meta:</span><span className="font-semibold">{brlMoeda(m.valor_meta)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">Realizado:</span><span className="font-semibold text-emerald-600">{brlMoeda(m.valor_realizado)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-slate-500">% Atingido:</span><span className={`font-bold ${pctVal >= 100 ? "text-emerald-600" : pctVal >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct(pctVal)}</span></div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${pctVal >= 100 ? "bg-emerald-500" : pctVal >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, pctVal)}%` }} />
              </div>
              {m.observacoes && <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">{m.observacoes}</p>}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
