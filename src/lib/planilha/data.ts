// Carregamento de dados para a Planilha Interna — adaptado do spreadsheet-with-manual.
// Usa Supabase em vez de Drizzle. Mantém IDs numéricos para compatibilidade com componentes visuais.

import { supabase } from "@/integrations/supabase/client";
import { CATEGORIAS, CATEGORIA_PARA_SLUG, SLUG_PARA_CATEGORIA, type Categoria } from "./format";

// Re-exports para compatibilidade com componentes do zip (que importam de data.ts)
export { fmtBRL, fmtPct, fmtData, statusDe } from "./format";
export { CATEGORIAS, CATEGORIA_PARA_SLUG, SLUG_PARA_CATEGORIA };
export type { Categoria };

// ── Período ──────────────────────────────────────────────────────────────────
export const PERIODO_INICIO = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
export const PERIODO_FIM = new Date().toISOString().slice(0, 10);

export type PeriodoRapido = "7d" | "3d" | "mes" | "custom";

export interface DashboardFilters {
  inicio: string;
  fim: string;
  vendedorId: number | null;
  periodo: PeriodoRapido;
}

export interface DashboardFilterInput {
  inicio?: string;
  fim?: string;
  vendedor?: string;
  periodo?: string;
}

const PERIODOS: Record<Exclude<PeriodoRapido, "custom">, { inicio: string; fim: string }> = {
  "7d": { inicio: PERIODO_INICIO, fim: PERIODO_FIM },
  "3d": { inicio: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), fim: PERIODO_FIM },
  mes: { inicio: new Date().toISOString().slice(0, 8) + "01", fim: PERIODO_FIM },
};

