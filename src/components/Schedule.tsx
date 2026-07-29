import { compromissosHoje } from "../data/mockData";
import { cn } from "../utils/cn";

const tipoEstilo: Record<string, { bg: string; text: string; icon: string }> = {
  reuniao: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", icon: "💬" },
  treinamento: { bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", icon: "🎓" },
  followup: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", icon: "📞" },
  entrega: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", icon: "📦" },
};

export default function Schedule() {
  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Agenda de Hoje</h3>
          <p className="text-xs capitalize text-gray-400 dark:text-slate-500">{dataAtual}</p>
        </div>
        <button className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
          Ver tudo
        </button>
      </div>

      <div className="space-y-3">
        {compromissosHoje.map((c) => {
          const estilo = tipoEstilo[c.tipo];
          return (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-white/5 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/5"
            >
              <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base", estilo.bg)}>
                {estilo.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{c.horario}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", estilo.bg, estilo.text)}>
                    {c.tipo}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">{c.titulo}</p>
                {c.participantes && (
                  <div className="mt-1 flex items-center gap-1">
                    {c.participantes.map((p: any, i: number) => (
                      <span key={i} className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {p[0]}
                      </span>
                    ))}
                    <span className="ml-1 text-[10px] text-gray-400 dark:text-slate-500">
                      {c.participantes.length} {c.participantes.length === 1 ? "pessoa" : "pessoas"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
