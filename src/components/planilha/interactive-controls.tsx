import type { DashboardFilters } from "@/lib/planilha/filters";
import { fmtData } from "@/lib/planilha/format";
export function FilterControls({ filtros, vendedores, comFilial = false, onChange }: { filtros: DashboardFilters; vendedores: { id: number; nome: string; cargo: string }[]; comFilial?: boolean; onChange?: (patch: Partial<DashboardFilters>) => void; }) {
  const periodos = [{ value: "3d", label: "3 dias" }, { value: "7d", label: "7 dias" }, { value: "mes", label: "Mês" }, { value: "custom", label: "Custom" }];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <select value={filtros.periodo} onChange={(e) => onChange?.({ periodo: e.target.value as any })} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white">
        {periodos.map((p) => <option key={p.value} value={p.value} className="bg-slate-800">{p.label}</option>)}
      </select>
      {filtros.periodo === "custom" && (<>
        <input type="date" value={filtros.inicio} onChange={(e) => onChange?.({ inicio: e.target.value, periodo: "custom" })} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white" />
        <span className="text-slate-400">→</span>
        <input type="date" value={filtros.fim} onChange={(e) => onChange?.({ fim: e.target.value, periodo: "custom" })} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white" />
      </>)}
      <select value={filtros.vendedorId ?? ""} onChange={(e) => onChange?.({ vendedorId: e.target.value ? Number(e.target.value) : null })} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white">
        <option value="" className="bg-slate-800">Todos</option>
        {vendedores.map((v) => <option key={v.id} value={v.id} className="bg-slate-800">{v.nome}</option>)}
      </select>
      <span className="ml-2 text-[10px] text-slate-400">{fmtData(filtros.inicio)} → {fmtData(filtros.fim)}</span>
    </div>
  );
}
export function ShareButton() { return null; }
export function PrintButton() { return <button onClick={() => typeof window !== "undefined" && window.print()} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10">🖨️ Imprimir</button>; }
export function ToolbarZoom() { return null; }
export function CommandKHint() { return null; }
