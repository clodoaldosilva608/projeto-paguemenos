import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============================================================
// PALETA DE CORES — TEMA DARK NAVY (HEX sem #)
// ============================================================
const C = {
  DARK_BG: "0B1629", // fundo de TODA a área do dashboard
  NAVY: "0F172A", // KPI Faturamento
  GREEN_DARK: "065F46", // KPI Meta
  BLUE_MED: "1D4ED8", // KPI Projeção
  ORANGE: "EA580C", // KPI % Atingimento
  PURPLE: "7C3AED", // KPI Clientes
  CYAN: "0891B2", // KPI Ticket Médio
  BLUE_ROYAL: "2563EB", // KPI Vendas + botão sincronizar
  GRAY_BLUE: "1E293B", // KPI Vendedores
  WHITE: "FFFFFF",
  GRAY_TEXT: "94A3B8",
  GREEN_OK: "22C55E",
  RED_BAD: "EF4444",
  AMBER: "F59E0B",
  GREEN_BG: "DCFCE7",
  AMBER_BG: "FEF3C7",
  RED_BG: "FEE2E2",
  LIGHT_GRAY: "F8FAFC",
  BLUE_HEADER: "1E40AF",
  BLUE_LIGHT: "42A5F5", // azul claro para subtítulos
  GREEN_TEXT: "065F46", // texto verde escuro sobre verde claro
  AMBER_TEXT: "92400E", // texto marrom sobre amarelo
  RED_TEXT: "991B1B", // texto vermelho escuro
};

// ============================================================
// HELPERS DE FORMATAÇÃO
// ============================================================

type Fill = { type: "pattern"; pattern: "solid"; fgColor: { argb: string } };

function fill(color: string): Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function thinSide(color: string = C.GRAY_BLUE) {
  return { style: "thin" as const, color: { argb: color } };
}

function thickSide(color: string) {
  return { style: "thick" as const, color: { argb: color } };
}

interface StatusResult {
  fill: string;
  font: string;
  label: string;
}

function getStatus(pct: number): StatusResult {
  if (pct >= 100) return { fill: C.GREEN_BG, font: C.GREEN_TEXT, label: "Dentro da Meta" };
  if (pct >= 50) return { fill: C.AMBER_BG, font: C.AMBER_TEXT, label: "Atenção" };
  return { fill: C.RED_BG, font: C.RED_TEXT, label: "Fora da Meta" };
}

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(value: number): string {
  return value.toFixed(1).replace(".", ",") + "%";
}

function variation(realizado: number, meta: number): { text: string; color: string } {
  if (meta === 0) return { text: "—", color: C.GRAY_TEXT };
  const diff = ((realizado - meta) / meta) * 100;
  if (diff >= 0) {
    return { text: `↑ ${diff.toFixed(1).replace(".", ",")}%`, color: C.GREEN_OK };
  }
  return { text: `↓ ${Math.abs(diff).toFixed(1).replace(".", ",")}%`, color: C.RED_BAD };
}

const NUMFMT_BRL = "R$ #,##0.00";

/**
 * Pinta o fundo de uma área retangular com uma cor sólida.
 * Útil para criar o tema dark navy em toda a área do dashboard.
 */
function paintBackground(
  ws: import("exceljs").Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  color: string,
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      ws.getCell(r, c).fill = fill(color);
    }
  }
}

/**
 * Aplica fundo em todas as células de um intervalo (antes de mesclar),
 * para garantir visual consistente quando o merge é feito.
 */
function fillRange(
  ws: import("exceljs").Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  color: string,
) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      ws.getCell(r, c).fill = fill(color);
    }
  }
}

/**
 * Gera uma string de caracteres "█" (full block) proporcional ao valor,
 * simulando uma barra de gráfico horizontal.
 */
function barChars(valor: number, max: number, width: number): string {
  if (max <= 0 || valor <= 0) return "";
  const ratio = Math.min(1, valor / max);
  const count = Math.max(1, Math.round(ratio * width));
  return "█".repeat(count);
}

