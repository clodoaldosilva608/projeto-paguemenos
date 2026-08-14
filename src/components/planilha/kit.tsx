import type { ReactNode } from "react";
import Link from "@/components/planilha/noop-link";
import type { DashboardFilters } from "@/lib/planilha/filters";
import { FilterControls } from "@/components/planilha/interactive-controls";

// Constante estática usada no rodapé — sincronizada com src/lib/data.ts
const SYNC_LABEL = "28/07/2026 17:17";

// ── Logo Orionn ──────────────────────────────────────────────────────────────
export function OrionnLogo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        viewBox="0 0 40 40"
        style={{ width: small ? 26 : 38, height: small ? 26 : 38 }}
      >
        <circle cx="20" cy="20" r="16" fill="none" stroke="#fff" strokeWidth="3.5" />
        <circle cx="20" cy="20" r="7" fill="#fff" />
        <line x1="30" y1="8" x2="38" y2="2" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <div className="leading-none">
        <div
          className="font-extrabold tracking-wide text-white"
          style={{ fontSize: small ? 15 : 22 }}
        >
          ORIONN
        </div>
        {!small && (
          <div className="text-[8.5px] tracking-[0.28em] text-sky-200 mt-1">
            DASHBOARD EXECUTIVO
          </div>
        )}
      </div>
    </div>
  );
}

// ── Filtros do cabeçalho ────────────────────────────────────────────────────
export function HeaderFilters({
  filtros,
  vendedores,
  comFilial = false,
}: {
  filtros: DashboardFilters;
  vendedores: { id: number; nome: string; cargo: string }[];
  comFilial?: boolean;
}) {
  return <FilterControls filtros={filtros} vendedores={vendedores} comFilial={comFilial} />;
}

// ── Card KPI ─────────────────────────────────────────────────────────────────
import { ProgressRing } from "@/components/planilha/charts";
import { KpiValue, type KpiFormat } from "@/components/planilha/ui/kpi-value";

export function KpiCard({
  icon,
  title,
  value,
  subtitle,
  delta,
  deltaGood,
  bg = "#ffffff",
  dark = false,
  ring,
  animateValue,
  animateFormat = "plain",
}: {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  delta?: string;
  deltaGood?: boolean | null;
  bg?: string;
  dark?: boolean;
  ring?: number;
  /** Quando informado, o valor é contado de 0 até este número com animação */
  animateValue?: number;
  animateFormat?: KpiFormat;
}) {
  const txt = dark ? "text-white" : "text-slate-900";
  const sub = dark ? "text-white/75" : "text-slate-500";
  const gradient = dark
    ? `linear-gradient(135deg, ${bg} 0%, ${bg}dd 55%, rgba(0,0,0,0.35) 100%)`
    : undefined;
  return (
    <div
      className="group relative overflow-hidden rounded-xl p-3 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg flex gap-3 min-w-0"
      style={{ background: gradient ?? bg }}
    >
      {/* brilho decorativo */}
      {dark && (
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5 transition group-hover:bg-white/10" />
      )}
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        <div className={`flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-wide ${dark ? "text-white/90" : "text-[#1a56c5]"}`}>
          <span className="text-[15px]">{icon}</span>
          <span className="truncate">{title}</span>
        </div>
        <div className={`text-[17px] font-extrabold leading-tight ${txt}`}>
          {animateValue !== undefined ? (
            <KpiValue value={animateValue} format={animateFormat} fallback={value} />
          ) : (
            value
          )}
        </div>
        {subtitle && <div className={`text-[9.5px] ${sub}`}>{subtitle}</div>}
        {delta !== undefined && (
          <div
            className={`text-[9.5px] font-bold ${
              deltaGood === null
                ? dark ? "text-white/70" : "text-slate-400"
                : deltaGood
                  ? dark ? "text-emerald-300" : "text-emerald-600"
                  : dark ? "text-rose-300" : "text-rose-600"
            }`}
          >
            {delta}
          </div>
        )}
      </div>
      {ring !== undefined && dark && (
        <div className="flex items-center opacity-90 transition group-hover:opacity-100">
          <ProgressRing pct={ring} size={44} stroke={4} />
        </div>
      )}
    </div>
  );
}

