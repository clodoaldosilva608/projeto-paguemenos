import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Meta } from "../data/mockData";
import { cn } from "../utils/cn";

const statusEstilo: Record<string, string> = {
  "Em dia": "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-500/15 dark:ring-emerald-500/30",
  Atenção: "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-500/15 dark:ring-amber-500/30",
  Atrasada: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-500/15 dark:ring-rose-500/30",
  Concluída: "bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-500/15 dark:ring-blue-500/30",
};

interface GoalDetailModalProps {
  meta: Meta | null;
  onFechar: () => void;
}

export default function GoalDetailModal({ meta, onFechar }: GoalDetailModalProps) {
  if (!meta) return null;

  // Dados fictícios de evolução da meta
  const evolucao = Array.from({ length: 15 }, (_, i) => ({
    dia: `${i + 1}`,
    valor: Math.round((meta.atual / 15) * (i + 1) * (0.8 + Math.random() * 0.4)),
  }));

  const diasRestantes = Math.max(0, Math.ceil((new Date(meta.prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const metaDiaria = diasRestantes > 0 ? Math.ceil((meta.meta - meta.atual) / diasRestantes) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm dark:bg-black/80"
      onClick={onFechar}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white p-6 dark:border-white/10 dark:bg-slate-900">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">{meta.categoria}</span>
            <h2 className="mt-1 text-2xl font-bold text-gray-800 dark:text-gray-100">{meta.titulo}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-slate-500">Prazo: {meta.prazo} · {diasRestantes} dias restantes</p>
          </div>
          <button
            onClick={onFechar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Status + Progresso principal */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-slate-500">Progresso Geral</p>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", statusEstilo[meta.status])}>
                  {meta.status}
                </span>
              </div>
              <p className="mt-2 text-4xl font-bold text-gray-800 dark:text-gray-100">{meta.progresso}%</p>
              <div className="mt-3 h-2 w-full rounded-full bg-gray-200 dark:bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  style={{ width: `${meta.progresso}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Meta Diária</p>
              <p className="mt-2 text-3xl font-bold text-blue-800 dark:text-blue-200">
                {metaDiaria} {meta.unidade}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">para atingir o alvo</p>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-100 p-4 dark:border-white/10">
              <p className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400 dark:text-slate-500">Atual</p>
              <p className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">
                {meta.unidade === "R$" ? `R$ ${meta.atual}` : meta.atual}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4 dark:border-white/10">
              <p className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400 dark:text-slate-500">Meta</p>
              <p className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">
                {meta.unidade === "R$" ? `R$ ${meta.meta}` : meta.meta}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4 dark:border-white/10">
              <p className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400 dark:text-slate-500">Faltam</p>
              <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
                {Math.max(0, meta.meta - meta.atual)} {meta.unidade}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4 dark:border-white/10">
              <p className="text-[10px] font-medium uppercase text-gray-500 dark:text-gray-400 dark:text-slate-500">Categoria</p>
              <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">{meta.categoria}</p>
            </div>
          </div>

          {/* Gráfico de evolução */}
          <div className="rounded-xl border border-gray-100 p-6 dark:border-white/10">
            <h3 className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-100">Evolução nos últimos 15 dias</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      backgroundColor: "white",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#3b82f6" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap gap-3">
            <button className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700">
              Atualizar Progresso
            </button>
            <button className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700">
              Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
