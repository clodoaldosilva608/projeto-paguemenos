import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============================================================
// PALETA DE CORES PREMIUM (HEX sem #)
// ============================================================
const C = {
  navy: "0B1629",           // Fundo principal dashboard
  blueRoyal: "1E40AF",      // Azul royal
  blueBright: "2563EB",     // Azul brilhante
  greenDark: "065F46",      // Verde escuro
  greenSuccess: "22C55E",   // Verde sucesso
  greenLightBg: "DCFCE7",   // Verde claro fundo
  orangeStrong: "EA580C",   // Laranja forte
  red: "D32F2F",            // Vermelho
  redLightBg: "FEE2E2",     // Vermelho claro fundo
  amberAlert: "F59E0B",     // Amarelo alerta
  amberLightBg: "FEF3C7",   // Amarelo claro fundo
  purple: "7C3AED",         // Roxo
  cyan: "0891B2",           // Ciano
  lightGray: "F5F5F5",      // Cinza claro
  grayText: "94A3B8",       // Cinza texto
  white: "FFFFFF",          // Branco
  slateDark: "1E293B",      // Azul escuro (cinza azulado)
  blueMedium: "1D4ED8",     // Azul médio
  blueLight: "42A5F5",      // Azul claro
  borderLight: "E0E0E0",    // Borda clara
  titleGray: "757575",      // Cinza título KPI
  subtitleGray: "9E9E9E",   // Cinza subtítulo
  amberText: "92400E",      // Texto amarelo
  redText: "991B1B",        // Texto vermelho
  textDark: "212121",       // Texto escuro
};

// ============================================================
// HELPERS DE FORMATAÇÃO
// ============================================================

function fill(color: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: color } };
}

function thinSide(color: string = C.borderLight) {
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
  if (pct >= 100) return { fill: C.greenLightBg, font: C.greenDark, label: "Dentro da Meta" };
  if (pct >= 50) return { fill: C.amberLightBg, font: C.amberText, label: "Atenção" };
  return { fill: C.redLightBg, font: C.redText, label: "Fora da Meta" };
}

function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(value: number): string {
  return value.toFixed(1).replace(".", ",") + "%";
}

function variation(realizado: number, meta: number): { text: string; color: string } {
  if (meta === 0) return { text: "—", color: C.grayText };
  const diff = ((realizado - meta) / meta) * 100;
  if (diff >= 0) {
    return { text: `↑ ${diff.toFixed(1).replace(".", ",")}%`, color: C.greenSuccess };
  }
  return { text: `↓ ${Math.abs(diff).toFixed(1).replace(".", ",")}%`, color: C.red };
}

const NUMFMT_BRL = 'R$ #,##0.00';

