// =============================================================
// ORION · Vendas Store (sem dados fake — usa Supabase)
// =============================================================
type VendaDiaria = { [key: string]: any };

const STORAGE_KEY = "orion.vendas.v2";
const hasLS = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }
export function subscribeVendas(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function keyOf(dataISO: string, vendedorId: string) { return `${dataISO}|${vendedorId}`; }

function recomputar(v: any): VendaDiaria {
  const valorVendaLiquida = Number(v.valorVendaLiquida || 0);
  const valorVendaRecepto = Number(v.valorVendaRecepto || 0);
  const qtdeClienteVendaLiquida = Math.max(0, Math.trunc(v.qtdeClienteVendaLiquida || 0));
  const qtdeClienteRecepto = Math.max(0, Math.trunc(v.qtdeClienteRecepto || 0));
  const valorVendaTotal = Number((valorVendaLiquida + valorVendaRecepto).toFixed(2));
  const qtdeClienteTotal = qtdeClienteVendaLiquida + qtdeClienteRecepto;
  return { ...v, valorVendaLiquida, valorVendaRecepto, valorVendaTotal, qtdeClienteVendaLiquida, qtdeClienteRecepto, qtdeClienteTotal,
    tkmVenda: qtdeClienteVendaLiquida > 0 ? Number((valorVendaLiquida / qtdeClienteVendaLiquida).toFixed(2)) : 0,
    tkmRecepto: qtdeClienteRecepto > 0 ? Number((valorVendaRecepto / qtdeClienteRecepto).toFixed(2)) : 0,
    tkmTotal: qtdeClienteTotal > 0 ? Number((valorVendaTotal / qtdeClienteTotal).toFixed(2)) : 0,
  };
}

let vendas: VendaDiaria[] = [];

function persist() { if (!hasLS) return; try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vendas)); } catch {} }
function inicializar() {
  if (!hasLS) return;
  try { const raw = window.localStorage.getItem(STORAGE_KEY); if (raw) vendas = JSON.parse(raw); } catch { vendas = []; }
}
inicializar();

export const vendasStore = {
  listar(): any[] { return vendas.slice(); },
  upsert(v: any) { const rec = recomputar(v); const k = keyOf(rec.data, rec.vendedorId); const idx = vendas.findIndex((x: any) => keyOf(x.data, x.vendedorId) === k); if (idx >= 0) vendas[idx] = rec; else vendas.push(rec); vendas.sort((a: any, b: any) => b.data.localeCompare(a.data)); persist(); notify(); },
  atualizar(..._args: any[]) {},
  remover(..._args: any[]) {},
  existe(_a: string, _b?: string) { return false; },
  resetar() { vendas = []; persist(); notify(); },
  mergeFromSheet(_data: any) { return { atualizadas: 0, mudou: false }; },
};
