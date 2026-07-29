import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FilialHeader from "./FilialHeader";
import MotivationalFooter from "./MotivationalFooter";
import CountUp from "./CountUp";
import ModalLancarVendas from "./ModalLancarVendas";
import { brlMoeda, pct } from "../utils/format";
import { Target, TrendingUp, Award, Loader2, AlertCircle, DollarSign } from "lucide-react";

export default function DashboardView() {
  const { usuario } = useAuth();
  const [metas, setMetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalVendasAberto, setModalVendasAberto] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any).from("metas_individuais").select("*").eq("usuario_id", usuario.id).order("categoria, periodo");
        if (error) throw error;
        setMetas(data || []);
      } catch (e: any) { setErro(e.message); } finally { setLoading(false); }
    })();
  }, [usuario]);

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (erro) return <div className="flex min-h-[400px] items-center justify-center"><AlertCircle className="h-8 w-8 text-red-500" /><p className="ml-2 text-red-600">{erro}</p></div>;

  if (metas.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <FilialHeader />
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <Target className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-700">Nenhuma meta definida ainda</h3>
          <p className="mt-1 text-sm text-slate-500">Olá, <strong>{usuario?.nome}</strong>! Seu gestor ainda não definiu suas metas.</p>
        </div>
        <MotivationalFooter />
      </motion.div>
    );
  }

  const metasMensais = metas.filter(m => m.periodo === "mensal");
  const metaFat = metasMensais.find(m => m.categoria === "faturamento");
  const metaDiaria = metas.find(m => m.periodo === "diaria" && m.categoria === "faturamento");
  const totalMeta = metaFat?.valor_meta || 0;
  const totalRealizado = metaFat?.valor_realizado || 0;
  const percentual = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;

  const KpiCard = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {Icon && <Icon className="mb-1 h-4 w-4 text-slate-400 dark:text-slate-500" />}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-800">{value}</p>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <FilialHeader />
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div><p className="text-sm font-semibold uppercase text-white/70">Minhas Metas</p><h2 className="text-2xl font-bold text-white">{usuario?.nome}</h2></div>
          <div className="text-right"><p className="text-xs uppercase text-white/60">% da Meta</p><p className={`text-3xl font-extrabold ${percentual >= 100 ? "text-emerald-300" : percentual >= 50 ? "text-amber-300" : "text-red-300"}`}>{pct(percentual)}</p></div>
        </div>
      </div>

      {/* BOTÃO LANÇAR VENDAS */}
      <button
        onClick={() => setModalVendasAberto(true)}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 p-4 shadow-sm transition hover:border-emerald-500 hover:shadow-md dark:border-emerald-700 dark:from-emerald-950/30 dark:to-green-950/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition group-hover:scale-110">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 dark:text-slate-100">Lançar Vendas Diárias</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">Registre seu faturamento, clientes e observações do dia</p>
          </div>
        </div>
        <div className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm group-hover:bg-emerald-500">
          Abrir →
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Meta Mensal" value={<CountUp value={totalMeta} prefix="R$ " />} icon={Target} />
        <KpiCard label="Realizado" value={<CountUp value={totalRealizado} prefix="R$ " />} icon={TrendingUp} />
        <KpiCard label="Meta Diária" value={metaDiaria ? brlMoeda(metaDiaria.valor_meta) : "—"} icon={Award} />
        <KpiCard label="% Atingido" value={pct(percentual)} icon={Award} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">Progresso da Meta Mensal</p><span className={`text-sm font-bold ${percentual >= 100 ? "text-emerald-600" : percentual >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct(percentual)}</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, percentual)}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${percentual >= 100 ? "bg-emerald-500" : percentual >= 50 ? "bg-amber-500" : "bg-red-500"}`} /></div>
      </div>
      {metasMensais.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500"><th className="px-4 py-2">Categoria</th><th className="px-4 py-2 text-right">Meta</th><th className="px-4 py-2 text-right">Realizado</th><th className="px-4 py-2 text-right">%</th></tr></thead>
            <tbody>{metasMensais.map(m => { const p = m.valor_meta > 0 ? (m.valor_realizado / m.valor_meta) * 100 : 0; return (<tr key={m.id} className="border-b border-slate-50"><td className="px-4 py-2 font-medium capitalize">{m.categoria.replace(/_/g, " ")}</td><td className="px-4 py-2 text-right text-slate-600">{brlMoeda(m.valor_meta)}</td><td className="px-4 py-2 text-right font-semibold">{brlMoeda(m.valor_realizado)}</td><td className="px-4 py-2 text-right"><span className={`font-bold ${p >= 100 ? "text-emerald-600" : p >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct(p)}</span></td></tr>); })}</tbody>
          </table>
        </div>
      )}
      <MotivationalFooter />

      {/* MODAL LANÇAR VENDAS */}
      <ModalLancarVendas
        aberto={modalVendasAberto}
        onClose={() => setModalVendasAberto(false)}
        onSalvou={() => {
          // Recarregar metas após lançar venda
          if (usuario) {
            (async () => {
              try {
                const { data } = await (supabase as any)
                  .from("metas_individuais")
                  .select("*")
                  .eq("usuario_id", usuario.id)
                  .order("categoria, periodo");
                setMetas(data || []);
              } catch {}
            })();
          }
        }}
      />
    </motion.div>
  );
}