// ============================================================
// SERVER FUNCTION — GERAÇÃO DA PLANILHA EXECUTIVA PREMIUM
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
    // ABA 01 — DASHBOARD GERAL (Visão Executiva)
    // ==========================================================
    const ws = wb.addWorksheet("01 - Dashboard Geral", {
      views: [{ state: "frozen", xSplit: 1, ySplit: 3 }],
      properties: { tabColor: { argb: C.navy } },
    });

    // Larguras das colunas (dashboard específico)
    ws.columns = [
      { width: 3 },  // A
      { width: 18 }, // B
      { width: 18 }, // C
      { width: 18 }, // D
      { width: 18 }, // E
      { width: 18 }, // F
      { width: 15 }, // G
      { width: 15 }, // H
      { width: 15 }, // I
      { width: 15 }, // J
      { width: 15 }, // K
      { width: 15 }, // L
      { width: 15 }, // M
      { width: 3 },  // N
    ];

    // --- LINHAS 1-3: CABEÇALHO EXECUTIVO ---
    // Fundo navy em todas as células A1:N3
    for (let row = 1; row <= 3; row++) {
      for (let col = 1; col <= 14; col++) {
        ws.getCell(row, col).fill = fill(C.navy);
      }
    }
    ws.getRow(1).height = 30;
    ws.getRow(2).height = 18;
    ws.getRow(3).height = 6;

    // B1: ORIONN
    const b1 = ws.getCell("B1");
    b1.value = "ORIONN";
    b1.font = { name: "Poppins", size: 20, bold: true, color: { argb: C.white } };
    b1.alignment = { vertical: "middle", horizontal: "left" };

    // B2: DASHBOARD EXECUTIVO
    const b2 = ws.getCell("B2");
    b2.value = "DASHBOARD EXECUTIVO";
    b2.font = { name: "Inter", size: 10, bold: true, color: { argb: C.blueLight } };
    b2.alignment = { vertical: "middle", horizontal: "left" };

    // E1:F1 merged — Período
    ws.mergeCells("E1:F1");
    const e1 = ws.getCell("E1");
    e1.value = "Período: Últimos 7 dias";
    e1.font = { name: "Inter", size: 9, color: { argb: C.white } };
    e1.alignment = { vertical: "middle", horizontal: "center" };

    // G1:H1 merged — Datas
    ws.mergeCells("G1:H1");
    const g1 = ws.getCell("G1");
    g1.value = "24/07/2026 — 28/07/2026";
    g1.font = { name: "Inter", size: 9, color: { argb: C.white } };
    g1.alignment = { vertical: "middle", horizontal: "center" };

    // I1 — SINCRONIZAR
    const i1 = ws.getCell("I1");
    i1.value = "SINCRONIZAR";
    i1.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
    i1.fill = fill(C.blueBright);
    i1.alignment = { vertical: "middle", horizontal: "center" };

    // E2:I2 merged — Última sincronização
    ws.mergeCells("E2:I2");
    const e2 = ws.getCell("E2");
    e2.value = `Última Sincronização: ${dataAtual}`;
    e2.font = { name: "Inter", size: 8, color: { argb: C.grayText } };
    e2.alignment = { vertical: "middle", horizontal: "center" };

    // --- LINHAS 4-7: KPI CARDS (8 cards horizontais, B até I) ---
    ws.getRow(4).height = 16;
    ws.getRow(5).height = 24;
    ws.getRow(6).height = 12;
    ws.getRow(7).height = 16;

    const pctGlobal = totais.metaFat > 0 ? (totais.realFat / totais.metaFat) * 100 : 0;
    const tkm = totais.totalClientes > 0 ? totais.totalVendasValor / totais.totalClientes : 0;

    const kpis = [
      {
        titulo: "FATURAMENTO TOTAL",
        valor: `R$ ${fmtBRL(totais.realFat)}`,
        sub: "Total realizado",
        cor: C.blueBright,
        vart: variation(totais.realFat, totais.metaFat),
      },
      {
        titulo: "META TOTAL",
        valor: `R$ ${fmtBRL(totais.metaFat)}`,
        sub: "Meta da loja",
        cor: C.greenDark,
        vart: { text: "Meta mensal", color: C.grayText },
      },
      {
        titulo: "PROJEÇÃO",
        valor: `R$ ${fmtBRL(totais.projFat)}`,
        sub: "Projeção de fechamento",
        cor: C.blueMedium,
        vart: variation(totais.projFat, totais.metaFat),
      },
      {
        titulo: "% ATINGIMENTO",
        valor: fmtPct(pctGlobal),
        sub: "Meta global",
        cor: C.orangeStrong,
        vart: {
          text: pctGlobal >= 100 ? "↑ Meta atingida" : "↓ Abaixo da meta",
          color: pctGlobal >= 100 ? C.greenSuccess : C.red,
        },
      },
      {
        titulo: "CLIENTES",
        valor: `${totais.totalClientes}`,
        sub: "Total de clientes",
        cor: C.purple,
        vart: { text: "no período", color: C.grayText },
      },
      {
        titulo: "TICKET MÉDIO",
        valor: `R$ ${fmtBRL(tkm)}`,
        sub: "Ticket médio geral",
        cor: C.cyan,
        vart: { text: "por cliente", color: C.grayText },
      },
      {
        titulo: "VENDAS",
        valor: `${totais.qtdVendas}`,
        sub: "Total de vendas",
        cor: C.blueRoyal,
        vart: { text: "registros", color: C.grayText },
      },
      {
        titulo: "VENDEDORES",
        valor: `${dadosVendedores.length}`,
        sub: "Ativos no período",
        cor: C.slateDark,
        vart: { text: "ativos", color: C.grayText },
      },
    ];

    kpis.forEach((kpi, i) => {
      const col = i + 2; // B=2 até I=9

      // Linha 4: Título — borda superior thick cor do KPI
      const titleCell = ws.getCell(4, col);
      titleCell.value = kpi.titulo;
      titleCell.font = { name: "Inter", size: 7, bold: true, color: { argb: C.titleGray } };
      titleCell.fill = fill(C.white);
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.border = {
        top: thickSide(kpi.cor),
        left: thinSide(),
        right: thinSide(),
      };

      // Linha 5: Valor
      const valCell = ws.getCell(5, col);
      valCell.value = kpi.valor;
      valCell.font = { name: "Poppins", size: 12, bold: true, color: { argb: kpi.cor } };
      valCell.fill = fill(C.white);
      valCell.alignment = { vertical: "middle", horizontal: "center" };
      valCell.border = { left: thinSide(), right: thinSide() };

      // Linha 6: Subtítulo
      const subCell = ws.getCell(6, col);
      subCell.value = kpi.sub;
      subCell.font = { name: "Inter", size: 7, color: { argb: C.subtitleGray } };
      subCell.fill = fill(C.white);
      subCell.alignment = { vertical: "middle", horizontal: "center" };
      subCell.border = { left: thinSide(), right: thinSide() };

      // Linha 7: Variação
      const varCell = ws.getCell(7, col);
      varCell.value = kpi.vart.text;
      varCell.font = { name: "Inter", size: 8, color: { argb: kpi.vart.color } };
      varCell.fill = fill(C.white);
      varCell.alignment = { vertical: "middle", horizontal: "center" };
      varCell.border = {
        bottom: thinSide(),
        left: thinSide(),
        right: thinSide(),
      };
    });

    // --- LINHA 9: TÍTULO DA TABELA ---
    ws.getRow(9).height = 26;
    const titleTbl = ws.getCell("B9");
    titleTbl.value = "DESEMPENHO GERAL POR INDICADOR";
    titleTbl.font = { name: "Poppins", size: 12, bold: true, color: { argb: C.navy } };
    titleTbl.alignment = { vertical: "middle", horizontal: "left" };

    // --- LINHA 10: CABEÇALHO DA TABELA ---
    ws.getRow(10).height = 22;
    const tblHeaders = ["#", "INDICADOR", "META", "REALIZADO", "PROJEÇÃO", "% ATING.", "STATUS", "VARIAÇÃO"];
    tblHeaders.forEach((h, i) => {
      const cell = ws.getCell(10, i + 2); // B=2 até I=9
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
      cell.fill = fill(C.navy);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: thinSide(C.navy),
        bottom: thinSide(C.navy),
        left: thinSide(C.navy),
        right: thinSide(C.navy),
      };
    });

    // --- LINHAS 11-14: DADOS DA TABELA (4 indicadores) ---
    const indicadores = [
      { nome: "Faturamento", meta: totais.metaFat, real: totais.realFat, proj: totais.projFat },
      { nome: "Marcas Exclusivas", meta: totais.metaME, real: totais.realME, proj: totais.projME },
      { nome: "Genéricos", meta: totais.metaGen, real: totais.realGen, proj: totais.projGen },
      { nome: "Super Desconto", meta: totais.metaSD, real: totais.realSD, proj: totais.projSD },
    ];

    indicadores.forEach((ind, i) => {
      const row = 11 + i;
      const pct = ind.meta > 0 ? (ind.real / ind.meta) * 100 : 0;
      const status = getStatus(pct);
      const vart = variation(ind.real, ind.meta);
      const rowBg = i % 2 === 0 ? C.white : C.lightGray;

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
        cell.font = { name: "Inter", size: 9, color: { argb: C.textDark } };
        cell.fill = fill(rowBg);
        cell.alignment = {
          vertical: "middle",
          horizontal: col >= 4 && col <= 6 ? "right" : col === 3 ? "left" : "center",
        };
        cell.border = { bottom: thinSide() };
        if (col === 4 || col === 5 || col === 6) cell.numFmt = NUMFMT_BRL;
      }

      // Status com fundo colorido
      const statusCell = ws.getCell(row, 8);
      statusCell.fill = fill(status.fill);
      statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
      statusCell.alignment = { vertical: "middle", horizontal: "center" };

      // Variação colorida (verde ↑ / vermelho ↓)
      const varCell = ws.getCell(row, 9);
      varCell.font = { name: "Inter", size: 9, bold: true, color: { argb: vart.color } };
      varCell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // --- LINHA 15: TOTAL GERAL ---
    const totalRow = 15;
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
      cell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.white } };
      cell.fill = fill(C.navy);
      cell.alignment = {
        vertical: "middle",
        horizontal: col >= 4 && col <= 6 ? "right" : col === 3 ? "left" : "center",
      };
      if (col === 4 || col === 5 || col === 6) cell.numFmt = NUMFMT_BRL;
    }

    // Sobrepor status e variação com cores próprias
    const totalStatusCell = ws.getCell(totalRow, 8);
    totalStatusCell.fill = fill(totalStatus.fill);
    totalStatusCell.font = { name: "Inter", size: 9, bold: true, color: { argb: totalStatus.font } };

    const totalVarCell = ws.getCell(totalRow, 9);
    totalVarCell.font = { name: "Inter", size: 10, bold: true, color: { argb: totalVar.color } };

    // --- LINHA 17+: RANKING DE VENDEDORES ---
    const rankTitleRow = 17;
    ws.getRow(rankTitleRow).height = 26;
    const rankTitle = ws.getCell(rankTitleRow, 2);
    rankTitle.value = "RANKING DE VENDEDORES";
    rankTitle.font = { name: "Poppins", size: 12, bold: true, color: { argb: C.navy } };
    rankTitle.alignment = { vertical: "middle", horizontal: "left" };

    // Headers do ranking (linha 18) — fundo blueBright
    ws.getRow(18).height = 20;
    const rankHeaders = ["Pos", "Vendedor", "Meta", "Realizado", "Projeção", "%", "Status"];
    rankHeaders.forEach((h, i) => {
      const cell = ws.getCell(18, i + 2); // B=2 até H=8
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
      cell.fill = fill(C.blueBright);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: thinSide(C.blueBright),
        bottom: thinSide(C.blueBright),
        left: thinSide(C.blueBright),
        right: thinSide(C.blueBright),
      };
    });

    // Dados do ranking (linha 19+) — ordenado por realizado desc
    const ranking = [...dadosVendedores].sort(
      (a, b) => b.faturamento.realizado - a.faturamento.realizado,
    );
    ranking.forEach((v, i) => {
      const row = 19 + i;
      const pct = v.faturamento.meta > 0 ? (v.faturamento.realizado / v.faturamento.meta) * 100 : 0;
      const status = getStatus(pct);
      const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
      const rowBg = i % 2 === 0 ? C.white : C.lightGray;

      ws.getCell(row, 2).value = `${i + 1} ${medalha}`.trim();
      ws.getCell(row, 3).value = v.nome;
      ws.getCell(row, 4).value = v.faturamento.meta;
      ws.getCell(row, 5).value = v.faturamento.realizado;
      ws.getCell(row, 6).value = v.faturamento.projecao;
      ws.getCell(row, 7).value = fmtPct(pct);
      ws.getCell(row, 8).value = status.label;

      for (let col = 2; col <= 8; col++) {
        const cell = ws.getCell(row, col);
        cell.font = { name: "Inter", size: 9, color: { argb: C.textDark } };
        cell.fill = fill(rowBg);
        cell.alignment = {
          vertical: "middle",
          horizontal: col >= 4 && col <= 6 ? "right" : col === 3 ? "left" : "center",
        };
        cell.border = { bottom: thinSide() };
        if (col === 4 || col === 5 || col === 6) cell.numFmt = NUMFMT_BRL;
      }

      // Status com cor
      const statusCell = ws.getCell(row, 8);
      statusCell.fill = fill(status.fill);
      statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
      statusCell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // --- RODAPÉ ---
    const footerRow = 19 + ranking.length + 1;
    ws.getRow(footerRow).height = 20;
    ws.mergeCells(footerRow, 2, footerRow, 9);
    const footerCell = ws.getCell(footerRow, 2);
    footerCell.value =
      "Relatório gerado automaticamente pelo Sistema Orionn · Fonte: Supabase + Google Sheets + Power BI";
    footerCell.font = { name: "Inter", size: 8, italic: true, color: { argb: C.grayText } };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };

    // ==========================================================
    // ABAS 02-05 — INDICADORES INDIVIDUAIS
    // ==========================================================
    const abasIndicadores: Array<{
      nome: string;
      tabColor: string;
      titulo: string;
      sub: string;
      dados: (v: VendedorData) => CatData;
    }> = [
      {
        nome: "02 - Faturamento",
        tabColor: C.blueRoyal,
        titulo: "FATURAMENTO",
        sub: "Análise individual por vendedor — Indicador de Faturamento",
        dados: (v) => v.faturamento,
      },
      {
        nome: "03 - Marcas Exclusivas",
        tabColor: C.orangeStrong,
        titulo: "MARCAS EXCLUSIVAS",
        sub: "Análise individual por vendedor — Indicador de Marcas Exclusivas",
        dados: (v) => v.me,
      },
      {
        nome: "04 - Genéricos",
        tabColor: C.greenDark,
        titulo: "GENÉRICOS",
        sub: "Análise individual por vendedor — Indicador de Genéricos",
        dados: (v) => v.gen,
      },
      {
        nome: "05 - Super Desconto",
        tabColor: C.red,
        titulo: "SUPER DESCONTO",
        sub: "Análise individual por vendedor — Indicador de Super Desconto",
        dados: (v) => v.sd,
      },
    ];

    abasIndicadores.forEach((aba) => {
      const wsI = wb.addWorksheet(aba.nome, {
        views: [{ state: "frozen", ySplit: 1 }],
        properties: { tabColor: { argb: aba.tabColor } },
      });

      wsI.columns = [
        { width: 3 },  // A
        { width: 25 }, // B
        { width: 18 }, // C
        { width: 18 }, // D
        { width: 18 }, // E
        { width: 12 }, // F
        { width: 15 }, // G
        { width: 15 }, // H
        { width: 25 }, // I
      ];

      // Linha 1: Título (merge B:G, fundo navy, Poppins 14 bold branco)
      wsI.mergeCells("B1:G1");
      const t1 = wsI.getCell("B1");
      t1.value = aba.titulo;
      t1.font = { name: "Poppins", size: 14, bold: true, color: { argb: C.white } };
      t1.fill = fill(C.navy);
      t1.alignment = { vertical: "middle", horizontal: "center" };
      wsI.getRow(1).height = 30;

      // Linha 2: Subtítulo descritivo
      wsI.mergeCells("B2:G2");
      const t2 = wsI.getCell("B2");
      t2.value = aba.sub;
      t2.font = { name: "Inter", size: 9, italic: true, color: { argb: C.grayText } };
      t2.alignment = { vertical: "middle", horizontal: "center" };
      wsI.getRow(2).height = 18;

      // Linha 4: Headers — fundo blueBright, branco bold
      wsI.getRow(4).height = 22;
      const headers = ["Vendedor", "Meta", "Realizado", "Projeção", "%", "Status"];
      headers.forEach((h, i) => {
        const cell = wsI.getCell(4, i + 2); // B=2 até G=7
        cell.value = h;
        cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
        cell.fill = fill(C.blueBright);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: thinSide(C.blueBright),
          bottom: thinSide(C.blueBright),
          left: thinSide(C.blueBright),
          right: thinSide(C.blueBright),
        };
      });

      // Linhas 5+: um por vendedor, zebrado, formato R$, status colorido
      let sumMeta = 0;
      let sumReal = 0;
      let sumProj = 0;
      dadosVendedores.forEach((v, i) => {
        const row = 5 + i;
        const d = aba.dados(v);
        const pct = d.meta > 0 ? (d.realizado / d.meta) * 100 : 0;
        const status = getStatus(pct);
        const rowBg = i % 2 === 0 ? C.white : C.lightGray;

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
          cell.font = { name: "Inter", size: 9, color: { argb: C.textDark } };
          cell.fill = fill(rowBg);
          cell.alignment = {
            vertical: "middle",
            horizontal: col >= 3 && col <= 5 ? "right" : col === 2 ? "left" : "center",
          };
          cell.border = { bottom: thinSide() };
          if (col >= 3 && col <= 5) cell.numFmt = NUMFMT_BRL;
        }

        // Status com cor
        const statusCell = wsI.getCell(row, 7);
        statusCell.fill = fill(status.fill);
        statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
        statusCell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Última linha: TOTAL com fundo navy, branco bold
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
        cell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.white } };
        cell.fill = fill(C.navy);
        cell.alignment = {
          vertical: "middle",
          horizontal: col >= 3 && col <= 5 ? "right" : col === 2 ? "left" : "center",
        };
        if (col >= 3 && col <= 5) cell.numFmt = NUMFMT_BRL;
      }

      // Status no total com cor própria
      const totalStatusCellI = wsI.getCell(totalRowI, 7);
      totalStatusCellI.fill = fill(totalStatusI.fill);
      totalStatusCellI.font = { name: "Inter", size: 9, bold: true, color: { argb: totalStatusI.font } };
    });

    // ==========================================================
    // ABA 06 — HISTÓRICO DE VENDAS
    // ==========================================================
    const ws6 = wb.addWorksheet("06 - Histórico de Vendas", {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { tabColor: { argb: C.blueLight } },
    });

    ws6.columns = [
      { width: 6 },  // A — #
      { width: 14 }, // B — Data
      { width: 25 }, // C — Vendedor
      { width: 20 }, // D — Categoria
      { width: 15 }, // E — Valor (R$)
      { width: 12 }, // F — Clientes
      { width: 15 }, // G — Ticket Médio
      { width: 30 }, // H — Observação
    ];

    // Linha 1: Headers — fundo navy, branco bold
    ws6.getRow(1).height = 22;
    const histHeaders = ["#", "Data", "Vendedor", "Categoria", "Valor (R$)", "Clientes", "Ticket Médio", "Observação"];
    histHeaders.forEach((h, i) => {
      const cell = ws6.getCell(1, i + 1); // A=1 até H=8
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
      cell.fill = fill(C.navy);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: thinSide(C.navy),
        bottom: thinSide(C.navy),
        left: thinSide(C.navy),
        right: thinSide(C.navy),
      };
    });

    // Linhas 2+: vendas detalhadas, zebradas
    (vendas || []).forEach((vd, i) => {
      const row = 2 + i;
      const rowBg = i % 2 === 0 ? C.white : C.lightGray;
      const tkmVal =
        Number(vd.qtd_clientes) > 0
          ? Number(vd.valor_venda) / Number(vd.qtd_clientes)
          : 0;

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
        cell.font = { name: "Inter", size: 9, color: { argb: C.textDark } };
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
        cell.border = { bottom: thinSide() };
      }
      ws6.getCell(row, 5).numFmt = NUMFMT_BRL;
      ws6.getCell(row, 7).numFmt = NUMFMT_BRL;
    });

    // ==========================================================
    // ABAS 07+ — VENDEDOR INDIVIDUAL (uma por vendedor)
    // ==========================================================
    dadosVendedores.forEach((v) => {
      const primeiroNome = v.nome.split(" ")[0] || v.nome;
      const nomeAba = primeiroNome.substring(0, 31);
      const wsV = wb.addWorksheet(nomeAba, {
        views: [{ state: "frozen", ySplit: 1 }],
        properties: { tabColor: { argb: C.blueBright } },
      });

      wsV.columns = [
        { width: 3 },  // A
        { width: 25 }, // B
        { width: 18 }, // C
        { width: 18 }, // D
        { width: 18 }, // E
        { width: 12 }, // F
        { width: 15 }, // G
        { width: 15 }, // H
        { width: 25 }, // I
      ];

      // Linha 1: merge B:G — "DADOS INDIVIDUAIS — [Nome]"
      wsV.mergeCells("B1:G1");
      const vt1 = wsV.getCell("B1");
      vt1.value = `DADOS INDIVIDUAIS — ${v.nome.toUpperCase()}`;
      vt1.font = { name: "Poppins", size: 14, bold: true, color: { argb: C.white } };
      vt1.fill = fill(C.navy);
      vt1.alignment = { vertical: "middle", horizontal: "center" };
      wsV.getRow(1).height = 30;

      // Linha 2: "Email: ..."
      wsV.mergeCells("B2:G2");
      const vt2 = wsV.getCell("B2");
      vt2.value = `Email: ${v.email || "—"}`;
      vt2.font = { name: "Inter", size: 9, color: { argb: C.grayText } };
      vt2.alignment = { vertical: "middle", horizontal: "left" };

      // Linha 4: headers de categoria — fundo blueBright
      wsV.getRow(4).height = 22;
      const catHeaders = ["Categoria", "Meta", "Realizado", "Projeção", "%", "Status"];
      catHeaders.forEach((h, i) => {
        const cell = wsV.getCell(4, i + 2); // B=2 até G=7
        cell.value = h;
        cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
        cell.fill = fill(C.blueBright);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: thinSide(C.blueBright),
          bottom: thinSide(C.blueBright),
          left: thinSide(C.blueBright),
          right: thinSide(C.blueBright),
        };
      });

      // Linhas 5-8: 4 categorias (Faturamento, ME, Genéricos, SD)
      const cats = [
        { nome: "Faturamento", d: v.faturamento },
        { nome: "Marcas Exclusivas", d: v.me },
        { nome: "Genéricos", d: v.gen },
        { nome: "Super Desconto", d: v.sd },
      ];

      cats.forEach((cat, i) => {
        const row = 5 + i;
        const pct = cat.d.meta > 0 ? (cat.d.realizado / cat.d.meta) * 100 : 0;
        const status = getStatus(pct);
        const rowBg = i % 2 === 0 ? C.white : C.lightGray;

        wsV.getCell(row, 2).value = cat.nome;
        wsV.getCell(row, 3).value = cat.d.meta;
        wsV.getCell(row, 4).value = cat.d.realizado;
        wsV.getCell(row, 5).value = cat.d.projecao;
        wsV.getCell(row, 6).value = fmtPct(pct);
        wsV.getCell(row, 7).value = status.label;

        for (let col = 2; col <= 7; col++) {
          const cell = wsV.getCell(row, col);
          cell.font = { name: "Inter", size: 9, color: { argb: C.textDark } };
          cell.fill = fill(rowBg);
          cell.alignment = {
            vertical: "middle",
            horizontal: col >= 3 && col <= 5 ? "right" : col === 2 ? "left" : "center",
          };
          cell.border = { bottom: thinSide() };
          if (col >= 3 && col <= 5) cell.numFmt = NUMFMT_BRL;
        }

        // Status com cor
        const statusCell = wsV.getCell(row, 7);
        statusCell.fill = fill(status.fill);
        statusCell.font = { name: "Inter", size: 8, bold: true, color: { argb: status.font } };
        statusCell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // Linha 10+: "VENDAS DIÁRIAS"
      const vendTitleRow = 10;
      wsV.getRow(vendTitleRow).height = 22;
      const vendTitle = wsV.getCell(vendTitleRow, 2);
      vendTitle.value = "VENDAS DIÁRIAS";
      vendTitle.font = { name: "Poppins", size: 11, bold: true, color: { argb: C.navy } };
      vendTitle.alignment = { vertical: "middle", horizontal: "left" };

      // Headers das vendas (linha 11) — fundo blueBright
      wsV.getRow(11).height = 20;
      const vdHeaders = ["Data", "Categoria", "Valor", "Clientes", "TKM", "Observação"];
      vdHeaders.forEach((h, i) => {
        const cell = wsV.getCell(11, i + 2); // B=2 até G=7
        cell.value = h;
        cell.font = { name: "Inter", size: 8, bold: true, color: { argb: C.white } };
        cell.fill = fill(C.blueBright);
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: thinSide(C.blueBright),
          bottom: thinSide(C.blueBright),
          left: thinSide(C.blueBright),
          right: thinSide(C.blueBright),
        };
      });

      // Vendas detalhadas (linha 12+)
      v.vendasDetalhadas.forEach((vd, i) => {
        const row = 12 + i;
        const rowBg = i % 2 === 0 ? C.white : C.lightGray;
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
          cell.font = { name: "Inter", size: 9, color: { argb: C.textDark } };
          cell.fill = fill(rowBg);
          cell.alignment = {
            vertical: "middle",
            horizontal:
              col === 4 || col === 6
                ? "right"
                : col === 3 || col === 7
                  ? "left"
                  : "center",
          };
          cell.border = { bottom: thinSide() };
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
