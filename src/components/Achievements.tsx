import { conquistas } from "../data/mockData";
import { cn } from "../utils/cn";

const raridadeEstilo: Record<string, { border: string; bg: string; text: string }> = {
  comum: { border: "border-gray-200 dark:border-white/10", bg: "bg-gray-50 dark:bg-white/5", text: "text-gray-600 dark:text-gray-300" },
  rara: { border: "border-blue-200 dark:border-blue-500/30", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  épica: { border: "border-purple-200 dark:border-purple-500/30", bg: "bg-purple-50 dark:bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  lendária: { border: "border-amber-200 dark:border-amber-500/30", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
};

export default function Achievements() {
  const desbloqueadas = conquistas.filter((c) => c.desbloqueada);
  const emProgresso = conquistas.filter((c) => !c.desbloqueada);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Conquistas</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-slate-500">
            {desbloqueadas.length} de {conquistas.length} desbloqueadas
          </p>
        </div>
        <div className="flex gap-1">
          {["comum", "rara", "épica", "lendária"].map((r) => (
            <span
              key={r}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                raridadeEstilo[r].bg,
                raridadeEstilo[r].text
              )}
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Desbloqueadas */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-slate-500">
          🏆 Conquistadas
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {desbloqueadas.map((c) => {
            const estilo = raridadeEstilo[c.raridade];
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 p-4 transition hover:scale-[1.02]",
                  estilo.border,
                  estilo.bg
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-4xl">{c.icone}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{c.titulo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-slate-500">{c.descricao}</p>
                    <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-slate-500">Desbloqueada em {c.data}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Em progresso */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-slate-500">
          ⏳ Em Progresso
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {emProgresso.map((c) => {
            const estilo = raridadeEstilo[c.raridade];
            return (
              <div
                key={c.id}
                className={cn(
                  "relative overflow-hidden rounded-xl border-2 border-dashed p-4 opacity-60 transition hover:opacity-100",
                  estilo.border
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-4xl grayscale">{c.icone}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{c.titulo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-slate-500">{c.descricao}</p>
                    {c.progresso !== undefined && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${c.progresso}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 dark:text-slate-500">
                          {c.progresso}% concluído
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
