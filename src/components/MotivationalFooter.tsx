import { pilares } from "../data/mockData";

export default function MotivationalFooter() {
  return (
    <div className="mt-10 border-t border-dashed border-slate-300 pt-6 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm italic">
        {pilares.map((p, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="shimmer-text font-semibold not-italic">{p}</span>
            {i < pilares.length - 1 && (
              <span className="text-slate-400">•</span>
            )}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] uppercase tracking-[0.3em] text-slate-400">
        ORION · Gestão de Performance no Varejo
      </p>
    </div>
  );
}