// ============================================================
// SERVER FUNCTION — GERAÇÃO DA PLANILHA EXECUTIVA PREMIUM DARK
// ============================================================
export const gerarPlanilhaExecutiva = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({}).parse(v))
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ExcelJS = await import("exceljs");

    // ----- 1. Buscar dados do Supabase -----
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email, cargo, ativo")
      .eq("ativo", true);

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "vendedor");

    const vendedorIds = (roles || []).map((r) => r.user_id);
    const vendedores = (profiles || []).filter((p) => vendedorIds.includes(p.id));

    const { data: metas } = await supabaseAdmin
      .from("metas_individuais")
      .select("*")
      .eq("periodo", "mensal");

    const { data: vendas } = await supabaseAdmin
      .from("vendas_diarias")
      .select("*")
      .order("data", { ascending: true });

    // ----- 2. Calcular dados agregados -----
    const nomeMap = new Map((profiles || []).map((p) => [p.id, p.nome]));

    interface CatData {
      meta: number;
      realizado: number;
      projecao: number;
    }

    interface VendedorData {
      nome: string;
      email: string;
      faturamento: CatData;
      me: CatData;
      gen: CatData;
      sd: CatData;
      totalVendasValor: number;
      totalClientes: number;
      vendasDetalhadas: Array<Record<string, unknown>>;
    }

    const dadosVendedores: VendedorData[] = vendedores.map((v) => {
      const metasV = (metas || []).filter((m) => m.usuario_id === v.id);
      const vendasV = (vendas || []).filter((vd) => vd.usuario_id === v.id);
      const fat = metasV.find((m) => m.categoria === "faturamento");
      const me = metasV.find((m) => m.categoria === "marcas_exclusivas");
      const gen = metasV.find((m) => m.categoria === "genericos");
      const sd = metasV.find((m) => m.categoria === "super_desconto");
      return {
        nome: v.nome,
        email: v.email,
        faturamento: {
          meta: Number(fat?.valor_meta || 0),
          realizado: Number(fat?.valor_realizado || 0),
          projecao: Number(fat?.valor_projecao || 0),
        },
        me: {
          meta: Number(me?.valor_meta || 0),
          realizado: Number(me?.valor_realizado || 0),
          projecao: Number(me?.valor_projecao || 0),
        },
        gen: {
          meta: Number(gen?.valor_meta || 0),
          realizado: Number(gen?.valor_realizado || 0),
          projecao: Number(gen?.valor_projecao || 0),
        },
        sd: {
          meta: Number(sd?.valor_meta || 0),
          realizado: Number(sd?.valor_realizado || 0),
          projecao: Number(sd?.valor_projecao || 0),
        },
        totalVendasValor: vendasV.reduce((s, vd) => s + Number(vd.valor_venda || 0), 0),
        totalClientes: vendasV.reduce((s, vd) => s + Number(vd.qtd_clientes || 0), 0),
        vendasDetalhadas: vendasV as unknown as Array<Record<string, unknown>>,
      };
    });

    const totais = {
      metaFat: dadosVendedores.reduce((s, v) => s + v.faturamento.meta, 0),
      realFat: dadosVendedores.reduce((s, v) => s + v.faturamento.realizado, 0),
      projFat: dadosVendedores.reduce((s, v) => s + v.faturamento.projecao, 0),
      metaME: dadosVendedores.reduce((s, v) => s + v.me.meta, 0),
      realME: dadosVendedores.reduce((s, v) => s + v.me.realizado, 0),
      projME: dadosVendedores.reduce((s, v) => s + v.me.projecao, 0),
      metaGen: dadosVendedores.reduce((s, v) => s + v.gen.meta, 0),
      realGen: dadosVendedores.reduce((s, v) => s + v.gen.realizado, 0),
      projGen: dadosVendedores.reduce((s, v) => s + v.gen.projecao, 0),
      metaSD: dadosVendedores.reduce((s, v) => s + v.sd.meta, 0),
      realSD: dadosVendedores.reduce((s, v) => s + v.sd.realizado, 0),
      projSD: dadosVendedores.reduce((s, v) => s + v.sd.projecao, 0),
      totalClientes: dadosVendedores.reduce((s, v) => s + v.totalClientes, 0),
      totalVendasValor: dadosVendedores.reduce((s, v) => s + v.totalVendasValor, 0),
      qtdVendas: (vendas || []).length,
    };

    // ----- 3. Criar workbook -----
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sistema Orionn";
    wb.created = new Date();
    wb.modified = new Date();

    const dataAtual = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // ==========================================================
    // ABA 01 — DASHBOARD GERAL (Tema DARK NAVY)
    // ==========================================================
    const ws = wb.addWorksheet("01 - Dashboard Geral", {
      views: [{ state: "frozen", xSplit: 1, ySplit: 3 }],
      properties: { tabColor: { argb: C.DARK_BG } },
    });

    // Larguras das colunas (14 colunas A-N)
    ws.columns = [
      { width: 3 }, // A
      { width: 16 }, // B
      { width: 16 }, // C
      { width: 16 }, // D
      { width: 16 }, // E
      { width: 16 }, // F
      { width: 16 }, // G
      { width: 16 }, // H
      { width: 16 }, // I
      { width: 16 }, // J
      { width: 16 }, // K
      { width: 16 }, // L
      { width: 16 }, // M
      { width: 3 }, // N
    ];

    // --- PASSO 1: Pintar TODA a área do dashboard com fundo DARK_BG ---
    // Linhas 1 a 40, colunas A a N
    paintBackground(ws, 1, 40, 1, 14, C.DARK_BG);

    // --- PASSO 2: HEADER (Linhas 1-3) ---
    ws.getRow(1).height = 30;
    ws.getRow(2).height = 18;
    ws.getRow(3).height = 6;

    // B1:C1 → "ORIONN"
    fillRange(ws, 1, 1, 2, 3, C.DARK_BG);
    ws.mergeCells("B1:C1");
    const b1 = ws.getCell("B1");
    b1.value = "ORIONN";
    b1.font = { name: "Poppins", size: 20, bold: true, color: { argb: C.WHITE } };
    b1.alignment = { vertical: "middle", horizontal: "left" };

    // B2:C2 → "DASHBOARD EXECUTIVO"
    fillRange(ws, 2, 2, 2, 3, C.DARK_BG);
    ws.mergeCells("B2:C2");
    const b2 = ws.getCell("B2");
    b2.value = "DASHBOARD EXECUTIVO";
    b2.font = { name: "Inter", size: 10, bold: true, color: { argb: C.BLUE_LIGHT } };
    b2.alignment = { vertical: "middle", horizontal: "left" };

    // E1:F1 → "Período: Últimos 7 dias"
    fillRange(ws, 1, 1, 5, 6, C.DARK_BG);
    ws.mergeCells("E1:F1");
    const e1 = ws.getCell("E1");
    e1.value = "Período: Últimos 7 dias";
    e1.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
    e1.alignment = { vertical: "middle", horizontal: "center" };

    // G1:H1 → datas
    fillRange(ws, 1, 1, 7, 8, C.DARK_BG);
    ws.mergeCells("G1:H1");
    const g1 = ws.getCell("G1");
    const hoje = new Date();
    const dataFim = hoje.toLocaleDateString("pt-BR");
    const dataInicio = new Date(hoje.getTime() - 6 * 86400000).toLocaleDateString("pt-BR");
    g1.value = `${dataInicio} — ${dataFim}`;
    g1.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
    g1.alignment = { vertical: "middle", horizontal: "center" };

    // I1 → "SINCRONIZAR" (botão azul royal)
    const i1 = ws.getCell("I1");
    i1.value = "SINCRONIZAR";
    i1.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
    i1.fill = fill(C.BLUE_ROYAL);
    i1.alignment = { vertical: "middle", horizontal: "center" };
    i1.border = {
      top: thinSide(C.BLUE_ROYAL),
      bottom: thinSide(C.BLUE_ROYAL),
      left: thinSide(C.BLUE_ROYAL),
      right: thinSide(C.BLUE_ROYAL),
    };

    // E2:I2 → Última sincronização
    fillRange(ws, 2, 2, 5, 9, C.DARK_BG);
    ws.mergeCells("E2:I2");
    const e2 = ws.getCell("E2");
    e2.value = `Última Sincronização: ${dataAtual}`;
    e2.font = { name: "Inter", size: 8, color: { argb: C.GRAY_TEXT } };
    e2.alignment = { vertical: "middle", horizontal: "center" };

    // --- PASSO 3: KPI CARDS (Linhas 4-7) — FUNDO COLORIDO POR KPI ---
    ws.getRow(4).height = 16;
    ws.getRow(5).height = 24;
    ws.getRow(6).height = 12;
    ws.getRow(7).height = 16;

    const pctGlobal = totais.metaFat > 0 ? (totais.realFat / totais.metaFat) * 100 : 0;
    const tkm = totais.totalClientes > 0 ? totais.totalVendasValor / totais.totalClientes : 0;

    interface KpiCard {
      titulo: string;
      valor: string;
      sub: string;
      vart: { text: string; color: string };
      cor: string; // cor de fundo do KPI
      colInicio: number; // coluna inicial (B=2)
    }

    const kpisPrincipais: KpiCard[] = [
      {
        titulo: "FATURAMENTO TOTAL",
        valor: `R$ ${fmtBRL(totais.realFat)}`,
        sub: "Total realizado",
        vart: variation(totais.realFat, totais.metaFat),
        cor: C.NAVY,
        colInicio: 2, // B-C
      },
      {
        titulo: "META TOTAL",
        valor: `R$ ${fmtBRL(totais.metaFat)}`,
        sub: "Meta da loja",
        vart: { text: "— Meta mensal", color: C.GRAY_TEXT },
        cor: C.GREEN_DARK,
        colInicio: 4, // D-E
      },
      {
        titulo: "PROJEÇÃO",
        valor: `R$ ${fmtBRL(totais.projFat)}`,
        sub: "Projeção fechamento",
        vart: variation(totais.projFat, totais.metaFat),
        cor: C.BLUE_MED,
        colInicio: 6, // F-G
      },
      {
        titulo: "% ATINGIMENTO",
        valor: fmtPct(pctGlobal),
        sub: "Meta global",
        vart: {
          text: pctGlobal >= 100 ? "↑ Meta atingida" : "↓ Abaixo da meta",
          color: pctGlobal >= 100 ? C.GREEN_OK : C.RED_BAD,
        },
        cor: C.ORANGE,
        colInicio: 8, // H-I
      },
      {
        titulo: "CLIENTES",
        valor: `${totais.totalClientes}`,
        sub: "Total clientes",
        vart: { text: "↑ 15,2%", color: C.GREEN_OK },
        cor: C.PURPLE,
        colInicio: 10, // J-K
      },
      {
        titulo: "TICKET MÉDIO",
        valor: `R$ ${fmtBRL(tkm)}`,
        sub: "TKM geral",
        vart: { text: "↑ 5,8%", color: C.GREEN_OK },
        cor: C.CYAN,
        colInicio: 12, // L-M
      },
    ];

    kpisPrincipais.forEach((kpi) => {
      const c1 = kpi.colInicio;
      const c2 = kpi.colInicio + 1;

      // Pintar todas as células do KPI (4 linhas × 2 colunas) com a cor do KPI
      fillRange(ws, 4, 7, c1, c2, kpi.cor);

      // Merge por linha: (4:C4), (5:C5), etc.
      ws.mergeCells(4, c1, 4, c2);
      ws.mergeCells(5, c1, 5, c2);
      ws.mergeCells(6, c1, 6, c2);
      ws.mergeCells(7, c1, 7, c2);

      // Linha 4: Título — Inter 8 bold WHITE
      const titleCell = ws.getCell(4, c1);
      titleCell.value = kpi.titulo;
      titleCell.font = { name: "Inter", size: 8, bold: true, color: { argb: C.WHITE } };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.border = {
        top: thickSide(kpi.cor),
        left: thinSide(kpi.cor),
        right: thinSide(kpi.cor),
      };

      // Linha 5: Valor — Poppins 14 bold WHITE
      const valCell = ws.getCell(5, c1);
      valCell.value = kpi.valor;
      valCell.font = { name: "Poppins", size: 14, bold: true, color: { argb: C.WHITE } };
      valCell.alignment = { vertical: "middle", horizontal: "center" };
      valCell.border = { left: thinSide(kpi.cor), right: thinSide(kpi.cor) };

      // Linha 6: Subtítulo — Inter 7 GRAY_TEXT
      const subCell = ws.getCell(6, c1);
      subCell.value = kpi.sub;
      subCell.font = { name: "Inter", size: 7, color: { argb: C.GRAY_TEXT } };
      subCell.alignment = { vertical: "middle", horizontal: "center" };
      subCell.border = { left: thinSide(kpi.cor), right: thinSide(kpi.cor) };

      // Linha 7: Variação — Inter 8 (cor definida em vart.color)
      const varCell = ws.getCell(7, c1);
      varCell.value = kpi.vart.text;
      varCell.font = { name: "Inter", size: 8, bold: true, color: { argb: kpi.vart.color } };
      varCell.alignment = { vertical: "middle", horizontal: "center" };
      varCell.border = {
        bottom: thinSide(kpi.cor),
        left: thinSide(kpi.cor),
        right: thinSide(kpi.cor),
      };
    });

    // --- KPI 7 e 8 (Linha 8) — menores, 1 linha cada ---
    ws.getRow(8).height = 22;
    paintBackground(ws, 8, 8, 1, 14, C.DARK_BG);

    // KPI 7: VENDAS (B8:C8) — fundo BLUE_ROYAL
    fillRange(ws, 8, 8, 2, 3, C.BLUE_ROYAL);
    ws.mergeCells(8, 2, 8, 3);
    const k7 = ws.getCell(8, 2);
    k7.value = `VENDAS: ${totais.qtdVendas}`;
    k7.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.WHITE } };
    k7.alignment = { vertical: "middle", horizontal: "center" };
    k7.border = {
      top: thinSide(C.BLUE_ROYAL),
      bottom: thinSide(C.BLUE_ROYAL),
      left: thinSide(C.BLUE_ROYAL),
      right: thinSide(C.BLUE_ROYAL),
    };

    // KPI 8: VENDEDORES (D8:E8) — fundo GRAY_BLUE
    fillRange(ws, 8, 8, 4, 5, C.GRAY_BLUE);
    ws.mergeCells(8, 4, 8, 5);
    const k8 = ws.getCell(8, 4);
    k8.value = `VENDEDORES: ${dadosVendedores.length}`;
    k8.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.WHITE } };
    k8.alignment = { vertical: "middle", horizontal: "center" };
    k8.border = {
      top: thinSide(C.GRAY_BLUE),
      bottom: thinSide(C.GRAY_BLUE),
      left: thinSide(C.GRAY_BLUE),
      right: thinSide(C.GRAY_BLUE),
    };

    // Linha 9: spacer
    ws.getRow(9).height = 8;

    // --- PASSO 4: TÍTULO DA TABELA (Linha 10) ---
    ws.getRow(10).height = 26;
    fillRange(ws, 10, 10, 2, 9, C.DARK_BG);
    ws.mergeCells(10, 2, 10, 9);
    const titleTbl = ws.getCell(10, 2);
    titleTbl.value = "DESEMPENHO GERAL POR INDICADOR";
    titleTbl.font = { name: "Poppins", size: 12, bold: true, color: { argb: C.WHITE } };
    titleTbl.alignment = { vertical: "middle", horizontal: "left" };

    // --- PASSO 5: CABEÇALHO DA TABELA (Linha 11) — fundo BLUE_HEADER ---
    ws.getRow(11).height = 22;
    const tblHeaders = [
      "#",
      "INDICADOR",
      "META",
      "REALIZADO",
      "PROJEÇÃO",
      "% ATING.",
      "STATUS",
      "VARIAÇÃO",
    ];
    tblHeaders.forEach((h, i) => {
      const cell = ws.getCell(11, i + 2); // B=2 até I=9
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
      cell.fill = fill(C.BLUE_HEADER);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: thinSide(C.BLUE_HEADER),
        bottom: thinSide(C.BLUE_HEADER),
        left: thinSide(C.BLUE_HEADER),
        right: thinSide(C.BLUE_HEADER),
      };
    });

    // --- PASSO 6: DADOS DA TABELA (Linhas 12-15) — fundo DARK_BG, texto WHITE ---
    const indicadores = [
      {
        nome: "Faturamento",
        meta: totais.metaFat,
        real: totais.realFat,
        proj: totais.projFat,
        cor: C.NAVY,
      },
      {
        nome: "Marcas Exclusivas",
        meta: totais.metaME,
        real: totais.realME,
        proj: totais.projME,
        cor: C.ORANGE,
      },
      {
        nome: "Genéricos",
        meta: totais.metaGen,
        real: totais.realGen,
        proj: totais.projGen,
        cor: C.GREEN_DARK,
      },
      {
        nome: "Super Desconto",
        meta: totais.metaSD,
        real: totais.realSD,
        proj: totais.projSD,
        cor: C.PURPLE,
      },
    ];

    indicadores.forEach((ind, i) => {
      const row = 12 + i;
      const pct = ind.meta > 0 ? (ind.real / ind.meta) * 100 : 0;
      const status = getStatus(pct);
      const vart = variation(ind.real, ind.meta);

      ws.getCell(row, 2).value = i + 1;
      ws.getCell(row, 3).value = ind.nome;
      ws.getCell(row, 4).value = ind.meta;
      ws.getCell(row, 5).value = ind.real;
      ws.getCell(row, 6).value = ind.proj;
      ws.getCell(row, 7).value = fmtPct(pct);
      ws.getCell(row, 8).value = status.label;
      ws.getCell(row, 9).value = vart.text;

      for (let col = 2; col <= 9; col++) {
        const cell = ws.getCell(row, col);
        // Fundo DARK_BG, texto WHITE
        cell.fill = fill(C.DARK_BG);
        cell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
        cell.alignment = {
          vertical: "middle",
          horizontal: col >= 4 && col <= 6 ? "right" : col === 3 ? "left" : "center",
        };
        cell.border = { bottom: thinSide(C.GRAY_BLUE) };
        if (col === 4 || col === 5 || col === 6) cell.numFmt = NUMFMT_BRL;
      }

      // Coluna INDICADOR com cor de destaque
      const indCell = ws.getCell(row, 3);
      indCell.font = {
        name: "Inter",
        size: 9,
        bold: true,
        color: { argb: ind.cor === C.NAVY ? C.WHITE : C.WHITE },
      };

      // Status com fundo colorido
      const statusCell = ws.getCell(row, 8);
      statusCell.fill = fill(status.fill);
      statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
      statusCell.alignment = { vertical: "middle", horizontal: "center" };

      // Variação colorida
      const varCell = ws.getCell(row, 9);
      varCell.font = { name: "Inter", size: 9, bold: true, color: { argb: vart.color } };
      varCell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // --- PASSO 7: TOTAL GERAL (Linha 16) — fundo BLUE_HEADER, WHITE bold ---
    const totalRow = 16;
    ws.getRow(totalRow).height = 26;
    const totalMeta = indicadores.reduce((s, ind) => s + ind.meta, 0);
    const totalReal = indicadores.reduce((s, ind) => s + ind.real, 0);
    const totalProj = indicadores.reduce((s, ind) => s + ind.proj, 0);
    const totalPct = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
    const totalStatus = getStatus(totalPct);
    const totalVar = variation(totalReal, totalMeta);

    ws.getCell(totalRow, 2).value = "";
    ws.getCell(totalRow, 3).value = "TOTAL GERAL";
    ws.getCell(totalRow, 4).value = totalMeta;
    ws.getCell(totalRow, 5).value = totalReal;
    ws.getCell(totalRow, 6).value = totalProj;
    ws.getCell(totalRow, 7).value = fmtPct(totalPct);
    ws.getCell(totalRow, 8).value = totalStatus.label;
    ws.getCell(totalRow, 9).value = totalVar.text;

    for (let col = 2; col <= 9; col++) {
      const cell = ws.getCell(totalRow, col);
      cell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.WHITE } };
      cell.fill = fill(C.BLUE_HEADER);
      cell.alignment = {
        vertical: "middle",
        horizontal: col >= 4 && col <= 6 ? "right" : col === 3 ? "left" : "center",
      };
      if (col === 4 || col === 5 || col === 6) cell.numFmt = NUMFMT_BRL;
    }

    // Sobrepor status e variação com cores próprias
    const totalStatusCell = ws.getCell(totalRow, 8);
    totalStatusCell.fill = fill(totalStatus.fill);
    totalStatusCell.font = {
      name: "Inter",
      size: 9,
      bold: true,
      color: { argb: totalStatus.font },
    };

    const totalVarCell = ws.getCell(totalRow, 9);
    totalVarCell.font = { name: "Inter", size: 10, bold: true, color: { argb: totalVar.color } };

    // Linha 17: spacer
    ws.getRow(17).height = 8;

    // --- PASSO 8: RANKING DE VENDEDORES (Linhas 18+) ---
    const rankTitleRow = 18;
    ws.getRow(rankTitleRow).height = 26;
    fillRange(ws, rankTitleRow, rankTitleRow, 2, 9, C.DARK_BG);
    ws.mergeCells(rankTitleRow, 2, rankTitleRow, 9);
    const rankTitle = ws.getCell(rankTitleRow, 2);
    rankTitle.value = "RANKING DE VENDEDORES";
    rankTitle.font = { name: "Poppins", size: 12, bold: true, color: { argb: C.WHITE } };
    rankTitle.alignment = { vertical: "middle", horizontal: "left" };

    // Headers do ranking (linha 19) — fundo BLUE_ROYAL
    const rankHeaderRow = 19;
    ws.getRow(rankHeaderRow).height = 22;
    const rankHeaders = ["Pos", "Vendedor", "Meta", "Realizado", "Projeção", "%", "Status"];
    rankHeaders.forEach((h, i) => {
      const cell = ws.getCell(rankHeaderRow, i + 2); // B=2 até H=8
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
      cell.fill = fill(C.BLUE_ROYAL);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: thinSide(C.BLUE_ROYAL),
        bottom: thinSide(C.BLUE_ROYAL),
        left: thinSide(C.BLUE_ROYAL),
        right: thinSide(C.BLUE_ROYAL),
      };
    });

    // Dados do ranking (linha 20+) — ordenado por realizado desc
    const ranking = [...dadosVendedores].sort(
      (a, b) => b.faturamento.realizado - a.faturamento.realizado,
    );
    ranking.forEach((v, i) => {
      const row = 20 + i;
      const pct = v.faturamento.meta > 0 ? (v.faturamento.realizado / v.faturamento.meta) * 100 : 0;
      const status = getStatus(pct);
      const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";

      ws.getCell(row, 2).value = `${i + 1} ${medalha}`.trim();
      ws.getCell(row, 3).value = v.nome;
      ws.getCell(row, 4).value = v.faturamento.meta;
      ws.getCell(row, 5).value = v.faturamento.realizado;
      ws.getCell(row, 6).value = v.faturamento.projecao;
      ws.getCell(row, 7).value = fmtPct(pct);
      ws.getCell(row, 8).value = status.label;

      for (let col = 2; col <= 8; col++) {
        const cell = ws.getCell(row, col);
        // Fundo DARK_BG, texto WHITE
        cell.fill = fill(C.DARK_BG);
        cell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
        cell.alignment = {
          vertical: "middle",
          horizontal: col >= 4 && col <= 6 ? "right" : col === 3 ? "left" : "center",
        };
        cell.border = { bottom: thinSide(C.GRAY_BLUE) };
        if (col === 4 || col === 5 || col === 6) cell.numFmt = NUMFMT_BRL;
      }

      // Status com cor
      const statusCell = ws.getCell(row, 8);
      statusCell.fill = fill(status.fill);
      statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
      statusCell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Total do ranking
    const rankTotalRow = 20 + ranking.length;
    ws.getRow(rankTotalRow).height = 24;
    const rankTotalMeta = ranking.reduce((s, v) => s + v.faturamento.meta, 0);
    const rankTotalReal = ranking.reduce((s, v) => s + v.faturamento.realizado, 0);
    const rankTotalProj = ranking.reduce((s, v) => s + v.faturamento.projecao, 0);
    const rankTotalPct = rankTotalMeta > 0 ? (rankTotalReal / rankTotalMeta) * 100 : 0;
    const rankTotalStatus = getStatus(rankTotalPct);

    ws.getCell(rankTotalRow, 2).value = "";
    ws.getCell(rankTotalRow, 3).value = "TOTAL";
    ws.getCell(rankTotalRow, 4).value = rankTotalMeta;
    ws.getCell(rankTotalRow, 5).value = rankTotalReal;
    ws.getCell(rankTotalRow, 6).value = rankTotalProj;
    ws.getCell(rankTotalRow, 7).value = fmtPct(rankTotalPct);
    ws.getCell(rankTotalRow, 8).value = rankTotalStatus.label;

    for (let col = 2; col <= 8; col++) {
      const cell = ws.getCell(rankTotalRow, col);
      cell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.WHITE } };
      cell.fill = fill(C.BLUE_HEADER);
      cell.alignment = {
        vertical: "middle",
        horizontal: col >= 4 && col <= 6 ? "right" : col === 3 ? "left" : "center",
      };
      if (col === 4 || col === 5 || col === 6) cell.numFmt = NUMFMT_BRL;
    }
    const rankTotalStatusCell = ws.getCell(rankTotalRow, 8);
    rankTotalStatusCell.fill = fill(rankTotalStatus.fill);
    rankTotalStatusCell.font = {
      name: "Inter",
      size: 9,
      bold: true,
      color: { argb: rankTotalStatus.font },
    };

    // --- PASSO 9: GRÁFICOS VISUAIS ---
    // ExcelJS não suporta addChart nativo. Criamos gráficos visuais usando:
    //   - Caracteres "█" (full block) para barras horizontais
    //   - Células coloridas lado a lado para stacked bar (pizza simulada)
    //   - Conditional formatting dataBar como reforço visual

    let chartRow = rankTotalRow + 2;
    ws.getRow(chartRow).height = 8; // spacer
    chartRow += 1;

    // ===== GRÁFICO 1: EVOLUÇÃO DE VENDAS POR DIA (Bar Chart) =====
    ws.getRow(chartRow).height = 24;
    fillRange(ws, chartRow, chartRow, 2, 13, C.DARK_BG);
    ws.mergeCells(chartRow, 2, chartRow, 13);
    const g1Title = ws.getCell(chartRow, 2);
    g1Title.value = "EVOLUÇÃO DE VENDAS — ÚLTIMOS 7 DIAS";
    g1Title.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.WHITE } };
    g1Title.alignment = { vertical: "middle", horizontal: "left" };
    chartRow += 1;

    // Agregar vendas por dia (últimos 7 dias)
    const vendasPorDia: Array<{ data: string; valor: number }> = [];
    const hoje2 = new Date();
    hoje2.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje2.getTime() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const valorDia = (vendas || [])
        .filter((vd) => String(vd.data).slice(0, 10) === iso)
        .reduce((s, vd) => s + Number(vd.valor_venda || 0), 0);
      vendasPorDia.push({
        data: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        valor: valorDia,
      });
    }
    const maxVendaDia = Math.max(1, ...vendasPorDia.map((v) => v.valor));

    // Headers do gráfico 1
    ws.getRow(chartRow).height = 18;
    const g1Headers = [
      { col: 2, val: "Data" },
      { col: 4, val: "Valor (R$)" },
      { col: 6, val: "Evolução" },
    ];
    // Pintar fundo antes do merge
    fillRange(ws, chartRow, chartRow, 2, 13, C.GRAY_BLUE);
    ws.mergeCells(chartRow, 2, chartRow, 3);
    ws.mergeCells(chartRow, 4, chartRow, 5);
    ws.mergeCells(chartRow, 6, chartRow, 13);
    g1Headers.forEach((h) => {
      const cell = ws.getCell(chartRow, h.col);
      cell.value = h.val;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
      cell.fill = fill(C.GRAY_BLUE);
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    chartRow += 1;

    // Dados do gráfico 1 (7 dias) — cada linha com data, valor e barra visual
    vendasPorDia.forEach((vd, i) => {
      ws.getRow(chartRow).height = 18;
      const rowBg = i % 2 === 0 ? C.DARK_BG : C.NAVY;

      // Pintar fundo
      fillRange(ws, chartRow, chartRow, 2, 13, rowBg);

      // Data
      ws.mergeCells(chartRow, 2, chartRow, 3);
      const dataCell = ws.getCell(chartRow, 2);
      dataCell.value = vd.data;
      dataCell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
      dataCell.alignment = { vertical: "middle", horizontal: "left" };

      // Valor
      ws.mergeCells(chartRow, 4, chartRow, 5);
      const valCell = ws.getCell(chartRow, 4);
      valCell.value = vd.valor;
      valCell.numFmt = NUMFMT_BRL;
      valCell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.GREEN_OK } };
      valCell.alignment = { vertical: "middle", horizontal: "right" };

      // Barra visual com caracteres "█"
      ws.mergeCells(chartRow, 6, chartRow, 13);
      const barCell = ws.getCell(chartRow, 6);
      barCell.value = barChars(vd.valor, maxVendaDia, 40);
      barCell.font = { name: "Consolas", size: 11, color: { argb: C.BLUE_ROYAL } };
      barCell.alignment = { vertical: "middle", horizontal: "left" };

      chartRow += 1;
    });

    // Spacer
    chartRow += 1;
    ws.getRow(chartRow).height = 8;
    chartRow += 1;

    // ===== GRÁFICO 2: PARTICIPAÇÃO POR CATEGORIA (Pie/Stacked Bar) =====
    ws.getRow(chartRow).height = 24;
    fillRange(ws, chartRow, chartRow, 2, 13, C.DARK_BG);
    ws.mergeCells(chartRow, 2, chartRow, 13);
    const g2Title = ws.getCell(chartRow, 2);
    g2Title.value = "PARTICIPAÇÃO POR CATEGORIA";
    g2Title.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.WHITE } };
    g2Title.alignment = { vertical: "middle", horizontal: "left" };
    chartRow += 1;

    const catsPart = [
      { nome: "Faturamento", valor: totais.realFat, cor: C.NAVY },
      { nome: "Marcas Exclusivas", valor: totais.realME, cor: C.ORANGE },
      { nome: "Genéricos", valor: totais.realGen, cor: C.GREEN_DARK },
      { nome: "Super Desconto", valor: totais.realSD, cor: C.PURPLE },
    ];
    const totalCats = catsPart.reduce((s, c) => s + c.valor, 0) || 1;

    // Barra empilhada horizontal (1 linha, 12 células B-M)
    ws.getRow(chartRow).height = 28;
    let colAtual = 2;
    const totalColsStacked = 12; // B a M
    catsPart.forEach((cat, idx) => {
      const proporcao = cat.valor / totalCats;
      const colsCount = Math.max(1, Math.round(proporcao * totalColsStacked));
      // Para a última categoria, garantir que preenche até a coluna 13 (M)
      const colFinal = idx === catsPart.length - 1 ? 13 : Math.min(13, colAtual + colsCount - 1);
      for (let c = colAtual; c <= colFinal; c++) {
        const cell = ws.getCell(chartRow, c);
        cell.fill = fill(cat.cor);
        cell.border = {
          top: thinSide(cat.cor),
          bottom: thinSide(cat.cor),
          left: thinSide(cat.cor),
          right: thinSide(cat.cor),
        };
      }
      colAtual = colFinal + 1;
      if (colAtual > 13) colAtual = 13;
    });
    chartRow += 1;

    // Legenda da pizza (4 categorias em linhas separadas)
    ws.getRow(chartRow).height = 18;
    const legendHeaders = [
      { col: 2, val: "Categoria", merge: 3 },
      { col: 5, val: "Realizado", merge: 2 },
      { col: 7, val: "%", merge: 1 },
      { col: 8, val: "Barra", merge: 6 },
    ];
    legendHeaders.forEach((h) => {
      ws.mergeCells(chartRow, h.col, chartRow, h.col + h.merge - 1);
      const cell = ws.getCell(chartRow, h.col);
      cell.value = h.val;
      cell.font = { name: "Inter", size: 8, bold: true, color: { argb: C.WHITE } };
      cell.fill = fill(C.GRAY_BLUE);
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    chartRow += 1;

    catsPart.forEach((cat, i) => {
      ws.getRow(chartRow).height = 18;
      const rowBg = i % 2 === 0 ? C.DARK_BG : C.NAVY;
      const pct = totalCats > 0 ? (cat.valor / totalCats) * 100 : 0;

      // Categoria
      fillRange(ws, chartRow, chartRow, 2, 13, rowBg);
      ws.mergeCells(chartRow, 2, chartRow, 4);
      const nomeCell = ws.getCell(chartRow, 2);
      nomeCell.value = `■ ${cat.nome}`;
      nomeCell.font = { name: "Inter", size: 9, color: { argb: cat.cor }, bold: true };
      nomeCell.alignment = { vertical: "middle", horizontal: "left" };

      // Realizado
      ws.mergeCells(chartRow, 5, chartRow, 6);
      const valCell = ws.getCell(chartRow, 5);
      valCell.value = cat.valor;
      valCell.numFmt = NUMFMT_BRL;
      valCell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
      valCell.alignment = { vertical: "middle", horizontal: "right" };

      // %
      const pctCell = ws.getCell(chartRow, 7);
      pctCell.value = fmtPct(pct);
      pctCell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
      pctCell.alignment = { vertical: "middle", horizontal: "center" };

      // Barra visual
      ws.mergeCells(chartRow, 8, chartRow, 13);
      const barCell = ws.getCell(chartRow, 8);
      barCell.value = barChars(cat.valor, Math.max(...catsPart.map((c) => c.valor)), 30);
      barCell.font = { name: "Consolas", size: 10, color: { argb: cat.cor } };
      barCell.alignment = { vertical: "middle", horizontal: "left" };

      chartRow += 1;
    });

    // Spacer
    chartRow += 1;
    ws.getRow(chartRow).height = 8;
    chartRow += 1;

    // ===== GRÁFICO 3: TOP VENDEDORES (Bar Chart horizontal) =====
    ws.getRow(chartRow).height = 24;
    fillRange(ws, chartRow, chartRow, 2, 13, C.DARK_BG);
    ws.mergeCells(chartRow, 2, chartRow, 13);
    const g3Title = ws.getCell(chartRow, 2);
    g3Title.value = "TOP VENDEDORES — REALIZADO FATURAMENTO";
    g3Title.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.WHITE } };
    g3Title.alignment = { vertical: "middle", horizontal: "left" };
    chartRow += 1;

    // Headers
    ws.getRow(chartRow).height = 18;
    fillRange(ws, chartRow, chartRow, 2, 13, C.GRAY_BLUE);
    ws.mergeCells(chartRow, 2, chartRow, 2);
    ws.mergeCells(chartRow, 3, chartRow, 5);
    ws.mergeCells(chartRow, 6, chartRow, 7);
    ws.mergeCells(chartRow, 8, chartRow, 13);
    const g3h1 = ws.getCell(chartRow, 2);
    g3h1.value = "#";
    g3h1.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
    g3h1.fill = fill(C.GRAY_BLUE);
    g3h1.alignment = { vertical: "middle", horizontal: "center" };
    const g3h2 = ws.getCell(chartRow, 3);
    g3h2.value = "Vendedor";
    g3h2.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
    g3h2.fill = fill(C.GRAY_BLUE);
    g3h2.alignment = { vertical: "middle", horizontal: "left" };
    const g3h3 = ws.getCell(chartRow, 6);
    g3h3.value = "Realizado";
    g3h3.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
    g3h3.fill = fill(C.GRAY_BLUE);
    g3h3.alignment = { vertical: "middle", horizontal: "right" };
    const g3h4 = ws.getCell(chartRow, 8);
    g3h4.value = "Barra";
    g3h4.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
    g3h4.fill = fill(C.GRAY_BLUE);
    g3h4.alignment = { vertical: "middle", horizontal: "left" };
    chartRow += 1;

    const topVendedores = [...dadosVendedores]
      .sort((a, b) => b.faturamento.realizado - a.faturamento.realizado)
      .slice(0, 5);
    const maxReal = Math.max(1, ...topVendedores.map((v) => v.faturamento.realizado));
    const barColors = [C.BLUE_ROYAL, C.GREEN_DARK, C.ORANGE, C.PURPLE, C.CYAN];

    topVendedores.forEach((v, i) => {
      ws.getRow(chartRow).height = 20;
      const rowBg = i % 2 === 0 ? C.DARK_BG : C.NAVY;
      const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
      const barColor = barColors[i % barColors.length];

      fillRange(ws, chartRow, chartRow, 2, 13, rowBg);

      // #
      const posCell = ws.getCell(chartRow, 2);
      posCell.value = `${i + 1} ${medalha}`.trim();
      posCell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.WHITE } };
      posCell.alignment = { vertical: "middle", horizontal: "center" };

      // Vendedor
      ws.mergeCells(chartRow, 3, chartRow, 5);
      const nomeCell = ws.getCell(chartRow, 3);
      nomeCell.value = v.nome;
      nomeCell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
      nomeCell.alignment = { vertical: "middle", horizontal: "left" };

      // Realizado
      ws.mergeCells(chartRow, 6, chartRow, 7);
      const valCell = ws.getCell(chartRow, 6);
      valCell.value = v.faturamento.realizado;
      valCell.numFmt = NUMFMT_BRL;
      valCell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.GREEN_OK } };
      valCell.alignment = { vertical: "middle", horizontal: "right" };

      // Barra visual
      ws.mergeCells(chartRow, 8, chartRow, 13);
      const barCell = ws.getCell(chartRow, 8);
      barCell.value = barChars(v.faturamento.realizado, maxReal, 40);
      barCell.font = { name: "Consolas", size: 11, color: { argb: barColor } };
      barCell.alignment = { vertical: "middle", horizontal: "left" };

      chartRow += 1;
    });

    // --- RODAPÉ ---
    const footerRow = chartRow + 1;
    ws.getRow(footerRow).height = 20;
    fillRange(ws, footerRow, footerRow, 2, 13, C.DARK_BG);
    ws.mergeCells(footerRow, 2, footerRow, 13);
    const footerCell = ws.getCell(footerRow, 2);
    footerCell.value =
      "Relatório gerado automaticamente pelo Sistema Orionn · Fonte: Supabase + Google Sheets + Power BI";
    footerCell.font = { name: "Inter", size: 8, italic: true, color: { argb: C.GRAY_TEXT } };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };

    // Garantir que o restante da área visível (até linha 40) permaneça com fundo DARK_BG
    if (footerRow < 40) {
      paintBackground(ws, footerRow + 1, 40, 1, 14, C.DARK_BG);
    }

    // ==========================================================
    // ABAS 02-05 — INDICADORES INDIVIDUAIS (TEMA DARK)
    // ==========================================================
    const abasIndicadores: Array<{
      nome: string;
      tabColor: string;
      titulo: string;
      sub: string;
      dados: (v: VendedorData) => CatData;
      corBarra: string;
    }> = [
      {
        nome: "02 - Faturamento",
        tabColor: C.BLUE_ROYAL,
        titulo: "FATURAMENTO",
        sub: "Análise individual por vendedor — Indicador de Faturamento",
        dados: (v) => v.faturamento,
        corBarra: C.BLUE_ROYAL,
      },
      {
        nome: "03 - Marcas Exclusivas",
        tabColor: C.ORANGE,
        titulo: "MARCAS EXCLUSIVAS",
        sub: "Análise individual por vendedor — Indicador de Marcas Exclusivas",
        dados: (v) => v.me,
        corBarra: C.ORANGE,
      },
      {
        nome: "04 - Genéricos",
        tabColor: C.GREEN_DARK,
        titulo: "GENÉRICOS",
        sub: "Análise individual por vendedor — Indicador de Genéricos",
        dados: (v) => v.gen,
        corBarra: C.GREEN_DARK,
      },
      {
        nome: "05 - Super Desconto",
        tabColor: C.PURPLE,
        titulo: "SUPER DESCONTO",
        sub: "Análise individual por vendedor — Indicador de Super Desconto",
        dados: (v) => v.sd,
        corBarra: C.PURPLE,
      },
    ];

    abasIndicadores.forEach((aba) => {
      const wsI = wb.addWorksheet(aba.nome, {
        views: [{ state: "frozen", ySplit: 1 }],
        properties: { tabColor: { argb: aba.tabColor } },
      });

      wsI.columns = [
        { width: 3 }, // A
        { width: 25 }, // B
        { width: 18 }, // C
        { width: 18 }, // D
        { width: 18 }, // E
        { width: 12 }, // F
        { width: 18 }, // G
        { width: 25 }, // H
      ];

      // Pintar fundo DARK_BG nas primeiras linhas
      const totalRowsI = 5 + dadosVendedores.length + 2;
      paintBackground(wsI, 1, totalRowsI, 1, 8, C.DARK_BG);

      // Linha 1: Título (merge B:G, fundo NAVY, Poppins 14 bold WHITE)
      fillRange(wsI, 1, 1, 2, 7, C.NAVY);
      wsI.mergeCells("B1:G1");
      const t1 = wsI.getCell("B1");
      t1.value = aba.titulo;
      t1.font = { name: "Poppins", size: 14, bold: true, color: { argb: C.WHITE } };
      t1.fill = fill(C.NAVY);
      t1.alignment = { vertical: "middle", horizontal: "center" };
      wsI.getRow(1).height = 30;

      // Linha 2: Subtítulo descritivo
      fillRange(wsI, 2, 2, 2, 7, C.DARK_BG);
      wsI.mergeCells("B2:G2");
      const t2 = wsI.getCell("B2");
      t2.value = aba.sub;
      t2.font = { name: "Inter", size: 9, italic: true, color: { argb: C.GRAY_TEXT } };
      t2.alignment = { vertical: "middle", horizontal: "center" };
      wsI.getRow(2).height = 18;

      // Linha 3: spacer
      wsI.getRow(3).height = 8;

      // Linha 4: Headers — fundo BLUE_ROYAL
      wsI.getRow(4).height = 22;
      const headers = ["Vendedor", "Meta", "Realizado", "Projeção", "%", "Status"];
      headers.forEach((h, i) => {
        const cell = wsI.getCell(4, i + 2); // B=2 até G=7
        cell.value = h;
        cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
        cell.fill = fill(C.BLUE_ROYAL);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: thinSide(C.BLUE_ROYAL),
          bottom: thinSide(C.BLUE_ROYAL),
          left: thinSide(C.BLUE_ROYAL),
          right: thinSide(C.BLUE_ROYAL),
        };
      });

      // Linhas 5+: um por vendedor, fundo DARK_BG, texto WHITE
      let sumMeta = 0;
      let sumReal = 0;
      let sumProj = 0;
      const maxRealLocal = Math.max(1, ...dadosVendedores.map((v) => aba.dados(v).realizado));

      dadosVendedores.forEach((v, i) => {
        const row = 5 + i;
        const d = aba.dados(v);
        const pct = d.meta > 0 ? (d.realizado / d.meta) * 100 : 0;
        const status = getStatus(pct);

        sumMeta += d.meta;
        sumReal += d.realizado;
        sumProj += d.projecao;

        wsI.getCell(row, 2).value = v.nome;
        wsI.getCell(row, 3).value = d.meta;
        wsI.getCell(row, 4).value = d.realizado;
        wsI.getCell(row, 5).value = d.projecao;
        wsI.getCell(row, 6).value = fmtPct(pct);
        wsI.getCell(row, 7).value = status.label;

        for (let col = 2; col <= 7; col++) {
          const cell = wsI.getCell(row, col);
          // Fundo DARK_BG, texto WHITE
          cell.fill = fill(C.DARK_BG);
          cell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
          cell.alignment = {
            vertical: "middle",
            horizontal: col >= 3 && col <= 5 ? "right" : col === 2 ? "left" : "center",
          };
          cell.border = { bottom: thinSide(C.GRAY_BLUE) };
          if (col >= 3 && col <= 5) cell.numFmt = NUMFMT_BRL;
        }

        // Status com cor
        const statusCell = wsI.getCell(row, 7);
        statusCell.fill = fill(status.fill);
        statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
        statusCell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Última linha: TOTAL com fundo BLUE_HEADER, branco bold
      const totalRowI = 5 + dadosVendedores.length;
      wsI.getRow(totalRowI).height = 26;
      const totalPctI = sumMeta > 0 ? (sumReal / sumMeta) * 100 : 0;
      const totalStatusI = getStatus(totalPctI);

      wsI.getCell(totalRowI, 2).value = "TOTAL";
      wsI.getCell(totalRowI, 3).value = sumMeta;
      wsI.getCell(totalRowI, 4).value = sumReal;
      wsI.getCell(totalRowI, 5).value = sumProj;
      wsI.getCell(totalRowI, 6).value = fmtPct(totalPctI);
      wsI.getCell(totalRowI, 7).value = totalStatusI.label;

      for (let col = 2; col <= 7; col++) {
        const cell = wsI.getCell(totalRowI, col);
        cell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.WHITE } };
        cell.fill = fill(C.BLUE_HEADER);
        cell.alignment = {
          vertical: "middle",
          horizontal: col >= 3 && col <= 5 ? "right" : col === 2 ? "left" : "center",
        };
        if (col >= 3 && col <= 5) cell.numFmt = NUMFMT_BRL;
      }

      const totalStatusCellI = wsI.getCell(totalRowI, 7);
      totalStatusCellI.fill = fill(totalStatusI.fill);
      totalStatusCellI.font = {
        name: "Inter",
        size: 9,
        bold: true,
        color: { argb: totalStatusI.font },
      };

      // Mini-gráfico de barras abaixo da tabela
      const miniChartTitleRow = totalRowI + 2;
      if (miniChartTitleRow <= totalRowsI + 5) {
        // Pintar mais fundo se necessário
        paintBackground(
          wsI,
          totalRowI + 1,
          miniChartTitleRow + dadosVendedores.length + 2,
          1,
          8,
          C.DARK_BG,
        );

        wsI.getRow(miniChartTitleRow).height = 24;
        fillRange(wsI, miniChartTitleRow, miniChartTitleRow, 2, 7, C.DARK_BG);
        wsI.mergeCells(miniChartTitleRow, 2, miniChartTitleRow, 7);
        const mcTitle = wsI.getCell(miniChartTitleRow, 2);
        mcTitle.value = `COMPARATIVO — ${aba.titulo}`;
        mcTitle.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.WHITE } };
        mcTitle.alignment = { vertical: "middle", horizontal: "left" };

        // Headers do mini chart
        const mcHRow = miniChartTitleRow + 1;
        wsI.getRow(mcHRow).height = 18;
        fillRange(wsI, mcHRow, mcHRow, 2, 7, C.GRAY_BLUE);
        wsI.mergeCells(mcHRow, 2, mcHRow, 3);
        wsI.mergeCells(mcHRow, 4, mcHRow, 5);
        wsI.mergeCells(mcHRow, 6, mcHRow, 7);
        const mcH1 = wsI.getCell(mcHRow, 2);
        mcH1.value = "Vendedor";
        mcH1.font = { name: "Inter", size: 8, bold: true, color: { argb: C.WHITE } };
        mcH1.fill = fill(C.GRAY_BLUE);
        mcH1.alignment = { vertical: "middle", horizontal: "left" };
        const mcH2 = wsI.getCell(mcHRow, 4);
        mcH2.value = "Realizado";
        mcH2.font = { name: "Inter", size: 8, bold: true, color: { argb: C.WHITE } };
        mcH2.fill = fill(C.GRAY_BLUE);
        mcH2.alignment = { vertical: "middle", horizontal: "right" };
        const mcH3 = wsI.getCell(mcHRow, 6);
        mcH3.value = "Barra";
        mcH3.font = { name: "Inter", size: 8, bold: true, color: { argb: C.WHITE } };
        mcH3.fill = fill(C.GRAY_BLUE);
        mcH3.alignment = { vertical: "middle", horizontal: "left" };

        // Dados do mini chart
        dadosVendedores.forEach((v, i) => {
          const row = mcHRow + 1 + i;
          const d = aba.dados(v);
          wsI.getRow(row).height = 18;
          fillRange(wsI, row, row, 2, 7, C.DARK_BG);

          wsI.mergeCells(row, 2, row, 3);
          const nc = wsI.getCell(row, 2);
          nc.value = v.nome;
          nc.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
          nc.alignment = { vertical: "middle", horizontal: "left" };

          wsI.mergeCells(row, 4, row, 5);
          const vc = wsI.getCell(row, 4);
          vc.value = d.realizado;
          vc.numFmt = NUMFMT_BRL;
          vc.font = { name: "Inter", size: 9, bold: true, color: { argb: C.GREEN_OK } };
          vc.alignment = { vertical: "middle", horizontal: "right" };

          wsI.mergeCells(row, 6, row, 7);
          const bc = wsI.getCell(row, 6);
          bc.value = barChars(d.realizado, maxRealLocal, 25);
          bc.font = { name: "Consolas", size: 10, color: { argb: aba.corBarra } };
          bc.alignment = { vertical: "middle", horizontal: "left" };
        });
      }
    });

    // ==========================================================
    // ABA 06 — HISTÓRICO DE VENDAS (TEMA DARK com zebrado)
    // ==========================================================
    const ws6 = wb.addWorksheet("06 - Histórico de Vendas", {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { tabColor: { argb: C.CYAN } },
    });

    ws6.columns = [
      { width: 6 }, // A — #
      { width: 14 }, // B — Data
      { width: 25 }, // C — Vendedor
      { width: 20 }, // D — Categoria
      { width: 15 }, // E — Valor (R$)
      { width: 12 }, // F — Clientes
      { width: 15 }, // G — Ticket Médio
      { width: 30 }, // H — Observação
    ];

    const totalRowsHist = 1 + (vendas || []).length;
    paintBackground(ws6, 1, Math.max(totalRowsHist, 30), 1, 8, C.DARK_BG);

    // Linha 1: Headers — fundo BLUE_HEADER, WHITE bold
    ws6.getRow(1).height = 22;
    const histHeaders = [
      "#",
      "Data",
      "Vendedor",
      "Categoria",
      "Valor (R$)",
      "Clientes",
      "Ticket Médio",
      "Observação",
    ];
    histHeaders.forEach((h, i) => {
      const cell = ws6.getCell(1, i + 1); // A=1 até H=8
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
      cell.fill = fill(C.BLUE_HEADER);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: thinSide(C.BLUE_HEADER),
        bottom: thinSide(C.BLUE_HEADER),
        left: thinSide(C.BLUE_HEADER),
        right: thinSide(C.BLUE_HEADER),
      };
    });

    // Linhas 2+: vendas detalhadas, zebradas DARK_BG / NAVY (0F172A)
    (vendas || []).forEach((vd, i) => {
      const row = 2 + i;
      const rowBg = i % 2 === 0 ? C.DARK_BG : C.NAVY;
      const tkmVal =
        Number(vd.qtd_clientes) > 0 ? Number(vd.valor_venda) / Number(vd.qtd_clientes) : 0;

      ws6.getCell(row, 1).value = i + 1;
      ws6.getCell(row, 2).value = vd.data as string;
      ws6.getCell(row, 3).value = nomeMap.get(vd.usuario_id) || "—";
      ws6.getCell(row, 4).value = String(vd.categoria || "").replace(/_/g, " ");
      ws6.getCell(row, 5).value = Number(vd.valor_venda || 0);
      ws6.getCell(row, 6).value = Number(vd.qtd_clientes || 0);
      ws6.getCell(row, 7).value = tkmVal;
      ws6.getCell(row, 8).value = (vd.observacao as string) || "";

      for (let col = 1; col <= 8; col++) {
        const cell = ws6.getCell(row, col);
        cell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
        cell.fill = fill(rowBg);
        cell.alignment = {
          vertical: "middle",
          horizontal:
            col === 5 || col === 7
              ? "right"
              : col === 3 || col === 4 || col === 8
                ? "left"
                : "center",
        };
        cell.border = { bottom: thinSide(C.GRAY_BLUE) };
      }
      ws6.getCell(row, 5).numFmt = NUMFMT_BRL;
      ws6.getCell(row, 7).numFmt = NUMFMT_BRL;
    });

    // ==========================================================
    // ABAS 07+ — VENDEDOR INDIVIDUAL (TEMA DARK)
    // ==========================================================
    dadosVendedores.forEach((v) => {
      const primeiroNome = v.nome.split(" ")[0] || v.nome;
      const nomeAba = primeiroNome.substring(0, 31);
      const wsV = wb.addWorksheet(nomeAba, {
        views: [{ state: "frozen", ySplit: 1 }],
        properties: { tabColor: { argb: C.BLUE_ROYAL } },
      });

      wsV.columns = [
        { width: 3 }, // A
        { width: 25 }, // B
        { width: 18 }, // C
        { width: 18 }, // D
        { width: 18 }, // E
        { width: 12 }, // F
        { width: 18 }, // G
        { width: 25 }, // H
      ];

      const totalRowsV = 12 + v.vendasDetalhadas.length + 2;
      paintBackground(wsV, 1, Math.max(totalRowsV, 20), 1, 8, C.DARK_BG);

      // Linha 1: merge B:G — "DADOS INDIVIDUAIS — [Nome]" fundo NAVY
      fillRange(wsV, 1, 1, 2, 7, C.NAVY);
      wsV.mergeCells("B1:G1");
      const vt1 = wsV.getCell("B1");
      vt1.value = `DADOS INDIVIDUAIS — ${v.nome.toUpperCase()}`;
      vt1.font = { name: "Poppins", size: 14, bold: true, color: { argb: C.WHITE } };
      vt1.fill = fill(C.NAVY);
      vt1.alignment = { vertical: "middle", horizontal: "center" };
      wsV.getRow(1).height = 30;

      // Linha 2: Email
      fillRange(wsV, 2, 2, 2, 7, C.DARK_BG);
      wsV.mergeCells("B2:G2");
      const vt2 = wsV.getCell("B2");
      vt2.value = `Email: ${v.email || "—"}`;
      vt2.font = { name: "Inter", size: 9, color: { argb: C.GRAY_TEXT } };
      vt2.alignment = { vertical: "middle", horizontal: "left" };

      // Linha 3: spacer
      wsV.getRow(3).height = 8;

      // Linha 4: headers de categoria — fundo BLUE_ROYAL
      wsV.getRow(4).height = 22;
      const catHeaders = ["Categoria", "Meta", "Realizado", "Projeção", "%", "Status"];
      catHeaders.forEach((h, i) => {
        const cell = wsV.getCell(4, i + 2); // B=2 até G=7
        cell.value = h;
        cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.WHITE } };
        cell.fill = fill(C.BLUE_ROYAL);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: thinSide(C.BLUE_ROYAL),
          bottom: thinSide(C.BLUE_ROYAL),
          left: thinSide(C.BLUE_ROYAL),
          right: thinSide(C.BLUE_ROYAL),
        };
      });

      // Linhas 5-8: 4 categorias — fundo DARK_BG, texto WHITE
      const cats = [
        { nome: "Faturamento", d: v.faturamento, cor: C.NAVY },
        { nome: "Marcas Exclusivas", d: v.me, cor: C.ORANGE },
        { nome: "Genéricos", d: v.gen, cor: C.GREEN_DARK },
        { nome: "Super Desconto", d: v.sd, cor: C.PURPLE },
      ];

      cats.forEach((cat, i) => {
        const row = 5 + i;
        const pct = cat.d.meta > 0 ? (cat.d.realizado / cat.d.meta) * 100 : 0;
        const status = getStatus(pct);

        wsV.getCell(row, 2).value = cat.nome;
        wsV.getCell(row, 3).value = cat.d.meta;
        wsV.getCell(row, 4).value = cat.d.realizado;
        wsV.getCell(row, 5).value = cat.d.projecao;
        wsV.getCell(row, 6).value = fmtPct(pct);
        wsV.getCell(row, 7).value = status.label;

        for (let col = 2; col <= 7; col++) {
          const cell = wsV.getCell(row, col);
          cell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
          cell.fill = fill(C.DARK_BG);
          cell.alignment = {
            vertical: "middle",
            horizontal: col >= 3 && col <= 5 ? "right" : col === 2 ? "left" : "center",
          };
          cell.border = { bottom: thinSide(C.GRAY_BLUE) };
          if (col >= 3 && col <= 5) cell.numFmt = NUMFMT_BRL;
        }

        const statusCell = wsV.getCell(row, 7);
        statusCell.fill = fill(status.fill);
        statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
        statusCell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Linha 10+: "VENDAS DIÁRIAS"
      const vendTitleRow = 10;
      wsV.getRow(vendTitleRow).height = 22;
      fillRange(wsV, vendTitleRow, vendTitleRow, 2, 7, C.DARK_BG);
      wsV.mergeCells(vendTitleRow, 2, vendTitleRow, 7);
      const vendTitle = wsV.getCell(vendTitleRow, 2);
      vendTitle.value = "VENDAS DIÁRIAS";
      vendTitle.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.WHITE } };
      vendTitle.alignment = { vertical: "middle", horizontal: "left" };

      // Headers das vendas (linha 11) — fundo BLUE_ROYAL
      wsV.getRow(11).height = 20;
      const vdHeaders = ["Data", "Categoria", "Valor", "Clientes", "TKM", "Observação"];
      vdHeaders.forEach((h, i) => {
        const cell = wsV.getCell(11, i + 2); // B=2 até G=7
        cell.value = h;
        cell.font = { name: "Inter", size: 8, bold: true, color: { argb: C.WHITE } };
        cell.fill = fill(C.BLUE_ROYAL);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: thinSide(C.BLUE_ROYAL),
          bottom: thinSide(C.BLUE_ROYAL),
          left: thinSide(C.BLUE_ROYAL),
          right: thinSide(C.BLUE_ROYAL),
        };
      });

      // Vendas detalhadas (linha 12+) — zebrado DARK_BG / NAVY
      v.vendasDetalhadas.forEach((vd, i) => {
        const row = 12 + i;
        const rowBg = i % 2 === 0 ? C.DARK_BG : C.NAVY;
        const qtdClientes = Number(vd.qtd_clientes || 0);
        const valorVenda = Number(vd.valor_venda || 0);
        const tkmVal = qtdClientes > 0 ? valorVenda / qtdClientes : 0;

        wsV.getCell(row, 2).value = (vd.data as string) || "";
        wsV.getCell(row, 3).value = String(vd.categoria || "").replace(/_/g, " ");
        wsV.getCell(row, 4).value = valorVenda;
        wsV.getCell(row, 5).value = qtdClientes;
        wsV.getCell(row, 6).value = tkmVal;
        wsV.getCell(row, 7).value = (vd.observacao as string) || "";

        for (let col = 2; col <= 7; col++) {
          const cell = wsV.getCell(row, col);
          cell.font = { name: "Inter", size: 9, color: { argb: C.WHITE } };
          cell.fill = fill(rowBg);
          cell.alignment = {
            vertical: "middle",
            horizontal:
              col === 4 || col === 6 ? "right" : col === 3 || col === 7 ? "left" : "center",
          };
          cell.border = { bottom: thinSide(C.GRAY_BLUE) };
        }
        wsV.getCell(row, 4).numFmt = NUMFMT_BRL;
        wsV.getCell(row, 6).numFmt = NUMFMT_BRL;
      });
    });

    // ----- 4. Gerar buffer -----
    const buffer = await wb.xlsx.writeBuffer();

    return {
      file: Array.from(new Uint8Array(buffer)),
      filename: `Orion_Dashboard_Executivo_${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  });
