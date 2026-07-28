import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============================================================
// PALETA E CONSTANTES — cópia exata do modelo /route.ts
// ============================================================
const NAVY = "FF0A1F3D";
const NAVY2 = "FF0D2B57";
const HEADER_BLUE = "FF12315E";
const BLUE = "FF1A56C5";
const GREEN = "FF16A34A";
const YELLOW = "FFF59E0B";
const RED = "FFDC2626";
const LIGHT = "FFF1F5F9";

const BRL = '"R$" #,##0.00';
const PCT = "0.00%";
const IND = "Indicadores";
const HIST = "'06 - Histórico de Vendas'";

// ── Período dinâmico (últimos 7 dias até hoje) ───────────────────────────────
function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function subDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}
const PERIODO_FIM = hojeIso();
const PERIODO_INICIO = subDias(PERIODO_FIM, 6);
const PERIODO_ANT_INICIO = subDias(PERIODO_INICIO, 7);
const PERIODO_ANT_FIM = subDias(PERIODO_INICIO, 1);

function fmtDataBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fmtSyncLabel(): string {
  const agora = new Date();
  const dd = String(agora.getDate()).padStart(2, "0");
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const yyyy = agora.getFullYear();
  const hh = String(agora.getHours()).padStart(2, "0");
  const mi = String(agora.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
const SYNC_LABEL = fmtSyncLabel();

// ── Categorias ───────────────────────────────────────────────────────────────
const CATEGORIAS = [
  "Faturamento",
  "Marcas Exclusivas",
  "Genéricos",
  "Super Desconto",
] as const;
type Categoria = (typeof CATEGORIAS)[number];

const SLUG_PARA_CATEGORIA: Record<string, Categoria> = {
  faturamento: "Faturamento",
  marcas_exclusivas: "Marcas Exclusivas",
  genericos: "Genéricos",
  super_desconto: "Super Desconto",
};

// ── Tipos (mesmas interfaces do data.ts do modelo) ──────────────────────────
type WS = import("exceljs").Worksheet;
type ExcelCell = import("exceljs").Cell;
type ExcelRow = import("exceljs").Row;

export interface VendaRow {
  id: string;
  data: string;
  vendedorId: string;
  vendedorNome: string;
  categoria: Categoria;
  valor: number;
  clientes: number;
  ticketMedio: number;
  transacoes: number;
}

export interface IndicadorRow {
  id: string;
  vendedorId: string;
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
  status: string;
  anterior: number;
  variacao: number | null;
  clientes: number;
  transacoes: number;
  ticketMedio: number;
  vendasValor: number;
}

export interface VendedorInfo {
  id: string;
  nome: string;
  cargo: string;
  matricula: string;
  email: string;
  status: string;
}

export interface DashboardData {
  vendedoresList: VendedorInfo[];
  todas: VendaRow[];
  indicadoresTodos: IndicadorRow[];
  porCategoria: Record<Categoria, Agregado>;
  total: Agregado;
  porVendedor: Record<string, Agregado>;
}

// ============================================================
// STATUS — cópia exata do data.ts do modelo
// ============================================================
export function statusDe(
  pct: number,
): "Dentro da Meta" | "Atenção" | "Fora da Meta" {
  if (pct >= 70) return "Dentro da Meta";
  if (pct >= 30) return "Atenção";
  return "Fora da Meta";
}

// ============================================================
// HELPERS DE EXCEL — cópia exata do route.ts do modelo
// ============================================================
function fill(color: string): any {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

const thinBorder: any = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

function titleBlock(ws: WS, title: string, subtitle: string, lastCol: string) {
  ws.mergeCells(`A1:${lastCol}1`);
  const t = ws.getCell("A1");
  t.value = `ORIONN — ${title}`;
  t.font = { name: "Poppins", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = fill(NAVY);
  t.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 34;

  ws.mergeCells(`A2:${lastCol}2`);
  const s = ws.getCell("A2");
  s.value = `${subtitle}  ·  Período: ${fmtDataBR(PERIODO_INICIO)} a ${fmtDataBR(
    PERIODO_FIM,
  )}  ·  Última sincronização: ${SYNC_LABEL}`;
  s.font = { name: "Poppins", size: 10, color: { argb: "FFBFDBFE" } };
  s.fill = fill(NAVY);
  s.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 20;
}

function headerRow(ws: WS, rowIdx: number, labels: string[]) {
  const row = ws.getRow(rowIdx);
  labels.forEach((l, i) => {
    const c = row.getCell(i + 1);
    c.value = l;
    c.font = { name: "Poppins", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = fill(HEADER_BLUE);
    c.alignment = {
      vertical: "middle",
      horizontal: i <= 1 ? "left" : "center",
      wrapText: true,
    };
    c.border = thinBorder;
  });
  row.height = 22;
}

function sectionRow(ws: WS, rowIdx: number, text: string, lastCol: string) {
  ws.mergeCells(`A${rowIdx}:${lastCol}${rowIdx}`);
  const c = ws.getCell(`A${rowIdx}`);
  c.value = text;
  c.font = { name: "Poppins", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  c.fill = fill(NAVY2);
  c.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(rowIdx).height = 22;
}

function statusCell(c: ExcelCell, pctCellRef: string, pct: number) {
  const st = statusDe(pct);
  c.value = {
    formula: `IFS(${pctCellRef}>=0.7,"Dentro da Meta",${pctCellRef}>=0.3,"Atenção",TRUE,"Fora da Meta")`,
    result: st,
  };
  const color = st === "Dentro da Meta" ? GREEN : st === "Atenção" ? YELLOW : RED;
  c.font = { name: "Poppins", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
  c.fill = fill(color);
  c.alignment = { horizontal: "center", vertical: "middle" };
  c.border = thinBorder;
}

function kpiBlock(
  ws: WS,
  startRow: number,
  kpis: {
    label: string;
    formula?: string;
    value: number | string;
    fmt?: string;
    color?: string;
  }[],
) {
  const lr = ws.getRow(startRow);
  const vr = ws.getRow(startRow + 1);
  kpis.forEach((k, i) => {
    const lc = lr.getCell(i + 1);
    lc.value = k.label.toUpperCase();
    lc.font = { name: "Poppins", size: 8, bold: true, color: { argb: "FFFFFFFF" } };
    lc.fill = fill(k.color ?? BLUE);
    lc.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    const vc = vr.getCell(i + 1);
    vc.value = k.formula
      ? { formula: k.formula, result: k.value as number }
      : k.value;
    if (k.fmt) vc.numFmt = k.fmt;
    vc.font = { name: "Poppins", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    vc.fill = fill(k.color ?? BLUE);
    vc.alignment = { horizontal: "center", vertical: "middle" };
  });
  lr.height = 24;
  vr.height = 28;
}

function styleDataRow(r: ExcelRow, zebra: boolean) {
  r.eachCell((c) => {
    c.border = thinBorder;
    if (!c.font?.color) c.font = { name: "Poppins", size: 9 };
    c.alignment = { ...c.alignment, vertical: "middle" };
    if (zebra && !c.fill) c.fill = fill(LIGHT);
  });
  r.height = 20;
}

// ============================================================
// AGREGAÇÃO — cópia do data.ts do modelo (adaptada p/ string UUID)
// ============================================================
function agrega(
  indRows: IndicadorRow[],
  vendaRows: VendaRow[],
  prevRows: VendaRow[],
): Agregado {
  const meta = indRows.reduce((s, r) => s + r.meta, 0);
  const realizado = indRows.reduce((s, r) => s + r.realizado, 0);
  const projecao = indRows.reduce((s, r) => s + r.projecao, 0);
  const vendasValor = vendaRows.reduce((s, r) => s + r.valor, 0);
  const clientes = vendaRows.reduce((s, r) => s + r.clientes, 0);
  const anterior = prevRows.reduce((s, r) => s + r.valor, 0);
  const atingimento = meta > 0 ? (realizado / meta) * 100 : 0;
  return {
    meta,
    realizado,
    projecao,
    atingimento,
    status: statusDe(atingimento),
    anterior,
    variacao: anterior > 0 ? ((vendasValor - anterior) / anterior) * 100 : null,
    clientes,
    transacoes: clientes,
    ticketMedio: clientes > 0 ? vendasValor / clientes : 0,
    vendasValor,
  };
}

function indicadoresPorVendedor(rows: IndicadorRow[]): {
  vendedorId: string;
  nome: string;
  meta: number;
  realizado: number;
  projecao: number;
  atingimento: number;
}[] {
  const map = new Map<
    string,
    { nome: string; meta: number; realizado: number; projecao: number }
  >();
  for (const r of rows) {
    const cur =
      map.get(r.vendedorId) ??
      { nome: r.vendedorNome, meta: 0, realizado: 0, projecao: 0 };
    cur.meta += r.meta;
    cur.realizado += r.realizado;
    cur.projecao += r.projecao;
    map.set(r.vendedorId, cur);
  }
  return [...map.entries()]
    .map(([vendedorId, v]) => ({
      vendedorId,
      ...v,
      atingimento: v.meta > 0 ? (v.realizado / v.meta) * 100 : 0,
    }))
    .sort((a, b) => b.realizado - a.realizado);
}

// ============================================================
// CAMADA DE DADOS — Supabase (substitui Drizzle do modelo)
// ============================================================
async function getDashboardData(): Promise<DashboardData> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Busca perfis ativos
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, nome, email, cargo, ativo")
    .eq("ativo", true);

  // Busca roles de vendedor
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "vendedor");

  // Busca matrículas (tabela auxiliar login_matricula) — opcional
  const { data: matriculas } = await supabaseAdmin
    .from("login_matricula")
    .select("user_id, matricula, ativo")
    .eq("ativo", true);

  // Busca metas individuais (todas — sem filtro de período para snapshot completo)
  const { data: metas } = await supabaseAdmin
    .from("metas_individuais")
    .select("*");

  // Busca vendas diárias (todas)
  const { data: vendas } = await supabaseAdmin
    .from("vendas_diarias")
    .select("*")
    .order("data", { ascending: true });

  // Filtra apenas vendedores ativos
  const vendedorIds = new Set((roles ?? []).map((r) => r.user_id));
  const vendedoresList: VendedorInfo[] = (profiles ?? [])
    .filter((p) => vendedorIds.has(p.id))
    .map((p) => {
      const mat = (matriculas ?? []).find((m) => m.user_id === p.id);
      return {
        id: p.id,
        nome: p.nome,
        cargo: p.cargo ?? "Vendedor",
        matricula: mat?.matricula ?? "",
        email: p.email ?? "",
        status: p.ativo ? "Ativo" : "Inativo",
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // Mapa id -> nome
  const nomeDe = new Map((profiles ?? []).map((p) => [p.id, p.nome]));

  // Mapeia vendas para VendaRow
  const todas: VendaRow[] = (vendas ?? [])
    .map((r) => {
      const clientes = Number(r.qtd_clientes ?? 0);
      const valor = Number(r.valor_venda ?? 0);
      return {
        id: r.id,
        data: r.data,
        vendedorId: r.usuario_id,
        vendedorNome: nomeDe.get(r.usuario_id) ?? "—",
        categoria: SLUG_PARA_CATEGORIA[r.categoria] ?? "Faturamento",
        valor,
        clientes,
        ticketMedio: Number(r.ticket_medio ?? 0),
        transacoes: clientes,
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));

  // Mapeia metas para IndicadorRow
  const indicadoresTodos: IndicadorRow[] = (metas ?? [])
    .map((r) => {
      const meta = Number(r.valor_meta ?? 0);
      const realizado = Number(r.valor_realizado ?? 0);
      return {
        id: r.id,
        vendedorId: r.usuario_id,
        vendedorNome: nomeDe.get(r.usuario_id) ?? "—",
        categoria: SLUG_PARA_CATEGORIA[r.categoria] ?? "Faturamento",
        meta,
        realizado,
        projecao: Number(r.valor_projecao ?? 0),
        atingimento: meta > 0 ? (realizado / meta) * 100 : 0,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  // Filtra por período atual e anterior
  const atuais = todas.filter(
    (r) => r.data >= PERIODO_INICIO && r.data <= PERIODO_FIM,
  );
  const anteriores = todas.filter(
    (r) => r.data >= PERIODO_ANT_INICIO && r.data <= PERIODO_ANT_FIM,
  );

  // Agrega por categoria
  const porCategoria = {} as Record<Categoria, Agregado>;
  for (const cat of CATEGORIAS) {
    porCategoria[cat] = agrega(
      indicadoresTodos.filter((r) => r.categoria === cat),
      atuais.filter((r) => r.categoria === cat),
      anteriores.filter((r) => r.categoria === cat),
    );
  }

  // Agrega total
  const total = agrega(indicadoresTodos, atuais, anteriores);

  // Agrega por vendedor (usa TODAS as vendas do vendedor no período atual)
  const porVendedor: Record<string, Agregado> = {};
  for (const v of vendedoresList) {
    porVendedor[v.id] = agrega(
      indicadoresTodos.filter((r) => r.vendedorId === v.id),
      todas.filter(
        (r) =>
          r.vendedorId === v.id &&
          r.data >= PERIODO_INICIO &&
          r.data <= PERIODO_FIM,
      ),
      todas.filter(
        (r) =>
          r.vendedorId === v.id &&
          r.data >= PERIODO_ANT_INICIO &&
          r.data <= PERIODO_ANT_FIM,
      ),
    );
  }

  return {
    vendedoresList,
    todas,
    indicadoresTodos,
    porCategoria,
    total,
    porVendedor,
  };
}

// ============================================================
// FORMULAS e MANUAL — copiados de documentacao.tsx do modelo
// ============================================================
const FORMULAS: {
  grupo: string;
  itens: { nome: string; formula: string; desc: string }[];
}[] = [
  {
    grupo: "KPIs Principais",
    itens: [
      {
        nome: "Vendas do Período (R$)",
        formula: `=SOMASES('06 - Histórico de Vendas'!$D:$D;'06 - Histórico de Vendas'!$A:$A;">="&$C$4;'06 - Histórico de Vendas'!$A:$A;"<="&$D$4)`,
        desc: "Soma o valor de todos os lançamentos de venda dentro do período selecionado (Data Início C4 / Data Fim D4). Resultado do payload: R$ 14.100,00.",
      },
      {
        nome: "Realizado por Categoria",
        formula: `=SOMASES(Indicadores!$D:$D;Indicadores!$B:$B;$B7)`,
        desc: "Realizado sincronizado da categoria informada em B7 (Faturamento, Marcas Exclusivas, Genéricos, Super Desconto). Total geral: R$ 700.280,00.",
      },
      {
        nome: "Realizado por Vendedor",
        formula: `=SOMASES(Indicadores!$D:$D;Indicadores!$A:$A;$B7;Indicadores!$B:$B;$C7)`,
        desc: "Realizado do vendedor + categoria a partir da aba Indicadores. Usado nas abas individuais (07 a 09).",
      },
      {
        nome: "Meta Total",
        formula: `=SOMA(Indicadores!$C:$C)`,
        desc: "Soma de todas as metas sincronizadas por vendedor e categoria. Resultado do payload: R$ 1.014.447,91.",
      },
    ],
  },
  {
    grupo: "Indicadores Derivados",
    itens: [
      {
        nome: "% Atingimento",
        formula: `=SEERRO(Realizado/Meta;0)`,
        desc: "Percentual da meta atingido. SEERRO evita #DIV/0! quando a meta é zero. Formatar como porcentagem.",
      },
      {
        nome: "Projeção de Fechamento",
        formula: `=Realizado/DiasÚteisDecorridos*DiasÚteisTotais`,
        desc: "Projeta o fechamento assumindo o ritmo médio diário atual. Ex.: =E7/DIATRABALHOTOTAL($C$4;HOJE())*DIATRABALHOTOTAL($C$4;$D$4).",
      },
      {
        nome: "Ticket Médio",
        formula: `=SEERRO(Realizado/TotalTransações;0)`,
        desc: "Valor médio por venda: faturamento dividido pelo número de transações do período.",
      },
      {
        nome: "Status da Meta",
        formula: `=IFS(F7>=70%;"Dentro da Meta";F7>=30%;"Atenção";VERDADEIRO;"Fora da Meta")`,
        desc: "Classificação automática: ≥70% Dentro da Meta (verde) · 30–69,99% Atenção (amarelo) · <30% Fora da Meta (vermelho).",
      },
      {
        nome: "Variação vs Período Anterior",
        formula: `=SEERRO((Atual-Anterior)/Anterior;"—")`,
        desc: "Crescimento percentual em relação ao período imediatamente anterior de mesma duração.",
      },
      {
        nome: "Variação Absoluta",
        formula: `=PeríodoAtual-PeríodoAnterior`,
        desc: "Diferença em R$ entre os dois períodos (usada na Análise Comparativa).",
      },
    ],
  },
  {
    grupo: "Rankings e Classificações",
    itens: [
      {
        nome: "Posição no Ranking",
        formula: `=ORDEM(D7;$D$7:$D$9;0)`,
        desc: "Posição do vendedor pelo realizado (0 = ordem decrescente). Em inglês: RANK.",
      },
      {
        nome: "Top N Dias",
        formula: `=QUERY('06 - Histórico de Vendas'!A:F;"select A, sum(F) group by A order by sum(F) desc limit 5";1)`,
        desc: "Google Sheets: retorna os 5 melhores dias por faturamento. No Excel use Tabela Dinâmica ou CLASSIFICAR+SOMASES.",
      },
      {
        nome: "Maior Valor / Nome",
        formula: `=ÍNDICE($B$7:$B$9;CORRESP(MAIOR($D$7:$D$9;1);$D$7:$D$9;0))`,
        desc: "Retorna o nome do vendedor com maior realizado (1º lugar). Troque o 1 por 2 ou 3 para as demais medalhas.",
      },
      {
        nome: "Distribuição por Faixa",
        formula: `=IFS(D7>10000;"Acima de R$ 10.000,00";D7>5000;"De R$ 5.000,01 até R$ 10.000,00";VERDADEIRO;"Até R$ 5.000,00")`,
        desc: "Classifica cada vendedor/venda em faixas de valor para o gráfico de rosca de distribuição.",
      },
    ],
  },
  {
    grupo: "Contagens e Auxiliares",
    itens: [
      {
        nome: "Total de Clientes",
        formula: `=SOMASES('06 - Histórico de Vendas'!$E:$E;'06 - Histórico de Vendas'!$A:$A;">="&$C$4;'06 - Histórico de Vendas'!$A:$A;"<="&$D$4)`,
        desc: "Soma a coluna Qtd. Clientes no período. Resultado do payload: 180 clientes.",
      },
      {
        nome: "Ticket Médio Geral",
        formula: `=SEERRO(TotalVendas/TotalClientes;0)`,
        desc: "Valor total das vendas dividido pelos clientes atendidos: 14.100 ÷ 180 = R$ 78,33.",
      },
      {
        nome: "Vendedores Ativos",
        formula: `=CONT.VALORES(ÚNICO(FILTRO('06 - Histórico de Vendas'!B:B;'06 - Histórico de Vendas'!A:A>=$C$4;'06 - Histórico de Vendas'!A:A<=$D$4)))`,
        desc: "Conta vendedores distintos com lançamentos no período (Google Sheets). Resultado: 3 ativos.",
      },
      {
        nome: "Participação (%)",
        formula: `=SEERRO(ValorDaLinha/TotalGeral;0)`,
        desc: "Percentual de participação de cada categoria/marca/vendedor sobre o total (gráficos de pizza/rosca).",
      },
      {
        nome: "Última Sincronização",
        formula: `=TEXTO(AGORA();"dd/mm/aaaa hh:mm")`,
        desc: "Carimbo de data/hora exibido no cabeçalho. Atualizado pelo botão SINCRONIZAR (Apps Script / recálculo).",
      },
    ],
  },
];

const MANUAL: { titulo: string; icone: string; linhas: string[] }[] = [
  {
    titulo: "1. Visão Geral",
    icone: "📋",
    linhas: [
      "A planilha Orionn — Dashboard Executivo consolida o desempenho comercial da loja em 11 abas.",
      "Abas 01 a 05: dashboards analíticos (Geral, Faturamento, Marcas Exclusivas, Genéricos e Super Desconto).",
      "Aba 06: Histórico de Vendas — é a BASE DE DADOS. Todas as fórmulas leem desta aba.",
      "Abas 07 a 12: painéis individuais de Adelino, Alicia, Clodoaldo, Elielton, Fabio e Mieko.",
      "Abas 13 e 14: referência de fórmulas e este manual.",
    ],
  },
  {
    titulo: "2. Como Usar os Filtros",
    icone: "🎛️",
    linhas: [
      "Período: escolha um intervalo pré-definido (Últimos 7 dias, Mês atual, etc.). Ele preenche Data Início e Data Fim automaticamente.",
      "Data Início / Data Fim: podem ser ajustadas manualmente para qualquer intervalo.",
      "Vendedor: filtra todos os KPIs, gráficos e tabelas por um vendedor específico (ou Todos).",
      "Loja / Filial: seleciona a unidade quando houver mais de uma filial sincronizada.",
      "Botão SINCRONIZAR: importa os dados mais recentes (Supabase → Google Sheets) e atualiza o carimbo de Última Sincronização.",
    ],
  },
  {
    titulo: "3. Alimentando a Base de Dados (Aba 06)",
    icone: "🗄️",
    linhas: [
      "Cada linha representa um lançamento de venda com: Data, Vendedor, Categoria, Marca (opcional), Valor, Clientes e Transações.",
      "Nunca deixe linhas em branco no meio da base — as fórmulas SOMASES varrem as colunas inteiras.",
      "Categorias válidas: Faturamento, Marcas Exclusivas, Genéricos e Super Desconto (escreva exatamente assim).",
      "Datas no formato dd/mm/aaaa. Valores sem R$ — a formatação de moeda é automática.",
      "Novos vendedores: basta lançar vendas com o novo nome e criar a meta correspondente; os rankings se ajustam sozinhos.",
    ],
  },
  {
    titulo: "4. Metas",
    icone: "🎯",
    linhas: [
      "As metas são cadastradas por categoria (meta da loja) e por vendedor+categoria (metas individuais).",
      "A Meta Total do Dashboard Geral é a soma das metas de todas as categorias.",
      "O % Atingimento compara Realizado ÷ Meta e alimenta o Status automaticamente.",
    ],
  },
  {
    titulo: "5. Interpretando os Indicadores",
    icone: "📊",
    linhas: [
      "REALIZADO: soma das vendas do período filtrado.",
      "PROJEÇÃO: estimativa de fechamento mantendo o ritmo médio diário atual (Realizado ÷ dias decorridos × dias totais).",
      "STATUS: verde (≥70% da meta) = Dentro da Meta · amarelo (30% a 69,99%) = Atenção · vermelho (<30%) = Fora da Meta.",
      "Δ vs PERÍODO ANTERIOR: compara com o intervalo imediatamente anterior de mesma duração (setas verdes = crescimento, vermelhas = queda).",
      "TICKET MÉDIO: Realizado ÷ número de transações.",
      "MEDALHAS (1º, 2º, 3º): posição de cada vendedor no ranking de realizado da aba correspondente.",
    ],
  },
  {
    titulo: "6. Boas Práticas e Manutenção",
    icone: "🛠️",
    linhas: [
      "As abas de dashboard são protegidas (cadeado) — edite apenas a aba 06 e as metas.",
      "Não renomeie as abas: as fórmulas referenciam os nomes exatos (ex.: '06 - Histórico de Vendas').",
      "Faça backup antes de alterações estruturais (Arquivo → Fazer uma cópia).",
      "Para exportar esta planilha em Excel com todas as fórmulas e formatações, use o botão 'Baixar Planilha (.xlsx)'.",
      "Dúvidas sobre uma fórmula específica? Consulte a aba 13 - Fórmulas, que documenta cada cálculo usado.",
    ],
  },
  {
    titulo: "7. Suporte",
    icone: "💬",
    linhas: [
      "Relatório gerado automaticamente pelo Sistema Orionn.",
      "Fonte dos dados: Supabase → Google Sheets → Power BI.",
      "Em caso de divergência de números, execute SINCRONIZAR e confira o carimbo de Última Sincronização no cabeçalho.",
    ],
  },
];

// ============================================================
// SERVER FUNCTION — GERAÇÃO DA PLANILHA EXECUTIVA ORIONN
// ============================================================
export const gerarPlanilhaExecutiva = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({}).parse(v))
  .handler(async () => {
    const ExcelJS = await import("exceljs");
    const d = await getDashboardData();

    const wb = new ExcelJS.Workbook();
    wb.creator = "Sistema Orionn";
    wb.created = new Date("2026-07-28T21:00:59.098Z");

    // ══ 06 - Histórico de Vendas (lançamentos diários) ══
    const hist = wb.addWorksheet("06 - Histórico de Vendas", {
      views: [{ state: "frozen", ySplit: 3 }],
    });
    hist.columns = [
      { width: 13 },
      { width: 32 },
      { width: 20 },
      { width: 16 },
      { width: 13 },
      { width: 14 },
    ];
    titleBlock(
      hist,
      "Histórico de Vendas",
      "Lançamentos diários — alimentam gráficos de linha, pizza e barras",
      "F",
    );
    headerRow(hist, 3, [
      "Data",
      "Vendedor",
      "Categoria",
      "Valor Venda (R$)",
      "Qtd. Clientes",
      "Ticket Médio",
    ]);
    d.todas.forEach((r, i) => {
      const row = hist.getRow(4 + i);
      row.getCell(1).value = new Date(`${r.data}T12:00:00`);
      row.getCell(1).numFmt = "dd/mm/yyyy";
      row.getCell(2).value = r.vendedorNome;
      row.getCell(3).value = r.categoria;
      row.getCell(4).value = r.valor;
      row.getCell(4).numFmt = BRL;
      row.getCell(5).value = r.clientes;
      row.getCell(6).value = {
        formula: `IFERROR(D${4 + i}/E${4 + i},0)`,
        result: r.ticketMedio,
      };
      row.getCell(6).numFmt = BRL;
      styleDataRow(row, i % 2 === 1);
    });

    // ══ Indicadores (metas sincronizadas por vendedor + categoria) ══
    const ind = wb.addWorksheet(IND, { views: [{ state: "frozen", ySplit: 3 }] });
    ind.columns = [
      { width: 32 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 14 },
      { width: 16 },
    ];
    titleBlock(
      ind,
      "Indicadores Sincronizados",
      "Meta, realizado e projeção por vendedor e categoria (payload Orionn)",
      "G",
    );
    headerRow(ind, 3, [
      "Vendedor",
      "Categoria",
      "Meta (R$)",
      "Realizado (R$)",
      "Projeção (R$)",
      "% Atingimento",
      "Status",
    ]);
    d.indicadoresTodos.forEach((r, i) => {
      const rowIdx = 4 + i;
      const row = ind.getRow(rowIdx);
      row.getCell(1).value = r.vendedorNome;
      row.getCell(2).value = r.categoria;
      row.getCell(3).value = r.meta;
      row.getCell(4).value = r.realizado;
      row.getCell(5).value = r.projecao;
      [3, 4, 5].forEach((ci) => (row.getCell(ci).numFmt = BRL));
      row.getCell(6).value = {
        formula: `IFERROR(D${rowIdx}/C${rowIdx},0)`,
        result: r.atingimento / 100,
      };
      row.getCell(6).numFmt = PCT;
      statusCell(row.getCell(7), `F${rowIdx}`, r.atingimento);
      styleDataRow(row, i % 2 === 1);
    });

    // ══ 01 - Dashboard Geral ══
    const dash = wb.addWorksheet("01 - Dashboard Geral");
    dash.columns = [
      { width: 22 },
      { width: 20 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
      { width: 20 },
    ];
    titleBlock(
      dash,
      "Dashboard Executivo — Visão Geral",
      "Consolidado de todos os indicadores da loja",
      "H",
    );
    const t = d.total;
    kpiBlock(dash, 4, [
      {
        label: "Meta Total",
        formula: `SUM(${IND}!C:C)`,
        value: t.meta,
        fmt: BRL,
        color: "FF0E7A5F",
      },
      {
        label: "Realizado",
        formula: `SUM(${IND}!D:D)`,
        value: t.realizado,
        fmt: BRL,
        color: "FF0D3B66",
      },
      {
        label: "Projeção",
        formula: `SUM(${IND}!E:E)`,
        value: t.projecao,
        fmt: BRL,
        color: BLUE,
      },
      {
        label: "% Atingimento",
        formula: "IFERROR(B5/A5,0)",
        value: t.atingimento / 100,
        fmt: PCT,
        color: "FFE08700",
      },
      {
        label: "Clientes",
        formula: `SUM(${HIST}!E:E)`,
        value: t.clientes,
        color: "FF6D28D9",
      },
      {
        label: "Ticket Médio",
        formula: "IFERROR(G5/E5,0)",
        value: t.ticketMedio,
        fmt: BRL,
        color: "FF0891B2",
      },
      {
        label: "Vendas (R$)",
        formula: `SUM(${HIST}!D:D)`,
        value: t.vendasValor,
        fmt: BRL,
        color: "FF1E3A8A",
      },
      {
        label: "Vendedores",
        value: d.vendedoresList.length,
        color: "FF334155",
      },
    ]);

    sectionRow(dash, 7, "DESEMPENHO GERAL POR INDICADOR", "H");
    headerRow(dash, 8, [
      "Posição",
      "Indicador",
      "Meta (R$)",
      "Realizado (R$)",
      "Projeção (R$)",
      "% Atingimento",
      "Status",
      "Δ vs Período Anterior",
    ]);
    CATEGORIAS.forEach((cat, i) => {
      const a = d.porCategoria[cat];
      const rowIdx = 9 + i;
      const r = dash.getRow(rowIdx);
      r.getCell(1).value = i + 1;
      r.getCell(2).value = cat;
      r.getCell(3).value = {
        formula: `SUMIFS(${IND}!$C:$C,${IND}!$B:$B,B${rowIdx})`,
        result: a.meta,
      };
      r.getCell(4).value = {
        formula: `SUMIFS(${IND}!$D:$D,${IND}!$B:$B,B${rowIdx})`,
        result: a.realizado,
      };
      r.getCell(5).value = {
        formula: `SUMIFS(${IND}!$E:$E,${IND}!$B:$B,B${rowIdx})`,
        result: a.projecao,
      };
      [3, 4, 5].forEach((ci) => (r.getCell(ci).numFmt = BRL));
      r.getCell(6).value = {
        formula: `IFERROR(D${rowIdx}/C${rowIdx},0)`,
        result: a.atingimento / 100,
      };
      r.getCell(6).numFmt = PCT;
      statusCell(r.getCell(7), `F${rowIdx}`, a.atingimento);
      r.getCell(8).value = "—";
      r.getCell(8).alignment = { horizontal: "center" };
      styleDataRow(r, false);
    });
    const totRow = dash.getRow(13);
    dash.mergeCells("A13:B13");
    totRow.getCell(1).value = "TOTAL GERAL";
    totRow.getCell(3).value = { formula: "SUM(C9:C12)", result: t.meta };
    totRow.getCell(4).value = { formula: "SUM(D9:D12)", result: t.realizado };
    totRow.getCell(5).value = { formula: "SUM(E9:E12)", result: t.projecao };
    totRow.getCell(6).value = {
      formula: "IFERROR(D13/C13,0)",
      result: t.atingimento / 100,
    };
    totRow.getCell(7).value = t.status;
    totRow.getCell(8).value = "—";
    [3, 4, 5].forEach((ci) => (totRow.getCell(ci).numFmt = BRL));
    totRow.getCell(6).numFmt = PCT;
    totRow.eachCell((c) => {
      c.fill = fill(NAVY2);
      c.font = {
        name: "Poppins",
        size: 9,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      c.alignment = {
        vertical: "middle",
        horizontal: c.address.startsWith("A") ? "left" : "center",
      };
    });
    totRow.height = 22;

    // ══ 02..05 - Abas por categoria ══
    const catSheets: [string, Categoria][] = [
      ["02 - Faturamento", "Faturamento"],
      ["03 - Marcas Exclusivas", "Marcas Exclusivas"],
      ["04 - Genéricos", "Genéricos"],
      ["05 - Super Desconto", "Super Desconto"],
    ];
    for (const [sheetName, cat] of catSheets) {
      const ws = wb.addWorksheet(sheetName);
      ws.columns = [
        { width: 32 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 20 },
      ];
      const a = d.porCategoria[cat];
      titleBlock(ws, cat, `Análise completa de desempenho de ${cat}`, "G");
      kpiBlock(ws, 4, [
        {
          label: "Meta Total",
          formula: `SUMIFS(${IND}!$C:$C,${IND}!$B:$B,"${cat}")`,
          value: a.meta,
          fmt: BRL,
          color: "FF0E7A5F",
        },
        {
          label: "Realizado",
          formula: `SUMIFS(${IND}!$D:$D,${IND}!$B:$B,"${cat}")`,
          value: a.realizado,
          fmt: BRL,
          color: "FF0D3B66",
        },
        {
          label: "Projeção",
          formula: `SUMIFS(${IND}!$E:$E,${IND}!$B:$B,"${cat}")`,
          value: a.projecao,
          fmt: BRL,
          color: BLUE,
        },
        {
          label: "% Atingimento",
          formula: "IFERROR(B5/A5,0)",
          value: a.atingimento / 100,
          fmt: PCT,
          color: "FFE08700",
        },
        {
          label: "Clientes",
          formula: `SUMIFS(${HIST}!$E:$E,${HIST}!$C:$C,"${cat}")`,
          value: a.clientes,
          color: "FF6D28D9",
        },
        {
          label: "Ticket Médio",
          formula: "IFERROR(G5/E5,0)",
          value: a.ticketMedio,
          fmt: BRL,
          color: "FF0891B2",
        },
        {
          label: "Vendas (R$)",
          formula: `SUMIFS(${HIST}!$D:$D,${HIST}!$C:$C,"${cat}")`,
          value: a.vendasValor,
          fmt: BRL,
          color: "FF1E3A8A",
        },
      ]);

      sectionRow(ws, 7, `DESEMPENHO DE ${cat.toUpperCase()} POR VENDEDOR`, "G");
      headerRow(ws, 8, [
        "Vendedor",
        "Meta (R$)",
        "Realizado (R$)",
        "Projeção (R$)",
        "% Atingimento",
        "Status",
        "Δ vs Anterior",
      ]);

      const porVend = indicadoresPorVendedor(
        d.indicadoresTodos.filter((r) => r.categoria === cat),
      );
      porVend.forEach((vr, i) => {
        const rowIdx = 9 + i;
        const r = ws.getRow(rowIdx);
        r.getCell(1).value = vr.nome;
        r.getCell(2).value = {
          formula: `SUMIFS(${IND}!$C:$C,${IND}!$B:$B,"${cat}",${IND}!$A:$A,A${rowIdx})`,
          result: vr.meta,
        };
        r.getCell(3).value = {
          formula: `SUMIFS(${IND}!$D:$D,${IND}!$B:$B,"${cat}",${IND}!$A:$A,A${rowIdx})`,
          result: vr.realizado,
        };
        r.getCell(4).value = {
          formula: `SUMIFS(${IND}!$E:$E,${IND}!$B:$B,"${cat}",${IND}!$A:$A,A${rowIdx})`,
          result: vr.projecao,
        };
        [2, 3, 4].forEach((ci) => (r.getCell(ci).numFmt = BRL));
        r.getCell(5).value = {
          formula: `IFERROR(C${rowIdx}/B${rowIdx},0)`,
          result: vr.atingimento / 100,
        };
        r.getCell(5).numFmt = PCT;
        statusCell(r.getCell(6), `E${rowIdx}`, vr.atingimento);
        r.getCell(7).value = "—";
        r.getCell(7).alignment = { horizontal: "center" };
        styleDataRow(r, false);
      });

      const trIdx = 9 + porVend.length;
      const tr = ws.getRow(trIdx);
      tr.getCell(1).value = "TOTAL GERAL";
      tr.getCell(2).value = { formula: `SUM(B9:B${trIdx - 1})`, result: a.meta };
      tr.getCell(3).value = {
        formula: `SUM(C9:C${trIdx - 1})`,
        result: a.realizado,
      };
      tr.getCell(4).value = {
        formula: `SUM(D9:D${trIdx - 1})`,
        result: a.projecao,
      };
      tr.getCell(5).value = {
        formula: `IFERROR(C${trIdx}/B${trIdx},0)`,
        result: a.atingimento / 100,
      };
      tr.getCell(6).value = a.status;
      tr.getCell(7).value = "—";
      [2, 3, 4].forEach((ci) => (tr.getCell(ci).numFmt = BRL));
      tr.getCell(5).numFmt = PCT;
      tr.eachCell((c) => {
        c.fill = fill(NAVY2);
        c.font = {
          name: "Poppins",
          size: 9,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        c.alignment = { vertical: "middle" };
      });
      tr.height = 22;
    }

    // ══ 07..NN - Abas por vendedor (geradas dinamicamente) ══
    // O modelo original mapeia IDs 1-7 para nomes fixos. Aqui buscamos
    // vendedores reais do Supabase e geramos abas 07..NN dinamicamente.
    const vendSheets: [string, string][] = d.vendedoresList.map((v, i) => [
      `${String(7 + i).padStart(2, "0")} - ${v.nome}`,
      v.id,
    ]);

    for (const [sheetName, vid] of vendSheets) {
      const ws = wb.addWorksheet(sheetName);
      ws.columns = [
        { width: 24 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 20 },
      ];
      const v = d.vendedoresList.find((x) => x.id === vid)!;
      const a = d.porVendedor[vid];
      titleBlock(ws, v.nome, `Painel individual — ${v.cargo}`, "G");
      ws.mergeCells("A3:G3");
      ws.getCell("A3").value = `Matrícula: ${
        v.matricula || "Não informada"
      }  ·  E-mail: ${v.email || "Não informado"}  ·  Status: ${v.status}`;
      ws.getCell("A3").font = {
        name: "Poppins",
        size: 9,
        color: { argb: "FF334155" },
      };
      ws.getCell("A3").fill = fill(LIGHT);
      ws.getCell("A3").alignment = { vertical: "middle", indent: 1 };
      ws.getRow(3).height = 20;
      kpiBlock(ws, 4, [
        {
          label: "Meta Total",
          formula: `SUMIFS(${IND}!$C:$C,${IND}!$A:$A,"${v.nome}")`,
          value: a.meta,
          fmt: BRL,
          color: "FF0E7A5F",
        },
        {
          label: "Realizado",
          formula: `SUMIFS(${IND}!$D:$D,${IND}!$A:$A,"${v.nome}")`,
          value: a.realizado,
          fmt: BRL,
          color: "FF0D3B66",
        },
        {
          label: "Projeção",
          formula: `SUMIFS(${IND}!$E:$E,${IND}!$A:$A,"${v.nome}")`,
          value: a.projecao,
          fmt: BRL,
          color: BLUE,
        },
        {
          label: "% Atingimento",
          formula: "IFERROR(B5/A5,0)",
          value: a.atingimento / 100,
          fmt: PCT,
          color: "FFE08700",
        },
        {
          label: "Clientes",
          formula: `SUMIFS(${HIST}!$E:$E,${HIST}!$B:$B,"${v.nome}")`,
          value: a.clientes,
          color: "FF6D28D9",
        },
        {
          label: "Vendas (R$)",
          formula: `SUMIFS(${HIST}!$D:$D,${HIST}!$B:$B,"${v.nome}")`,
          value: a.vendasValor,
          fmt: BRL,
          color: "FF1E3A8A",
        },
      ]);

      sectionRow(ws, 7, "DESEMPENHO POR CATEGORIA", "G");
      headerRow(ws, 8, [
        "Categoria",
        "Meta (R$)",
        "Realizado (R$)",
        "Projeção (R$)",
        "% Atingimento",
        "Status",
        "Δ vs Anterior",
      ]);

      CATEGORIAS.forEach((cat, i) => {
        const rowIdx = 9 + i;
        const cr = d.indicadoresTodos.filter(
          (r) => r.vendedorId === vid && r.categoria === cat,
        );
        const meta = cr.reduce((s, r) => s + r.meta, 0);
        const realizado = cr.reduce((s, r) => s + r.realizado, 0);
        const projecao = cr.reduce((s, r) => s + r.projecao, 0);
        const pct = meta > 0 ? (realizado / meta) * 100 : 0;
        const r = ws.getRow(rowIdx);
        r.getCell(1).value = cat;
        r.getCell(2).value = {
          formula: `SUMIFS(${IND}!$C:$C,${IND}!$B:$B,A${rowIdx},${IND}!$A:$A,"${v.nome}")`,
          result: meta,
        };
        r.getCell(3).value = {
          formula: `SUMIFS(${IND}!$D:$D,${IND}!$B:$B,A${rowIdx},${IND}!$A:$A,"${v.nome}")`,
          result: realizado,
        };
        r.getCell(4).value = {
          formula: `SUMIFS(${IND}!$E:$E,${IND}!$B:$B,A${rowIdx},${IND}!$A:$A,"${v.nome}")`,
          result: projecao,
        };
        [2, 3, 4].forEach((ci) => (r.getCell(ci).numFmt = BRL));
        r.getCell(5).value = {
          formula: `IFERROR(C${rowIdx}/B${rowIdx},0)`,
          result: pct / 100,
        };
        r.getCell(5).numFmt = PCT;
        statusCell(r.getCell(6), `E${rowIdx}`, pct);
        r.getCell(7).value = "—";
        r.getCell(7).alignment = { horizontal: "center" };
        styleDataRow(r, false);
      });
    }

    // ══ 13 - Fórmulas ══
    const fws = wb.addWorksheet("13 - Fórmulas");
    fws.columns = [{ width: 30 }, { width: 90 }, { width: 60 }];
    titleBlock(
      fws,
      "Fórmulas de Uso",
      "Referência completa de todas as fórmulas utilizadas na planilha",
      "C",
    );
    let fr = 4;
    for (const grupo of FORMULAS) {
      sectionRow(fws, fr, grupo.grupo.toUpperCase(), "C");
      fr++;
      headerRow(fws, fr, ["Indicador", "Fórmula", "Descrição"]);
      fr++;
      grupo.itens.forEach((it, i) => {
        const r = fws.getRow(fr);
        r.getCell(1).value = it.nome;
        r.getCell(1).font = { name: "Poppins", size: 9, bold: true };
        r.getCell(2).value = it.formula;
        r.getCell(2).font = { name: "Consolas", size: 9, color: { argb: BLUE } };
        r.getCell(3).value = it.desc;
        r.getCell(3).font = { name: "Poppins", size: 9 };
        r.eachCell((c) => {
          c.border = thinBorder;
          c.alignment = { vertical: "top", wrapText: true };
          if (i % 2) c.fill = fill(LIGHT);
        });
        r.height = 30;
        fr++;
      });
      fr++;
    }

    // ══ 14 - Manual de Uso ══
    const mws = wb.addWorksheet("14 - Manual de Uso");
    mws.columns = [{ width: 4 }, { width: 140 }];
    titleBlock(
      mws,
      "Manual de Uso",
      "Guia completo de operação da planilha Orionn — Dashboard Executivo",
      "B",
    );
    let mr = 4;
    for (const sec of MANUAL) {
      sectionRow(mws, mr, `${sec.icone}  ${sec.titulo.toUpperCase()}`, "B");
      mr++;
      for (const linha of sec.linhas) {
        const r = mws.getRow(mr);
        r.getCell(1).value = "•";
        r.getCell(1).font = {
          name: "Poppins",
          size: 9,
          bold: true,
          color: { argb: BLUE },
        };
        r.getCell(1).alignment = { horizontal: "center", vertical: "top" };
        r.getCell(2).value = linha;
        r.getCell(2).font = { name: "Poppins", size: 9 };
        r.getCell(2).alignment = { vertical: "top", wrapText: true };
        r.height = Math.max(16, Math.ceil(linha.length / 120) * 15);
        mr++;
      }
      mr++;
    }

    // ══ Ordena as abas (dinâmico conforme vendedores reais) ══
    const order = [
      "01 - Dashboard Geral",
      "02 - Faturamento",
      "03 - Marcas Exclusivas",
      "04 - Genéricos",
      "05 - Super Desconto",
      "06 - Histórico de Vendas",
      ...vendSheets.map(([name]) => name),
      IND,
      "13 - Fórmulas",
      "14 - Manual de Uso",
    ];
    order.forEach((name, i) => {
      const ws = wb.getWorksheet(name);
      if (ws) (ws as any).orderNo = i;
    });

    // ══ Gera buffer ══
    const buffer = await wb.xlsx.writeBuffer();

    return {
      file: Array.from(new Uint8Array(buffer as ArrayBuffer)),
      filename: `Orionn_Dashboard_Executivo_${hojeIso()}.xlsx`,
    };
  });
