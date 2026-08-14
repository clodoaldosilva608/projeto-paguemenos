import type { Insight, InsightTone } from "@/lib/planilha/insights";

const TONE_STYLES: Record<InsightTone, { bar: string; chip: string; text: string }> = {
  positivo: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700" },
  atencao: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700" },
  critico: { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-200", text: "text-rose-700" },
  neutro: { bar: "bg-sky-500", chip: "bg-sky-50 text-sky-700 border-sky-200", text: "text-sky-700" },
};

const TONE_LABEL: Record<InsightTone, string> = {
  positivo: "Positivo",
  atencao: "Atenção",
  critico: "Crítico",
  neutro: "Informativo",
};

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {insights.map((i, idx) => {
        const s = TONE_STYLES[i.tone];
        return (
          <div
            key={i.id}
            className="group relative flex gap-3 overflow-hidden rounded-xl bg-white p-3 shadow-md rise-in hover-lift"
            style={{ animationDelay: `${idx * 95}ms` }}
          >
            {/* barra lateral cresce e ganha brilho no hover */}
            <span
              className={`absolute left-0 top-0 h-full w-1 origin-top overflow-hidden ${s.bar}`}
              style={{ animation: "grow-up 540ms cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${idx * 95 + 150}ms` }}
            >
              <span className="absolute inset-0 shimmer-bar opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </span>
            {/* brilho radial suave ao passar o mouse */}
            <span
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-900/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
            <span
              className="mt-0.5 text-xl leading-none svg-pop transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
              style={{ animationDelay: `${idx * 95 + 190}ms` }}
            >
              {i.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-[11.5px] font-extrabold text-slate-800">{i.title}</h4>
                <span className={`shrink-0 rounded-full border px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide ${s.chip}`}>
                  {TONE_LABEL[i.tone]}
                </span>
              </div>
              <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">{i.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExecutiveBanner({ texto, tone }: { texto: string; tone: InsightTone }) {
  const cores: Record<InsightTone, string> = {
    positivo: "from-emerald-600/90 to-emerald-800/90 border-emerald-400/40",
    atencao: "from-amber-600/90 to-amber-800/90 border-amber-400/40",
    critico: "from-rose-600/90 to-rose-800/90 border-rose-400/40",
    neutro: "from-sky-700/90 to-sky-900/90 border-sky-400/40",
  };
  const icones: Record<InsightTone, string> = { positivo: "🏆", atencao: "⚡", critico: "🚨", neutro: "ⓘ" };
  return (
    <div className={`flex items-center gap-3 rounded-xl border bg-gradient-to-r ${cores[tone]} px-4 py-2.5 shadow-md animate-slide-up`}>
      <span className="text-lg animate-pulse-soft">{icones[tone]}</span>
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-widest text-white/70">Resumo Executivo</div>
        <p className="text-[12px] font-semibold text-white">{texto}</p>
      </div>
    </div>
  );
}
