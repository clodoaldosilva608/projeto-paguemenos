import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brlMoeda, pct } from "../utils/format";
import { FileBarChart, Loader2, TrendingUp, Target, DollarSign, Award } from "lucide-react";

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
        <p className="font-medium text-s-slate-700">Nenhum relatório disponível</p>
        <p className="mt-1 text-sm text-slate-500">Seus relatórios aparecerão aqui quando houver dados.</p>
      </div>
    );
  }

  // Calcular dados agregados para gráficos
  const metasMensais = metas.filter((m) => m.periodo === "mensal");
  const totalMeta = metasMensais.reduce((s, m) => s + Number(m.valor_meta || 0), 0);
  const totalRealizado = metasMensais.reduce((s, m) => s + Number(m.valor_realizado || 0), 0);
  const totalProjecao = metasMensais.reduce((s, m) => s + Number(m.valor_projecao || 0), 0);
  const pctGeral = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0;
  const pctProj = totalMeta > 0 ? (totalProjecao / totalMeta) * 100 : 0;

  // Dados para gráfico de barras (Meta vs Realizado por categoria)
  const categorias = metasMensais.map((m) => ({
    nome: (m.categoria || "").replace(/_/g, " "),
    meta: Number(m.valor_meta || 0),
    realizado: Number(m.valor_realizado || 0),
    projecao: Number(m.valor_projecao || 0),
    pct: m.valor_meta > 0 ? (m.valor_realizado / m.valor_meta) * 100 : 0,
  }));

  const maxValor = Math.max(...categorias.map((c) => Math.max(c.meta, c.realizado, c.projecao)), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Meus Relatórios</h2>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Meta Total" value={brlMoeda(totalMeta)} Icon={Target} cor="text-blue-600" />
        <KpiCard label="Realizado" value={brlMoeda(totalRealizado)} Icon={DollarSign} cor="text-emerald-600" />
        <KpiCard label="Projeção" value={brlMoeda(totalProjecao)} Icon={TrendingUp} cor="text-indigo-600" />
        <KpiCard label="% Atingido" value={pct(pctGeral)} Icon={Award} cor={pctGeral >= 100 ? "text-emerald-600" : pctGeral >= 50 ? "text-amber-600" : "text-red-600"} />
      </div>

      {/* Gráfico de barras: Meta vs Realizado vs Projeção */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">📊 Meta vs Realizado vs Projeção por Categoria</h3>
        <div className="space-y-4">
          {categorias.map((c, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold capitalize text-slate-700 dark:text-slate-200">{c.nome}</span>
                <span className="font-mono text-slate-500">
                  {brlMoeda(c.realizado)} / {brlMoeda(c.meta)}
                </span>
              </div>
              <div className="relative h-8 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {/* Barra de meta (fundo) */}
                <div
                  className="absolute inset-y-0 left-0 rounded-lg bg-blue-200 dark:bg-blue-900/40"
                  style={{ width: `${(c.meta / maxValor) * 100}%` }}
                />
                {/* Barra de projeção (linha tracejada) */}
                {c.projecao > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 border-r-2 border-dashed border-indigo-500"
                    style={{ width: `${(c.projecao / maxValor) * 100}%` }}
                    title={`Projeção: ${brlMoeda(c.projecao)}`}
                  />
                )}
                {/* Barra de realizado (sobreposta) */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.realizado / maxValor) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={`absolute inset-y-0 left-0 rounded-lg ${
                    c.pct >= 100 ? "bg-emerald-500" : c.pct >= 50 ? "bg-amber-500" : "bg-red-500"
                  }`}
                />
                {/* Texto % sobre a barra */}
                <div className="absolute inset-y-0 left-2 flex items-center">
                  <span className="text-[10px] font-bold text-white mix-blend-difference">
                    {c.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
              {c.projecao > 0 && (
                <p className="mt-0.5 text-[10px] text-slate-400">
                  Projeção: {brlMoeda(c.projecao)} ({((c.projecao / c.meta) * 100).toFixed(0)}% da meta)
                </p>
              )}
            </div>
          ))}
        </div>
        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-[10px] dark:border-white/10">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-blue-200 dark:bg-blue-900/40" /> Meta
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-500" /> Realizado
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 border-r-2 border-dashed border-indigo-500" /> Projeção
          </span>
        </div>
      </div>

      {/* Donut chart de progresso geral */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">🎯 Progresso Geral</h3>
          <div className="flex items-center justify-center">
            <DonutChart pct={pctGeral} pctProj={pctProj} />
          </div>
        </div>

        {/* Tabela detalhada */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h3 className="border-b border-slate-100 p-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:border-white/10">📋 Detalhes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-white/5">
                  <th className="px-4 py-2">Categoria</th>
                  <th className="px-4 py-2 text-right">Meta</th>
                  <th className="px-4 py-2 text-right">Realizado</th>
                  <th className="px-4 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {metasMensais.map((m) => {
                  const pctVal = m.valor_meta > 0 ? (m.valor_realizado / m.valor_meta) * 100 : 0;
                  return (
                    <tr key={m.id} className="border-b border-slate-50 dark:border-white/5">
                      <td className="px-4 py-2 font-medium capitalize">{m.categoria?.replace(/_/g, " ")}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{brlMoeda(m.valor_meta)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{brlMoeda(m.valor_realizado)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`font-bold ${pctVal >= 100 ? "text-emerald-600" : pctVal >= 50 ? "text-amber-600" : "text-red-600"}`}>
                          {pct(pctVal)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KpiCard({ label, value, Icon, cor }: { label: string; value: string; Icon: any; cor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${cor}`} />
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className={`mt-1 font-mono text-lg font-bold ${cor}`}>{value}</p>
    </motion.div>
  );
}

// Donut chart em SVG puro (sem dependências)
function DonutChart({ pct, pctProj }: { pct: number; pctProj: number }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, pct) / 100) * circumference;
  const offsetProj = circumference - (Math.min(100, pctProj) / 100) * circumference;

  return (
    <div className="relative">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Círculo de fundo */}
        <circle cx="80" cy="80" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-200 dark:text-slate-700" />
        {/* Círculo de projeção (mais largo, tracejado) */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray="8 4"
          className="text-indigo-400"
          strokeDashoffset={offsetProj}
          transform="rotate(-90 80 80)"
        />
        {/* Círculo de realizado */}
        <motion.circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className={pct >= 100 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-500"}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          transform="rotate(-90 80 80)"
        />
        {/* Texto central */}
        <text x="80" y="75" textAnchor="middle" className="fill-slate-800 text-2xl font-bold dark:fill-white">
          {pct.toFixed(0)}%
        </text>
        <text x="80" y="95" textAnchor="middle" className="fill-slate-400 text-[10px] uppercase">
          Realizado
        </text>
      </svg>
      <div className="mt-2 text-center text-[10px] text-slate-400">
        Projeção: <span className="font-bold text-indigo-500">{pctProj.toFixed(0)}%</span>
      </div>
    </div>
  );
}
