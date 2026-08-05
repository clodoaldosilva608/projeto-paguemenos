"use client";

import { fmtBRL, fmtPct } from "@/lib/planilha/format";

export type PodiumItem = {
  nome: string;
  valor: number;
  atingimento?: number;
  clientes?: number;
};

// Pódio: degraus sobem, campeão ganha coroa flutuante, brilho e anel pulsante.
export function Podium({ items }: { items: PodiumItem[] }) {
  if (items.length === 0) {
    return <div className="flex h-[180px] items-center justify-center text-[11px] text-slate-400">Sem ranking no período</div>;
  }

  const order = items.length >= 3
    ? [
        { item: items[1], pos: 2, h: 92, cor: "from-slate-300 to-slate-400", ring: "ring-slate-300", medal: "🥈", delay: 280 },
        { item: items[0], pos: 1, h: 124, cor: "from-amber-300 to-amber-500", ring: "ring-amber-300", medal: "🥇", delay: 60 },
        { item: items[2], pos: 3, h: 72, cor: "from-orange-300 to-orange-500", ring: "ring-orange-300", medal: "🥉", delay: 500 },
      ]
    : items.map((item, i) => ({
        item,
        pos: i + 1,
        h: 124 - i * 26,
        cor: i === 0 ? "from-amber-300 to-amber-500" : i === 1 ? "from-slate-300 to-slate-400" : "from-orange-300 to-orange-500",
        ring: i === 0 ? "ring-amber-300" : i === 1 ? "ring-slate-300" : "ring-orange-300",
        medal: i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉",
        delay: 60 + i * 220,
      }));

  const iniciais = (nome: string) =>
    nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div className="flex items-end justify-center gap-3 pt-6 pb-2">
      {order.map(({ item, pos, h, cor, ring, medal, delay }) => {
        const campeao = pos === 1;
        return (
          <div key={item.nome} className="relative flex w-[104px] flex-col items-center">
            {/* coroa flutuante do campeão */}
            {campeao && (
              <span
                className="absolute -top-5 text-lg float-y"
                style={{ animationDelay: `${delay + 800}ms` }}
                aria-hidden
              >
                👑
              </span>
            )}

            <div className="relative mb-2">
              {/* brilho radial girando atrás do campeão */}
              {campeao && (
                <span
                  className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-200 via-yellow-100 to-amber-300 blur-md sparkle"
                  style={{ animationDelay: `${delay + 700}ms` }}
                  aria-hidden
                />
              )}
              {/* anel pulsante */}
              {campeao && (
                <span
                  className="absolute -inset-1 rounded-full border-2 border-amber-300/70 animate-pulse-soft"
                  style={{ animationDelay: `${delay + 900}ms` }}
                  aria-hidden
                />
              )}
              <div
                className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${cor} text-[13px] font-extrabold text-slate-800 shadow-lg ring-2 ring-white transition-transform duration-300 hover:scale-110`}
                style={{ animation: "pop-in 480ms cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${delay + 420}ms` }}
              >
                {iniciais(item.nome)}
              </div>
              <span
                className="absolute -bottom-1 -right-1 text-base drop-shadow rise-in"
                style={{ animationDelay: `${delay + 640}ms` }}
              >
                {medal}
              </span>
            </div>

            <div
              className="mb-1.5 w-full truncate text-center text-[10px] font-bold leading-tight text-slate-800 rise-in"
              style={{ animationDelay: `${delay + 520}ms` }}
              title={item.nome}
            >
              {item.nome.split(" ")[0]}
            </div>
            <div
              className={`mb-1 text-[11px] font-extrabold rise-in ${campeao ? "text-amber-600" : "text-[#1a56c5]"}`}
              style={{ animationDelay: `${delay + 580}ms` }}
            >
              {fmtBRL(item.valor)}
            </div>
            {item.atingimento !== undefined && (
              <div className="mb-2 text-[9px] font-semibold text-slate-500 rise-in" style={{ animationDelay: `${delay + 640}ms` }}>
                {fmtPct(item.atingimento, 1)}
              </div>
            )}

            {/* degrau com brilho varrendo */}
            <div
              className={`relative w-full origin-bottom overflow-hidden rounded-t-xl bg-gradient-to-b ${cor} shadow-inner transition-transform duration-300 hover:scale-[1.03] ${ring}`}
              style={{
                height: h,
                animation: "grow-up 760ms cubic-bezier(0.16,1,0.3,1) both",
                animationDelay: `${delay}ms`,
              }}
            >
              <span className="absolute inset-0 shimmer-bar" style={{ animationDelay: `${delay + 900}ms` }} aria-hidden />
              <span className="relative flex justify-center pt-2 text-[18px] font-black text-white/90">{pos}º</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