function isoValido(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function resolveFilters(input: DashboardFilterInput = {}): DashboardFilters {
  const periodo: PeriodoRapido =
    input.periodo === "3d" || input.periodo === "7d" || input.periodo === "mes" || input.periodo === "custom"
      ? input.periodo
      : "7d";
  const rapido = periodo === "custom" ? undefined : PERIODOS[periodo];
  let inicio = isoValido(input.inicio) ? input.inicio : rapido?.inicio ?? PERIODO_INICIO;
  let fim = isoValido(input.fim) ? input.fim : rapido?.fim ?? PERIODO_FIM;
  if (inicio > fim) [inicio, fim] = [fim, inicio];
  const rawVendedor = Number(input.vendedor);
  return {
    inicio,
    fim,
    vendedorId: Number.isInteger(rawVendedor) && rawVendedor > 0 ? rawVendedor : null,
    periodo: isoValido(input.inicio) || isoValido(input.fim) ? "custom" : periodo,
  };
}

function addDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function periodoAnterior(filtros: DashboardFilters) {
  const inicio = new Date(`${filtros.inicio}T12:00:00Z`).getTime();
  const fim = new Date(`${filtros.fim}T12:00:00Z`).getTime();
  const quantidadeDias = Math.max(1, Math.round((fim - inicio) / 86400000) + 1);
  return { inicio: addDias(filtros.inicio, -quantidadeDias), fim: addDias(filtros.inicio, -1) };
}

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface VendaRow {
  id: number;
  data: string;
  vendedorId: number;
  vendedorNome: string;
  categoria: Categoria;
  valor: number;
  clientes: number;
  ticketMedio: number;
}

export interface IndicadorRow {
  id: number;
  vendedorId: number;
  vendedorNome: string;
  categoria: Categoria;
  meta: number;
  realizado: number;
  projecao: number;
  atingimento: number;
}

export interface Agregado {
  meta: number;
  realizado: number;
  projecao: number;
  atingimento: number;
  clientes: number;
  ticketMedio: number;
  vendasValor: number;
  anterior: number;
  variacao: number | null;
}

export interface AuditoriaRow {
  id: number;
  criadoEm: string;
  acao: string;
  entidade: string;
  descricao: string;
}

export interface DashboardData {
  filtros: DashboardFilters;
  periodoAnterior: { inicio: string; fim: string };
  vendedoresList: { id: number; nome: string; cargo: string; matricula: string; email: string; status: string }[];
  todas: VendaRow[];
  atuais: VendaRow[];
  anteriores: VendaRow[];
  indicadores: IndicadorRow[];
  indicadoresTodos: IndicadorRow[];
  porCategoria: Record<Categoria, Agregado>;
  total: Agregado;
  porVendedor: Record<number, Agregado>;
  metaMap: Map<string, number>;
  auditoria: AuditoriaRow[];
}

function agrega(ind: IndicadorRow[], vendas: VendaRow[], prev: VendaRow[]): Agregado {
  const meta = ind.reduce((s, r) => s + r.meta, 0);
  const realizado = ind.reduce((s, r) => s + r.realizado, 0);
  const projecao = ind.reduce((s, r) => s + r.projecao, 0);
  const vendasValor = vendas.reduce((s, r) => s + r.valor, 0);
  const clientes = vendas.reduce((s, r) => s + r.clientes, 0);
  const anterior = prev.reduce((s, r) => s + r.valor, 0);
  return {
    meta, realizado, projecao,
    atingimento: meta > 0 ? (realizado / meta) * 100 : 0,
    clientes, ticketMedio: clientes > 0 ? vendasValor / clientes : 0,
    vendasValor, anterior,
    variacao: anterior > 0 ? ((vendasValor - anterior) / anterior) * 100 : null,
  };
}

export async function getDashboardData(
  input: DashboardFilterInput = {},
  args: { usuario: { id: string; perfil: string; filialId?: string | null } | null; filialFiltro?: string | null } = { usuario: null },
): Promise<DashboardData> {
  const filtros = resolveFilters(input);
  const antFiltro = periodoAnterior(filtros);
  const isAdmin = args.usuario?.perfil === "admin";
  const filialId = isAdmin ? (args.filialFiltro ?? null) : (args.usuario?.filialId ?? null);

  // 1) Profiles
  let pQ = supabase.from("profiles").select("id, nome, email, cargo, filial_id, ativo").eq("ativo", true).order("nome");
  if (filialId) pQ = pQ.eq("filial_id", filialId);
  const { data: pD, error: eP } = await pQ;
  if (eP) throw new Error(eP.message);
  const profiles = (pD || []) as any[];

  const uuidToNum = new Map<string, number>();
  profiles.forEach((p, i) => uuidToNum.set(p.id, i + 1));
  const nomeDe = new Map<number, string>();
  profiles.forEach((p) => nomeDe.set(uuidToNum.get(p.id)!, p.nome));

  // 2) Vendas
  let vQ = supabase.from("vendas_diarias").select("id, data, usuario_id, categoria, valor_venda, qtd_clientes").order("data");
  if (filialId) vQ = vQ.eq("filial_id", filialId);
  const { data: vD, error: eV } = await vQ;
  if (eV) throw new Error(eV.message);

  let vc = 1;
  const todas: VendaRow[] = (vD || [])
    .filter((v: any) => uuidToNum.has(v.usuario_id))
    .map((v: any) => {
      const num = uuidToNum.get(v.usuario_id)!;
      const clientes = Number(v.qtd_clientes || 0);
      const valor = Number(v.valor_venda || 0);
      return {
        id: vc++, data: v.data, vendedorId: num,
        vendedorNome: nomeDe.get(num) ?? "—",
        categoria: SLUG_PARA_CATEGORIA[v.categoria] ?? "Faturamento",
        valor, clientes, ticketMedio: clientes > 0 ? valor / clientes : 0,
      };
    });

  // 3) Metas
  let mQ = supabase.from("metas_individuais")
    .select("id, usuario_id, categoria, periodo, valor_meta, valor_realizado, valor_projecao")
    .eq("periodo", "mensal");
  if (filialId) mQ = mQ.eq("filial_id", filialId);
  const { data: mD, error: eM } = await mQ;
  if (eM) throw new Error(eM.message);

  let mc = 1;
  const indicadoresTodos: IndicadorRow[] = (mD || [])
    .filter((m: any) => uuidToNum.has(m.usuario_id))
    .map((m: any) => {
      const num = uuidToNum.get(m.usuario_id)!;
      const meta = Number(m.valor_meta || 0);
      const realizado = Number(m.valor_realizado || 0);
      return {
        id: mc++, vendedorId: num,
        vendedorNome: nomeDe.get(num) ?? "—",
        categoria: SLUG_PARA_CATEGORIA[m.categoria] ?? "Faturamento",
        meta, realizado, projecao: Number(m.valor_projecao || 0),
        atingimento: meta > 0 ? (realizado / meta) * 100 : 0,
      };
    });

  // 4) Auditoria
  const { data: aD } = await supabase.from("audit_log")
    .select("id, action, entity, entity_id, criado_em")
    .order("criado_em", { ascending: false }).limit(100);
  const auditoria: AuditoriaRow[] = (aD || []).map((a: any, i: number) => ({
    id: i + 1, criadoEm: a.criado_em || new Date().toISOString(),
    acao: a.action || "—", entidade: a.entity || "—",
    descricao: `${a.action} em ${a.entity}`,
  }));

  // 5) Filtrar
  const visivel = (vid: number) => !filtros.vendedorId || vid === filtros.vendedorId;
  const atuais = todas.filter((r) => r.data >= filtros.inicio && r.data <= filtros.fim && visivel(r.vendedorId));
  const anteriores = todas.filter((r) => r.data >= antFiltro.inicio && r.data <= antFiltro.fim && visivel(r.vendedorId));
  const indicadores = indicadoresTodos.filter((r) => visivel(r.vendedorId));

  // 6) Agregar
  const porCategoria = {} as Record<Categoria, Agregado>;
  for (const cat of CATEGORIAS) {
    porCategoria[cat] = agrega(
      indicadores.filter((r) => r.categoria === cat),
      atuais.filter((r) => r.categoria === cat),
      anteriores.filter((r) => r.categoria === cat),
    );
  }
  const total = agrega(indicadores, atuais, anteriores);
  const porVendedor: Record<number, Agregado> = {};
  for (const [num] of nomeDe.entries()) {
    porVendedor[num] = agrega(
      indicadoresTodos.filter((r) => r.vendedorId === num),
      todas.filter((r) => r.vendedorId === num && r.data >= filtros.inicio && r.data <= filtros.fim),
      todas.filter((r) => r.vendedorId === num && r.data >= antFiltro.inicio && r.data <= antFiltro.fim),
    );
  }

  const metaMap = new Map<string, number>();
  for (const r of indicadoresTodos) {
    const chaveVend = `${r.categoria}|${r.vendedorId}`;
    metaMap.set(chaveVend, (metaMap.get(chaveVend) ?? 0) + r.meta);
    const chaveLoja = `${r.categoria}|loja`;
    metaMap.set(chaveLoja, (metaMap.get(chaveLoja) ?? 0) + r.meta);
  }

  return {
    filtros,
    periodoAnterior: antFiltro,
    vendedoresList: profiles.map((p, i) => ({
      id: i + 1, nome: p.nome, cargo: p.cargo || "Vendedor",
      matricula: String(p.id).slice(0, 8), email: p.email,
      status: p.ativo ? "Ativo" : "Inativo",
    })),
    todas,
    atuais, anteriores, indicadores, indicadoresTodos,
    porCategoria, total, porVendedor, metaMap, auditoria,
  };
}

// ── Utilitários ──────────────────────────────────────────────────────────────
export function somaPorDia(rows: VendaRow[]): { data: string; valor: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.data, (map.get(r.data) ?? 0) + r.valor);
  return [...map.entries()].map(([data, valor]) => ({ data, valor })).sort((a, b) => a.data.localeCompare(b.data));
}

