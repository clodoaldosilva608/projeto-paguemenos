import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Gera arquivo .xlsx formatado com dashboard executivo premium
export const gerarPlanilhaExecutiva = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({}).parse(v))
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ExcelJS = await import("exceljs");

    // 1. Buscar todos os dados
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

    // 2. Calcular dados agregados
    const nomeMap = new Map((profiles || []).map((p) => [p.id, p.nome]));
    const dadosVendedores = vendedores.map((v) => {
      const metasV = (metas || []).filter((m) => m.usuario_id === v.id);
      const vendasV = (vendas || []).filter((vd) => vd.usuario_id === v.id);
      const fat = metasV.find((m) => m.categoria === "faturamento");
      const me = metasV.find((m) => m.categoria === "marcas_exclusivas");
      const gen = metasV.find((m) => m.categoria === "genericos");
      const sd = metasV.find((m) => m.categoria === "super_desconto");
      return {
        nome: v.nome,
        email: v.email,
        faturamento: { meta: Number(fat?.valor_meta || 0), realizado: Number(fat?.valor_realizado || 0), projecao: Number(fat?.valor_projecao || 0) },
        me: { meta: Number(me?.valor_meta || 0), realizado: Number(me?.valor_realizado || 0), projecao: Number(me?.valor_projecao || 0) },
        gen: { meta: Number(gen?.valor_meta || 0), realizado: Number(gen?.valor_realizado || 0), projecao: Number(gen?.valor_projecao || 0) },
        sd: { meta: Number(sd?.valor_meta || 0), realizado: Number(sd?.valor_realizado || 0), projecao: Number(sd?.valor_projecao || 0) },
        totalVendas: vendasV.reduce((s, vd) => s + Number(vd.valor_venda || 0), 0),
        totalClientes: vendasV.reduce((s, vd) => s + Number(vd.qtd_clientes || 0), 0),
        vendasDetalhadas: vendasV,
      };
    });

    const totais = {
      metaFat: dadosVendedores.reduce((s, v) => s + v.faturamento.meta, 0),
      realFat: dadosVendedores.reduce((s, v) => s + v.faturamento.realizado, 0),
      projFat: dadosVendedores.reduce((s, v) => s + v.faturamento.projecao, 0),
      metaME: dadosVendedores.reduce((s, v) => s + v.me.meta, 0),
      realME: dadosVendedores.reduce((s, v) => s + v.me.realizado, 0),
      metaGen: dadosVendedores.reduce((s, v) => s + v.gen.meta, 0),
      realGen: dadosVendedores.reduce((s, v) => s + v.gen.realizado, 0),
      metaSD: dadosVendedores.reduce((s, v) => s + v.sd.meta, 0),
      realSD: dadosVendedores.reduce((s, v) => s + v.sd.realizado, 0),
      totalClientes: dadosVendedores.reduce((s, v) => s + v.totalClientes, 0),
      totalVendas: dadosVendedores.reduce((s, v) => s + v.totalVendas, 0),
    };

    // 3. Criar workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sistema Orion";
    wb.created = new Date();

    // Cores
    const C = {
      navy: "0B1F3A",
      blue: "1565C0",
      lightBlue: "42A5F5",
      white: "FFFFFF",
      lightGray: "F5F5F5",
      green: "2E7D32",
      orange: "FB8C00",
      red: "D32F2F",
      amber: "FFF8E1",
      emeraldLight: "E8F5E9",
      redLight: "FFEBEE",
      orangeLight: "FFF3E0",
    };

    // ============ ABA 1: DASHBOARD GERAL ============
    const ws = wb.addWorksheet("01 - Dashboard Geral", {
      views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
      properties: { tabColor: { argb: C.blue } },
    });

    // Larguras de coluna
    ws.columns = [
      { width: 5 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 },
      { width: 15 }, { width: 18 }, { width: 15 }, { width: 18 }, { width: 5 },
    ];

    // --- HEADER (linhas 1-3) ---
    // Fundo navy
    for (let col = 1; col <= 10; col++) {
      for (let row = 1; row <= 3; row++) {
        const cell = ws.getCell(row, col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
      }
    }

    // Logo + título
    ws.mergeCells("B1:C1");
    const logoCell = ws.getCell("B1");
    logoCell.value = "ORIONN";
    logoCell.font = { name: "Poppins", size: 20, bold: true, color: { argb: C.white } };
    logoCell.alignment = { vertical: "middle" };

    ws.mergeCells("B2:C2");
    const subCell = ws.getCell("B2");
    subCell.value = "DASHBOARD EXECUTIVO";
    subCell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.lightBlue } };
    subCell.alignment = { vertical: "middle" };

    // Filtros (direita)
    ws.mergeCells("E1:F1");
    ws.getCell("E1").value = "Período: Últimos 7 dias";
    ws.getCell("E1").font = { name: "Inter", size: 9, color: { argb: C.white } };
    ws.getCell("E1").alignment = { vertical: "middle", horizontal: "center" };

    ws.mergeCells("G1:H1");
    ws.getCell("G1").value = "24/07/2026 — 28/07/2026";
    ws.getCell("G1").font = { name: "Inter", size: 9, color: { argb: C.white } };
    ws.getCell("G1").alignment = { vertical: "middle", horizontal: "center" };

    ws.getCell("I1").value = "SINCRONIZAR";
    ws.getCell("I1").font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
    ws.getCell("I1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blue } };
    ws.getCell("I1").alignment = { vertical: "middle", horizontal: "center" };

    ws.mergeCells("E2:I2");
    ws.getCell("E2").value = `Última Sincronização: ${new Date().toLocaleString("pt-BR")}`;
    ws.getCell("E2").font = { name: "Inter", size: 8, color: { argb: "9E9E9E" } };
    ws.getCell("E2").alignment = { vertical: "middle", horizontal: "center" };

    // --- KPI CARDS (linha 5-7) ---
    const kpis = [
      { titulo: "FATURAMENTO TOTAL", valor: `R$ ${totais.realFat.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, cor: C.blue, sub: "Total realizado" },
      { titulo: "META TOTAL", valor: `R$ ${totais.metaFat.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, cor: C.green, sub: "Meta da loja" },
      { titulo: "PROJEÇÃO", valor: `R$ ${totais.projFat.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, cor: C.lightBlue, sub: "Projeção de fechamento" },
      { titulo: "% ATINGIMENTO", valor: `${totais.metaFat > 0 ? ((totais.realFat / totais.metaFat) * 100).toFixed(1) : 0}%`, cor: C.orange, sub: "Meta global" },
      { titulo: "CLIENTES", valor: `${totais.totalClientes}`, cor: "7B1FA2", sub: "Total de clientes" },
      { titulo: "TICKET MÉDIO", valor: `R$ ${(totais.totalClientes > 0 ? totais.totalVendas / totais.totalClientes : 0).toFixed(2)}`, cor: "00695C", sub: "Ticket médio geral" },
      { titulo: "VENDAS", valor: `${(vendas || []).length}`, cor: C.blue, sub: "Total de vendas" },
      { titulo: "VENDEDORES", valor: `${dadosVendedores.length}`, cor: C.navy, sub: "Ativos no período" },
    ];

    // Cada KPI ocupa ~1 coluna, 3 linhas
    kpis.forEach((kpi, i) => {
      const col = i + 2; // B=2 até I=9
      // Linha do título
      const titleCell = ws.getCell(5, col);
      titleCell.value = kpi.titulo;
      titleCell.font = { name: "Inter", size: 7, bold: true, color: { argb: "757575" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.white } };
      titleCell.alignment = { vertical: "middle", horizontal: "center" };
      titleCell.border = { top: { style: "thick", color: { argb: kpi.cor } }, left: { style: "thin", color: { argb: "E0E0E0" } }, right: { style: "thin", color: { argb: "E0E0E0" } } };

      // Linha do valor
      const valCell = ws.getCell(6, col);
      valCell.value = kpi.valor;
      valCell.font = { name: "Poppins", size: 12, bold: true, color: { argb: kpi.cor } };
      valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.white } };
      valCell.alignment = { vertical: "middle", horizontal: "center" };
      valCell.border = { left: { style: "thin", color: { argb: "E0E0E0" } }, right: { style: "thin", color: { argb: "E0E0E0" } } };

      // Linha do subtítulo
      const subCellK = ws.getCell(7, col);
      subCellK.value = kpi.sub;
      subCellK.font = { name: "Inter", size: 7, color: { argb: "9E9E9E" } };
      subCellK.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.white } };
      subCellK.alignment = { vertical: "middle", horizontal: "center" };
      subCellK.border = { bottom: { style: "thin", color: { argb: "E0E0E0" } }, left: { style: "thin", color: { argb: "E0E0E0" } }, right: { style: "thin", color: { argb: "E0E0E0" } } };
    });

    // --- TABELA EXECUTIVA (linha 9+) ---
    const headers = ["#", "INDICADOR", "META", "REALIZADO", "PROJEÇÃO", "% ATING.", "STATUS", "VARIAÇÃO"];
    const headerRow = 9;
    headers.forEach((h, i) => {
      const cell = ws.getCell(headerRow, i + 2);
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = { top: { style: "thin", color: { argb: C.navy } }, bottom: { style: "thin", color: { argb: C.navy } }, left: { style: "thin", color: { argb: C.navy } }, right: { style: "thin", color: { argb: C.navy } } };
    });

    // Dados da tabela
    const indicadores = [
      { nome: "Faturamento", meta: totais.metaFat, real: totais.realFat, proj: totais.projFat },
      { nome: "Marcas Exclusivas", meta: totais.metaME, real: totais.realME, proj: totais.realME },
      { nome: "Genéricos", meta: totais.metaGen, real: totais.realGen, proj: totais.realGen },
      { nome: "Super Desconto", meta: totais.metaSD, real: totais.realSD, proj: totais.realSD },
    ];

    indicadores.forEach((ind, i) => {
      const row = headerRow + 1 + i;
      const pct = ind.meta > 0 ? (ind.real / ind.meta) * 100 : 0;
      const status = pct >= 100 ? "Dentro da Meta" : pct >= 50 ? "Atenção" : "Fora da Meta";
      const statusCor = pct >= 100 ? C.emeraldLight : pct >= 50 ? C.amber : C.redLight;
      const statusFontCor = pct >= 100 ? C.green : pct >= 50 ? C.orange : C.red;

      ws.getCell(row, 2).value = i + 1;
      ws.getCell(row, 3).value = ind.nome;
      ws.getCell(row, 4).value = ind.meta;
      ws.getCell(row, 5).value = ind.real;
      ws.getCell(row, 6).value = ind.proj;
      ws.getCell(row, 7).value = `${pct.toFixed(1)}%`;
      ws.getCell(row, 8).value = status;

      // Formatar linha
      for (let col = 2; col <= 9; col++) {
        const cell = ws.getCell(row, col);
        cell.font = { name: "Inter", size: 9, color: { argb: i % 2 === 0 ? "212121" : "424242" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.lightGray } };
        cell.alignment = { vertical: "middle", horizontal: col >= 4 && col <= 7 ? "right" : "center" };
        cell.border = { bottom: { style: "thin", color: { argb: "E0E0E0" } } };

        if (col === 4 || col === 5 || col === 6) {
          cell.numFmt = 'R$ #,##0.00';
        }
      }

      // Status com cor
      ws.getCell(row, 8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusCor } };
      ws.getCell(row, 8).font = { name: "Inter", size: 8, bold: true, color: { argb: statusFontCor } };
      ws.getCell(row, 8).alignment = { vertical: "middle", horizontal: "center" };
    });

    // Linha TOTAL
    const totalRow = headerRow + 1 + indicadores.length;
    const totalMeta = indicadores.reduce((s, i) => s + i.meta, 0);
    const totalReal = indicadores.reduce((s, i) => s + i.real, 0);
    const totalProj = indicadores.reduce((s, i) => s + i.proj, 0);
    const totalPct = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;

    ws.getCell(totalRow, 2).value = "";
    ws.getCell(totalRow, 3).value = "TOTAL GERAL";
    ws.getCell(totalRow, 4).value = totalMeta;
    ws.getCell(totalRow, 5).value = totalReal;
    ws.getCell(totalRow, 6).value = totalProj;
    ws.getCell(totalRow, 7).value = `${totalPct.toFixed(1)}%`;
    ws.getCell(totalRow, 8).value = totalPct >= 100 ? "Dentro da Meta" : "Atenção";

    for (let col = 2; col <= 9; col++) {
      const cell = ws.getCell(totalRow, col);
      cell.font = { name: "Inter", size: 10, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
      cell.alignment = { vertical: "middle", horizontal: col >= 4 && col <= 7 ? "right" : "center" };
      if (col === 4 || col === 5 || col === 6) cell.numFmt = 'R$ #,##0.00';
    }

    // --- RANKING DE VENDEDORES ---
    const rankStart = totalRow + 3;
    ws.getCell(rankStart, 2).value = "RANKING DE VENDEDORES";
    ws.getCell(rankStart, 2).font = { name: "Poppins", size: 12, bold: true, color: { argb: C.navy } };

    const ranking = [...dadosVendedores].sort((a, b) => b.faturamento.realizado - a.faturamento.realizado);
    const rankHeaders = ["Pos", "Vendedor", "Meta", "Realizado", "Projeção", "%", "Status"];
    rankHeaders.forEach((h, i) => {
      const cell = ws.getCell(rankStart + 1, i + 2);
      cell.value = h;
      cell.font = { name: "Inter", size: 8, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blue } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    ranking.forEach((v, i) => {
      const row = rankStart + 2 + i;
      const pct = v.faturamento.meta > 0 ? (v.faturamento.realizado / v.faturamento.meta) * 100 : 0;
      const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";

      ws.getCell(row, 2).value = `${i + 1} ${medalha}`;
      ws.getCell(row, 3).value = v.nome;
      ws.getCell(row, 4).value = v.faturamento.meta;
      ws.getCell(row, 5).value = v.faturamento.realizado;
      ws.getCell(row, 6).value = v.faturamento.projecao;
      ws.getCell(row, 7).value = `${pct.toFixed(1)}%`;
      ws.getCell(row, 8).value = pct >= 100 ? "Dentro" : pct >= 50 ? "Atenção" : "Fora";

      for (let col = 2; col <= 8; col++) {
        const cell = ws.getCell(row, col);
        cell.font = { name: "Inter", size: 9 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.lightGray } };
        cell.alignment = { vertical: "middle", horizontal: col >= 4 && col <= 6 ? "right" : "center" };
        if (col === 4 || col === 5 || col === 6) cell.numFmt = 'R$ #,##0.00';
      }
    });

    // Rodapé
    const footerRow = rankStart + 2 + ranking.length + 2;
    ws.mergeCells(footerRow, 2, footerRow, 9);
    ws.getCell(footerRow, 2).value = "Relatório gerado automaticamente pelo Sistema Orionn · Fonte: Supabase + Google Sheets + Power BI";
    ws.getCell(footerRow, 2).font = { name: "Inter", size: 8, italic: true, color: { argb: "9E9E9E" } };
    ws.getCell(footerRow, 2).alignment = { horizontal: "center" };

    // ============ ABA 2: FATURAMENTO ============
    const ws2 = wb.addWorksheet("02 - Faturamento", { properties: { tabColor: { argb: C.blue } } });
    ws2.columns = [{ width: 5 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 15 }];
    criarCabecalhoIndicador(ws2, "FATURAMENTO");
    dadosVendedores.forEach((v, i) => {
      const row = i + 4;
      const pct = v.faturamento.meta > 0 ? (v.faturamento.realizado / v.faturamento.meta) * 100 : 0;
      preencherLinhaVendedor(ws2, row, v.nome, v.faturamento, pct, i);
    });

    // ============ ABA 3: MARCAS EXCLUSIVAS ============
    const ws3 = wb.addWorksheet("03 - Marcas Exclusivas", { properties: { tabColor: { argb: C.orange } } });
    ws3.columns = [{ width: 5 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 15 }];
    criarCabecalhoIndicador(ws3, "MARCAS EXCLUSIVAS");
    dadosVendedores.forEach((v, i) => {
      const row = i + 4;
      const pct = v.me.meta > 0 ? (v.me.realizado / v.me.meta) * 100 : 0;
      preencherLinhaVendedor(ws3, row, v.nome, v.me, pct, i);
    });

    // ============ ABA 4: GENÉRICOS ============
    const ws4 = wb.addWorksheet("04 - Genéricos", { properties: { tabColor: { argb: C.green } } });
    ws4.columns = [{ width: 5 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 15 }];
    criarCabecalhoIndicador(ws4, "GENÉRICOS");
    dadosVendedores.forEach((v, i) => {
      const row = i + 4;
      const pct = v.gen.meta > 0 ? (v.gen.realizado / v.gen.meta) * 100 : 0;
      preencherLinhaVendedor(ws4, row, v.nome, v.gen, pct, i);
    });

    // ============ ABA 5: SUPER DESCONTO ============
    const ws5 = wb.addWorksheet("05 - Super Desconto", { properties: { tabColor: { argb: C.red } } });
    ws5.columns = [{ width: 5 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 15 }];
    criarCabecalhoIndicador(ws5, "SUPER DESCONTO");
    dadosVendedores.forEach((v, i) => {
      const row = i + 4;
      const pct = v.sd.meta > 0 ? (v.sd.realizado / v.sd.meta) * 100 : 0;
      preencherLinhaVendedor(ws5, row, v.nome, v.sd, pct, i);
    });

    // ============ ABA 6: HISTÓRICO DE VENDAS ============
    const ws6 = wb.addWorksheet("06 - Histórico de Vendas", { properties: { tabColor: { argb: C.lightBlue } } });
    ws6.columns = [{ width: 5 }, { width: 15 }, { width: 25 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 15 }, { width: 25 }];
    const histHeaders = ["#", "Data", "Vendedor", "Categoria", "Valor (R$)", "Clientes", "Ticket Médio", "Observação"];
    histHeaders.forEach((h, i) => {
      const cell = ws6.getCell(1, i + 1);
      cell.value = h;
      cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let histRow = 2;
    (vendas || []).forEach((vd, i) => {
      const tkm = vd.qtd_clientes > 0 ? Number(vd.valor_venda) / Number(vd.qtd_clientes) : 0;
      ws6.getCell(histRow, 1).value = i + 1;
      ws6.getCell(histRow, 2).value = vd.data;
      ws6.getCell(histRow, 3).value = nomeMap.get(vd.usuario_id) || "—";
      ws6.getCell(histRow, 4).value = vd.categoria?.replace(/_/g, " ") || "";
      ws6.getCell(histRow, 5).value = Number(vd.valor_venda || 0);
      ws6.getCell(histRow, 6).value = Number(vd.qtd_clientes || 0);
      ws6.getCell(histRow, 7).value = tkm;
      ws6.getCell(histRow, 8).value = vd.observacao || "";

      for (let col = 1; col <= 8; col++) {
        const cell = ws6.getCell(histRow, col);
        cell.font = { name: "Inter", size: 9 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.lightGray } };
        cell.alignment = { vertical: "middle" };
      }
      ws6.getCell(histRow, 5).numFmt = 'R$ #,##0.00';
      ws6.getCell(histRow, 7).numFmt = 'R$ #,##0.00';
      histRow++;
    });

    // ============ ABAS INDIVIDUAIS POR VENDEDOR ============
    dadosVendedores.forEach((v) => {
      const nomeAba = `${v.nome.split(" ")[0]}`;
      const wsV = wb.addWorksheet(nomeAba.substring(0, 31), { properties: { tabColor: { argb: C.blue } } });
      wsV.columns = [{ width: 5 }, { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 15 }];

      // Header
      wsV.mergeCells("B1:G1");
      wsV.getCell("B1").value = `DADOS INDIVIDUAIS — ${v.nome}`;
      wsV.getCell("B1").font = { name: "Poppins", size: 14, bold: true, color: { argb: C.white } };
      wsV.getCell("B1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
      wsV.getCell("B1").alignment = { vertical: "middle", horizontal: "center" };

      wsV.getCell("B2").value = `Email: ${v.email}`;
      wsV.getCell("B2").font = { name: "Inter", size: 9, color: { argb: "757575" } };

      // Metas
      const catHeaders = ["Categoria", "Meta", "Realizado", "Projeção", "%", "Status"];
      catHeaders.forEach((h, i) => {
        const cell = wsV.getCell(4, i + 2);
        cell.value = h;
        cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blue } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      const cats = [
        { nome: "Faturamento", d: v.faturamento },
        { nome: "Marcas Exclusivas", d: v.me },
        { nome: "Genéricos", d: v.gen },
        { nome: "Super Desconto", d: v.sd },
      ];

      cats.forEach((cat, i) => {
        const row = 5 + i;
        const pct = cat.d.meta > 0 ? (cat.d.realizado / cat.d.meta) * 100 : 0;
        wsV.getCell(row, 2).value = cat.nome;
        wsV.getCell(row, 3).value = cat.d.meta;
        wsV.getCell(row, 4).value = cat.d.realizado;
        wsV.getCell(row, 5).value = cat.d.projecao;
        wsV.getCell(row, 6).value = `${pct.toFixed(1)}%`;
        wsV.getCell(row, 7).value = pct >= 100 ? "Dentro" : pct >= 50 ? "Atenção" : "Fora";

        for (let col = 2; col <= 7; col++) {
          const cell = wsV.getCell(row, col);
          cell.font = { name: "Inter", size: 9 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.lightGray } };
          if (col >= 3 && col <= 5) cell.numFmt = 'R$ #,##0.00';
        }
      });

      // Vendas detalhadas
      const vendStart = 5 + cats.length + 2;
      wsV.getCell(vendStart, 2).value = "VENDAS DIÁRIAS";
      wsV.getCell(vendStart, 2).font = { name: "Poppins", size: 11, bold: true, color: { argb: C.navy } };

      const vdHeaders = ["Data", "Categoria", "Valor", "Clientes", "TKM", "Obs"];
      vdHeaders.forEach((h, i) => {
        const cell = wsV.getCell(vendStart + 1, i + 2);
        cell.value = h;
        cell.font = { name: "Inter", size: 8, bold: true, color: { argb: C.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.blue } };
      });

      v.vendasDetalhadas.forEach((vd, i) => {
        const row = vendStart + 2 + i;
        const tkm = vd.qtd_clientes > 0 ? Number(vd.valor_venda) / Number(vd.qtd_clientes) : 0;
        wsV.getCell(row, 2).value = vd.data;
        wsV.getCell(row, 3).value = vd.categoria?.replace(/_/g, " ") || "";
        wsV.getCell(row, 4).value = Number(vd.valor_venda || 0);
        wsV.getCell(row, 5).value = Number(vd.qtd_clientes || 0);
        wsV.getCell(row, 6).value = tkm;
        wsV.getCell(row, 7).value = vd.observacao || "";

        for (let col = 2; col <= 7; col++) {
          wsV.getCell(row, col).font = { name: "Inter", size: 9 };
          wsV.getCell(row, col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.lightGray } };
        }
        wsV.getCell(row, 4).numFmt = 'R$ #,##0.00';
        wsV.getCell(row, 6).numFmt = 'R$ #,##0.00';
      });
    });

    // 4. Gerar buffer
    const buffer = await wb.xlsx.writeBuffer();

    return {
      file: Array.from(new Uint8Array(buffer)),
      filename: `Orion_Dashboard_Executivo_${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  });

// Helper: criar cabeçalho de aba de indicador
function criarCabecalhoIndicador(ws: any, titulo: string) {
  const C = { navy: "0B1F3A", white: "FFFFFF" };
  ws.mergeCells("B1:G1");
  ws.getCell("B1").value = titulo;
  ws.getCell("B1").font = { name: "Poppins", size: 14, bold: true, color: { argb: C.white } };
  ws.getCell("B1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  ws.getCell("B1").alignment = { vertical: "middle", horizontal: "center" };

  const headers = ["Vendedor", "Meta", "Realizado", "Projeção", "%", "Status"];
  headers.forEach((h, i) => {
    const cell = ws.getCell(3, i + 2);
    cell.value = h;
    cell.font = { name: "Inter", size: 9, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1565C0" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
}

// Helper: preencher linha de vendedor
function preencherLinhaVendedor(ws: any, row: number, nome: string, d: any, pct: number, i: number) {
  const C = { white: "FFFFFF", lightGray: "F5F5F5" };
  ws.getCell(row, 2).value = nome;
  ws.getCell(row, 3).value = d.meta;
  ws.getCell(row, 4).value = d.realizado;
  ws.getCell(row, 5).value = d.projecao;
  ws.getCell(row, 6).value = `${pct.toFixed(1)}%`;
  ws.getCell(row, 7).value = pct >= 100 ? "Dentro" : pct >= 50 ? "Atenção" : "Fora";

  for (let col = 2; col <= 7; col++) {
    const cell = ws.getCell(row, col);
    cell.font = { name: "Inter", size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? C.white : C.lightGray } };
    cell.alignment = { vertical: "middle", horizontal: col >= 3 && col <= 5 ? "right" : "center" };
    if (col >= 3 && col <= 5) cell.numFmt = 'R$ #,##0.00';
  }
}
