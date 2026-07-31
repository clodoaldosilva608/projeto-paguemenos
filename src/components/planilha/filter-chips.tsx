"use client";

import { usePathname, useRouter, useSearchParams } from "@/components/planilha/noop-router";
import { useTransition } from "react";
import type { DashboardFilters } from "@/lib/planilha/filters";
import { fmtData } from "@/lib/planilha/format";

const PERIODO_LABEL: Record<string, string> = {
  "7d": "Últimos 7 dias",
  "3d": "Últimos 3 dias",
  mes: "Julho/2026",
  custom: "Personalizado",
};

export function FilterChips({
  filtros,
  vendedores,
  totalRegistros,
}: {
  filtros: DashboardFilters;
  vendedores: { id: number; nome: string }[];
  totalRegistros: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const vendedor = vendedores.find((v) => v.id === filtros.vendedorId);
  const padrao = filtros.periodo === "7d" && !filtros.vendedorId;

  const limpar = (chaves: string[]) => {
    const next = new URLSearchParams(params.toString());
    chaves.forEach((k) => next.delete(k));
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  };

  const Chip = ({ icon, label, onRemove }: { icon: string; label: string; onRemove?: () => void }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#28518f] bg-[#12315e]/80 py-1 pl-2.5 pr-2 text-[10px] font-semibold text-sky-100">
      <span className="text-[11px]">{icon}</span>
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="rounded-full px-1 text-sky-300 transition hover:bg-white/15 hover:text-white" aria-label={`Remover filtro ${label}`}>✕</button>
      )}
    </span>
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-70" : ""}`}>
      <span className="text-[9px] font-bold uppercase tracking-widest text-sky-300">Filtros ativos</span>
      <Chip icon="🗓" label={PERIODO_LABEL[filtros.periodo] ?? filtros.periodo} />
      <Chip
        icon="⇄"
        label={`${fmtData(filtros.inicio)} → ${fmtData(filtros.fim)}`}
        onRemove={filtros.periodo === "custom" ? () => limpar(["inicio", "fim", "periodo"]) : undefined}
      />
      {vendedor && <Chip icon="👤" label={vendedor.nome} onRemove={() => limpar(["vendedor"])} />}
      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white">
        {totalRegistros} lançamento{totalRegistros === 1 ? "" : "s"}
      </span>
      {!padrao && (
        <button
          type="button"
          onClick={() => limpar(["inicio", "fim", "periodo", "vendedor"])}
          className="rounded-full border border-rose-300/50 bg-rose-500/15 px-2.5 py-1 text-[10px] font-bold text-rose-200 transition hover:bg-rose-500/30"
        >
          ✕ Limpar tudo
        </button>
      )}
    </div>
  );
}