export function somaPorVendedor(rows: VendaRow[]): { vendedorId: number; nome: string; valor: number; clientes: number }[] {
  const map = new Map<number, { nome: string; valor: number; clientes: number }>();
  for (const r of rows) {
    const cur = map.get(r.vendedorId) ?? { nome: r.vendedorNome, valor: 0, clientes: 0 };
    cur.valor += r.valor; cur.clientes += r.clientes;
    map.set(r.vendedorId, cur);
  }
  return [...map.entries()].map(([vendedorId, v]) => ({ vendedorId, ...v })).sort((a, b) => b.valor - a.valor);
}

export function indicadoresPorVendedor(rows: IndicadorRow[]): { vendedorId: number; nome: string; meta: number; realizado: number; projecao: number; atingimento: number }[] {
  const map = new Map<number, { nome: string; meta: number; realizado: number; projecao: number }>();
  for (const r of rows) {
    const cur = map.get(r.vendedorId) ?? { nome: r.vendedorNome, meta: 0, realizado: 0, projecao: 0 };
    cur.meta += r.meta; cur.realizado += r.realizado; cur.projecao += r.projecao;
    map.set(r.vendedorId, cur);
  }
  return [...map.entries()].map(([vendedorId, v]) => ({ vendedorId, ...v, atingimento: v.meta > 0 ? (v.realizado / v.meta) * 100 : 0 })).sort((a, b) => b.atingimento - a.atingimento);
}
