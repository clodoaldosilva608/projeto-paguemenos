import { useState } from "react";
import { notificacoesIniciais, type Notificacao } from "../data/mockData";
import { cn } from "../utils/cn";

const iconesPorTipo: Record<Notificacao["tipo"], { icon: string; cor: string }> = {
  sucesso: { icon: "✅", cor: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15" },
  alerta: { icon: "⚠️", cor: "bg-amber-50 text-amber-600 dark:bg-amber-500/15" },
  info: { icon: "ℹ️", cor: "bg-blue-50 text-blue-600 dark:bg-blue-500/15" },
  conquista: { icon: "🏆", cor: "bg-purple-50 text-purple-600 dark:bg-purple-500/15" },
};

interface NotificationCenterProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function NotificationCenter({ aberto, onFechar }: NotificationCenterProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(notificacoesIniciais);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  const marcarTodasComoLidas = () => {
    setNotificacoes((n) => n.map((x) => ({ ...x, lida: true })));
  };

  const remover = (id: number) => {
    setNotificacoes((n) => n.filter((x) => x.id !== id));
  };

  if (!aberto) return null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onFechar} />
      <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900 sm:w-96">
        <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-white/10">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Notificações</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
          {naoLidas > 0 && (
            <button
              onClick={marcarTodasComoLidas}
              className="text-xs font-medium text-blue-500 hover:text-blue-700"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notificacoes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl">🔔</p>
              <p className="mt-2 text-sm text-gray-400 dark:text-slate-500">Nenhuma notificação</p>
            </div>
          ) : (
            notificacoes.map((n) => {
              const estilo = iconesPorTipo[n.tipo];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group flex items-start gap-3 border-b border-gray-50 p-4 transition hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/5",
                    !n.lida && "bg-blue-50/30 dark:bg-blue-500/5"
                  )}
                >
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-base", estilo.cor)}>
                    {estilo.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{n.titulo}</p>
                      {!n.lida && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 dark:text-slate-500">{n.mensagem}</p>
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">{n.tempo}</p>
                  </div>
                  <button
                    onClick={() => remover(n.id)}
                    className="flex-shrink-0 text-gray-300 opacity-0 transition hover:text-rose-500 group-hover:opacity-100 dark:text-gray-600"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-gray-100 p-3 text-center dark:border-white/10">
          <button className="text-xs font-medium text-blue-500 hover:text-blue-700">
            Ver todas as notificações
          </button>
        </div>
      </div>
    </>
  );
}
