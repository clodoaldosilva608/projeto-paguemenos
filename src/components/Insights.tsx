import { useState } from "react";
import { gerarInsights, type Insight } from "../utils/insights";
import { cn } from "../utils/cn";

const tipoEstilo: Record<Insight["tipo"], { bg: string; border: string; text: string; badge: string }> = {
  positivo: {
    bg: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/5",
    border: "border-emerald-200 dark:border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  alerta: {
    bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5",
    border: "border-amber-200 dark:border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  dica: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/5",
    border: "border-blue-200 dark:border-blue-500/30",
    text: "text-blue-700 dark:text-blue-400",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  },
};

export default function Insights() {
  const insights = gerarInsights();
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? insights : insights.slice(0, 3);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-sm text-white">
            💡
          </span>
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Insights Inteligentes</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-slate-400">
              Análises personalizadas baseadas no seu desempenho
            </p>
          </div>
        </div>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
          IA Orion
        </span>
      </div>

      <div className="space-y-3">
        {visiveis.map((i) => {
          const estilo = tipoEstilo[i.tipo];
          return (
            <div
              key={i.id}
              className={cn(
                "group rounded-xl border p-4 transition hover:shadow-md",
                estilo.bg,
                estilo.border
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{i.icone}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{i.titulo}</h4>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", estilo.badge)}>
                      {i.tipo}
                    </span>
                  </div>
                  <p className={cn("mt-1 text-sm", estilo.text)}>{i.descricao}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {insights.length > 3 && (
        <button
          onClick={() => setExpandido(!expandido)}
          className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          {expandido ? "Ver menos" : `Ver mais ${insights.length - 3} insights`}
        </button>
      )}
    </div>
  );
}
