// =============================================================
// ORION · Store reativo de vendas diárias (persistido em localStorage)
// =============================================================
import { vendasDiarias as vendasSeed, listaVendedores, type VendaDiaria } from "./vendasDiarias";

const STORAGE_KEY = "orion.vendas.v2";
const hasLS = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeVendas(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function keyOf(dataISO: string, vendedorId: string) {
  return `${dataISO}|${vendedorId}`;
}

export function recomputar(v: VendaDiaria): VendaDiaria {
  const valorVendaLiquida = Number(v.valorVendaLiquida.toFixed(2));
  const valorVendaRecepto = Number(v.valorVendaRecepto.toFixed(2));
  const qtdeClienteVendaLiquida = Math.max(0, Math.trunc(v.qtdeClienteVendaLiquida));
  const qtdeClienteRecepto = Math.max(0, Math.trunc(v.qtdeClienteRecepto));
  const valorVendaTotal = Number((valorVendaLiquida + valorVendaRecepto).toFixed(2));
  const qtdeClienteTotal = qtdeClienteVendaLiquida + qtdeClienteRecepto;
  return {
    ...v,
    valorVendaLiquida,
    valorVendaRecepto,
    valorVendaTotal,
    qtdeClienteVendaLiquida,
    qtdeClienteRecepto,
    qtdeClienteTotal,
    tkmVenda: qtdeClienteVendaLiquida > 0 ? Number((valorVendaLiquida / qtdeClienteVendaLiquida).toFixed(2)) : 0,
    tkmRecepto: qtdeClienteRecepto > 0 ? Number((valorVendaRecepto / qtdeClienteRecepto).toFixed(2)) : 0,
    tkmTotal: qtdeClienteTotal > 0 ? Number((valorVendaTotal / qtdeClienteTotal).toFixed(2)) : 0,
  };
}

// ============ Override exato da imagem enviada (Clodoaldo · Jul/2026) ============
const CLODOALDO = listaVendedores.find((v) => v.id === "u-clodoaldo")!;
const CLODOALDO_OVERRIDE: Array<{ data: string; liq: number; qLiq: number; rec: number; qRec: number }> = [
  { data: "2026-07-16", liq: 1908.96, qLiq: 55, rec: 2550.38, qRec: 3 },
  { data: "2026-07-15", liq: 863.84,  qLiq: 26, rec: 50.00,   qRec: 1 },
  { data: "2026-07-13", liq: 1670.35, qLiq: 47, rec: 0,       qRec: 0 },
  { data: "2026-07-11", liq: 1339.42, qLiq: 42, rec: 100.00,  qRec: 2 },
  { data: "2026-07-10", liq: 1155.76, qLiq: 34, rec: 0,       qRec: 0 },
  { data: "2026-07-09", liq: 1819.90, qLiq: 37, rec: 0,       qRec: 0 },
  { data: "2026-07-08", liq: 1398.04, qLiq: 40, rec: 0,       qRec: 0 },
  { data: "2026-07-06", liq: 1044.91, qLiq: 33, rec: 35.00,   qRec: 1 },
  { data: "2026-07-05", liq: 1108.05, qLiq: 30, rec: 0,       qRec: 0 },
  { data: "2026-07-04", liq: 1320.80, qLiq: 37, rec: 0,       qRec: 0 },
  { data: "2026-07-03", liq: 1301.38, qLiq: 41, rec: 0,       qRec: 0 },
  { data: "2026-07-02", liq: 646.49,  qLiq: 25, rec: 0,       qRec: 0 },
];

function seedInicial(): VendaDiaria[] {
  // Remove todas as linhas antigas de Clodoaldo e insere as corretas
  const semClodoaldo = vendasSeed.filter((v) => v.vendedorId !== "u-clodoaldo");
  const novasClodoaldo: VendaDiaria[] = CLODOALDO_OVERRIDE.map((o) =>
    recomputar({
      data: o.data,
      vendedorId: CLODOALDO.id,
      vendedorCodigo: CLODOALDO.codigo,
      vendedorNome: "CLODOALDO CONCEICAO SILVA",
      matricula: CLODOALDO.matricula,
      valorVendaLiquida: o.liq,
      qtdeClienteVendaLiquida: o.qLiq,
      tkmVenda: 0,
      valorVendaRecepto: o.rec,
      qtdeClienteRecepto: o.qRec,
      tkmRecepto: 0,
      valorVendaTotal: 0,
      qtdeClienteTotal: 0,
      tkmTotal: 0,
    })
  );
  return [...semClodoaldo, ...novasClodoaldo].sort((a, b) => b.data.localeCompare(a.data));
}

let vendas: VendaDiaria[] = [];

function persist() {
  if (!hasLS) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vendas));
  } catch { /* noop */ }
}

