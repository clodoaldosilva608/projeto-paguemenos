import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  filial,
  vendasSemanais,
  evolucaoMensal,
  distribuicaoCategorias,
  colaboradores,
  resultadoLoja,
} from "../data/mockData";
import { brlMoeda, pct } from "../utils/format";
import { cn } from "../utils/cn";
import CountUp from "./CountUp";
import MotivationalFooter from "./MotivationalFooter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const moneyFmt = (v: any) => brlMoeda(Number(v));

const CORES = ["#0a3d8a", "#e30613", "#6b2c91", "#189f3a"];

const rankingFaturamento = colaboradores
  .filter((c) => c.resultados)
  .map((c) => ({
    nome: c.nome.charAt(0) + c.nome.slice(1).toLowerCase(),
    realizado: c.resultados!.faturamento.realizado,
    meta: c.resultados!.faturamento.meta,
  }))
  .sort((a, b) => b.realizado - a.realizado);

export default function ReportsView() {
  if (!colaboradores?.length || !resultadoLoja) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <p className="font-medium text-slate-600">Nenhum relatório disponível</p>
        <p className="mt-1 text-sm text-slate-500">Os relatórios aparecerão aqui quando houver dados.</p>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-2 border-b-2 border-[var(--pm-navy)] pb-4 dark:border-blue-400">
        <p className="font-cond text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Relatório Consolidado · {filial.nome}
        </p>
        <h1 className="font-display text-3xl uppercase tracking-tight text-[var(--pm-navy)] dark:text-blue-300 sm:text-[40px]">
          Análise de Performance
        </h1>
      </div>

      {/* Resumo loja */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Faturamento Loja", value: resultadoLoja.faturamento.realizado, prefix: "R$ ", pctVal: resultadoLoja.faturamento.atingimento, cor: resultadoLoja.faturamento.corStatus },
          { label: "Marcas Exclusivas", value: resultadoLoja.me.realizado, prefix: "R$ ", pctVal: resultadoLoja.me.atingimento, cor: resultadoLoja.me.corStatus },
          { label: "Genéricos", value: resultadoLoja.genericos.realizado, prefix: "R$ ", pctVal: resultadoLoja.genericos.atingimento, cor: resultadoLoja.genericos.corStatus },
          { label: "Projeção Fim de Mês", value: resultadoLoja.faturamento.projecao, prefix: "R$ ", pctVal: 101.3, cor: "green" as const },
        ].map((k, i) => {
          const corTxt =
            k.cor === "green"
              ? "text-[var(--pm-green)] dark:text-emerald-400"
              : k.cor === "yellow"
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-[var(--pm-red)] dark:text-red-400";
          return (
            <div
              key={i}
              className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="font-cond text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {k.label}
              </p>
              <p className="font-num mt-2 text-xl font-bold text-slate-800 dark:text-slate-100">
                <CountUp value={k.value} prefix={k.prefix} />
              </p>
              <p className={cn("font-num mt-1 text-sm font-bold", corTxt)}>{pct(k.pctVal)} atingimento</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Faturamento vs Meta por colaborador */}
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-cond text-sm uppercase tracking-[0.2em] text-[var(--pm-navy)] dark:text-blue-300">
            Realizado vs Meta · Faturamento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Comparativo por colaborador no período</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingFaturamento}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(10,61,138,0.05)" }}
                  contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={moneyFmt}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="meta" name="Meta" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill="#0a3d8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição */}
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-cond text-sm uppercase tracking-[0.2em] text-[var(--pm-navy)] dark:text-blue-300">
            Mix de Categorias
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Composição do faturamento</p>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribuicaoCategorias}
                  dataKey="valor"
                  nameKey="nome"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {distribuicaoCategorias.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={moneyFmt}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Evolução diária */}
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-cond text-sm uppercase tracking-[0.2em] text-[var(--pm-navy)] dark:text-blue-300">
          Faturamento Diário · Meta Diária
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Evolução do período 01 a 12/07/2026</p>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={vendasSemanais}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={moneyFmt}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="meta"
                name="Meta Diária"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="vendas"
                name="Realizado"
                stroke="#e30613"
                strokeWidth={3}
                dot={{ r: 4, fill: "#e30613" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolução mensal */}
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-cond text-sm uppercase tracking-[0.2em] text-[var(--pm-navy)] dark:text-blue-300">
          Evolução Mensal · Últimos 6 meses
        </h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={moneyFmt}
              />
              <Bar dataKey="vendas" name="Faturamento" fill="#6b2c91" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <MotivationalFooter />
    </motion.div>
  );
}