// ── Painel branco (gráficos e tabelas) ───────────────────────────────────────
export function Panel({
  title,
  icon,
  children,
  className = "",
  delay = 0,
}: {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  /** Atraso (ms) da animação de entrada do painel */
  delay?: number;
}) {
  return (
    <div
      className={`rounded-lg bg-white shadow-md p-3 animate-slide-up ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="group/panel mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-800">
          {title}
        </h3>
        {icon && (
          <span className="text-sm text-[#1a56c5] float-y transition-transform duration-300 group-hover/panel:scale-125">
            {icon}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Pill de status ───────────────────────────────────────────────────────────
export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "Dentro da Meta": "bg-emerald-100 text-emerald-700 border-emerald-300",
    Atenção: "bg-amber-100 text-amber-700 border-amber-300",
    "Fora da Meta": "bg-rose-100 text-rose-700 border-rose-300",
  };
  return (
    <span
      className={`inline-block rounded border px-2.5 py-0.5 text-[9.5px] font-bold whitespace-nowrap ${styles[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

// ── Barra de progresso de atingimento ────────────────────────────────────────
export function ProgressBar({ pct, delay = 0 }: { pct: number; delay?: number }) {
  const color = pct >= 70 ? "#16a34a" : pct >= 30 ? "#f59e0b" : "#dc2626";
  return (
    <div className="h-2 w-full max-w-[110px] overflow-hidden rounded-full bg-slate-200">
      <div
        className="relative h-full overflow-hidden rounded-full bar-fill"
        style={{ width: `${Math.min(pct, 100)}%`, background: color, animationDelay: `${delay}ms` }}
      >
        <span className="absolute inset-0 shimmer-bar" style={{ animationDelay: `${delay + 600}ms` }} />
      </div>
    </div>
  );
}

// ── Texto de variação (Δ) ────────────────────────────────────────────────────
export function Delta({ v, digits = 1 }: { v: number | null; digits?: number }) {
  if (v === null) return <span className="text-slate-400 text-[10px]">—</span>;
  const good = v >= 0;
  return (
    <span className={`text-[10px] font-bold ${good ? "text-emerald-600" : "text-rose-600"}`}>
      {good ? "↑ " : "↓ "}
      {v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%
    </span>
  );
}

export function Medal({ pos }: { pos: number }) {
  const bg = pos === 1 ? "#fbbf24" : pos === 2 ? "#cbd5e1" : "#d97706";
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-extrabold text-slate-800"
      style={{ background: bg }}
    >
      {pos}º
    </span>
  );
}

// ── Abas da planilha (reexport neutro) ──────────────────────────────────────
export { TABS, type TabSlug } from "@/lib/planilha/tabs";
import { TABS as _TABS, type TabSlug as _TabSlug } from "@/lib/planilha/tabs";

export function TabBar({
  active,
  filtros,
  tabs,
  onTabChange,
  onFiltroChange,
  vendedores,
}: {
  active: _TabSlug | string;
  filtros: DashboardFilters;
  tabs?: { slug: string; label: string }[];
  onTabChange?: (slug: _TabSlug | string) => void;
  onFiltroChange?: (patch: Partial<DashboardFilters>) => void;
  vendedores?: { id: number; nome: string; cargo: string }[];
}) {
  const allTabs = tabs && tabs.length > 0 ? tabs : _TABS;
  return (
    <div className="flex flex-wrap items-center gap-1 border-t border-slate-300 bg-[#f8fafc] px-2 py-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-1 flex-wrap items-center gap-1 overflow-x-auto">
        {allTabs.map((t) => {
          const isActive = t.slug === active;
          return (
            <button
              key={t.slug}
              onClick={() => onTabChange?.(t.slug as any)}
              className={`whitespace-nowrap rounded-t border-x border-t px-3 py-1.5 text-[11px] ${
                isActive
                  ? "border-emerald-300 bg-emerald-100 font-bold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {isActive && "🔒 "}
              {t.label}
            </button>
          );
        })}
      </div>
      {vendedores && vendedores.length > 0 && (
        <FilterControls filtros={filtros} vendedores={vendedores} onChange={onFiltroChange} />
      )}
    </div>
  );
}

// ── Rodapé do dashboard ──────────────────────────────────────────────────────
export function DashFooter({ fonte = true }: { fonte?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-sky-200">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-sky-300 text-[8px]">
          i
        </span>
        Relatório gerado automaticamente pelo Sistema Orionn
      </div>
      {fonte && (
        <div className="flex items-center gap-3">
          <span>Fonte dos dados:</span>
          <span className="text-emerald-300">⚡ Supabase</span>
          <span className="text-green-300">▦ Google Sheets</span>
          <span className="text-amber-300">📊 Power BI</span>
          <span className="ml-2">🕒 Última atualização: {SYNC_LABEL}</span>
        </div>
      )}
    </div>
  );
}