function inicializar() {
  if (!hasLS) {
    vendas = seedInicial();
    return;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      vendas = JSON.parse(raw) as VendaDiaria[];
    } else {
      vendas = seedInicial();
      persist();
    }
  } catch {
    vendas = seedInicial();
  }
}
inicializar();

// Marca a origem em metadata dentro do próprio objeto (campo extra tolerado)
type VendaComOrigem = VendaDiaria & { origem?: "manual" | "sheet" };

export const vendasStore = {
  listar(): VendaDiaria[] {
    return vendas.slice();
  },
  upsert(v: VendaDiaria, origem: "manual" | "sheet" = "manual") {
    const rec = recomputar(v) as VendaComOrigem;
    rec.origem = origem;
    const k = keyOf(rec.data, rec.vendedorId);
    const idx = vendas.findIndex((x) => keyOf(x.data, x.vendedorId) === k);
    if (idx >= 0) vendas[idx] = rec;
    else vendas.push(rec);
    vendas.sort((a, b) => b.data.localeCompare(a.data));
    persist();
    notify();
  },
  atualizar(dataISO: string, vendedorId: string, patch: Partial<VendaDiaria>) {
    const idx = vendas.findIndex((x) => x.data === dataISO && x.vendedorId === vendedorId);
    if (idx < 0) return;
    const atualizado = recomputar({ ...vendas[idx], ...patch }) as VendaComOrigem;
    atualizado.origem = "manual"; // edição manual congela a linha contra o sync
    vendas[idx] = atualizado;
    persist();
    notify();
  },
  remover(dataISO: string, vendedorId: string) {
    vendas = vendas.filter((x) => !(x.data === dataISO && x.vendedorId === vendedorId));
    persist();
    notify();
  },
  existe(dataISO: string, vendedorId: string) {
    return vendas.some((x) => x.data === dataISO && x.vendedorId === vendedorId);
  },
  resetar() {
    vendas = seedInicial();
    persist();
    notify();
  },
  /**
   * Faz o merge de linhas vindas do Google Sheets. Regras:
   * - Linhas com origem "manual" NUNCA são sobrescritas.
   * - Linhas com origem "sheet" (ou sem origem) recebem os novos valores.
   * - Vendedor é resolvido por match parcial de nome contra listaVendedores.
   */
  mergeFromSheet(rows: Array<{ data: string; vendedor: string; valor_liquido: number; clientes_liquido: number }>) {
    let mudou = false;
    for (const r of rows) {
      if (!r.data || !r.vendedor) continue;
      const nomeNorm = r.vendedor.toLowerCase().trim();
      const vendedor = listaVendedores.find((v) =>
        v.nome.toLowerCase().includes(nomeNorm) || nomeNorm.includes(v.nome.toLowerCase().split(" ")[0])
      );
      if (!vendedor) continue;
      const k = keyOf(r.data, vendedor.id);
      const existente = vendas.find((x) => keyOf(x.data, x.vendedorId) === k) as VendaComOrigem | undefined;
      if (existente && existente.origem === "manual") continue; // preserva edição do vendedor

      const linha: VendaDiaria = recomputar({
        data: r.data,
        vendedorId: vendedor.id,
        vendedorCodigo: vendedor.codigo,
        vendedorNome: vendedor.nome,
        matricula: vendedor.matricula,
        valorVendaLiquida: Number(r.valor_liquido) || 0,
        qtdeClienteVendaLiquida: Math.max(0, Math.trunc(Number(r.clientes_liquido) || 0)),
        tkmVenda: 0,
        valorVendaRecepto: existente?.valorVendaRecepto ?? 0,
        qtdeClienteRecepto: existente?.qtdeClienteRecepto ?? 0,
        tkmRecepto: 0, valorVendaTotal: 0, qtdeClienteTotal: 0, tkmTotal: 0,
      });
      (linha as VendaComOrigem).origem = "sheet";
      const idx = vendas.findIndex((x) => keyOf(x.data, x.vendedorId) === k);
      if (idx >= 0) vendas[idx] = linha; else vendas.push(linha);
      mudou = true;
    }
    if (mudou) {
      vendas.sort((a, b) => b.data.localeCompare(a.data));
      persist();
      notify();
    }
    return { atualizadas: rows.length, mudou };
  },
};

