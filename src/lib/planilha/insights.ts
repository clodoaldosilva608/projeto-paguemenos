import type { DashboardData } from "@/lib/planilha/data";
import { CATEGORIAS, indicadoresPorVendedor, somaPorDia } from "@/lib/planilha/data";
import { fmtBRL, fmtPct, fmtData } from "@/lib/planilha/format";

export type InsightTone = "positivo" | "atencao" | "critico" | "neutro";

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: string;
  title: string;
  detail: string;
}

// Motor de insights: transforma os números do período em recomendações acionáveis.
export function gerarInsights(d: DashboardData): Insight[] {
  const out: Insight[] = [];
  const t = d.total;

  // 1. Gap para a meta e ritmo diário necessário
  const gap = t.meta - t.realizado;
  if (gap > 0) {
    out.push({
      id: "gap",
      tone: t.atingimento >= 70 ? "atencao" : "critico",
      icon: "🎯",
      title: `Faltam ${fmtBRL(gap)} para bater a meta`,
      detail: `A loja está em ${fmtPct(t.atingimento)} da meta de ${fmtBRL(t.meta)}. A projeção atual indica fechamento em ${fmtBRL(t.projecao)}.`,
    });
  } else if (t.meta > 0) {
    out.push({
      id: "gap",
      tone: "positivo",
      icon: "🏆",
      title: "Meta da loja superada",
      detail: `Realizado de ${fmtBRL(t.realizado)} contra meta de ${fmtBRL(t.meta)} (${fmtPct(t.atingimento)}).`,
    });
  }

  // 2. Destaque positivo — melhor vendedor por atingimento
  const ranking = indicadoresPorVendedor(d.indicadores).filter((v) => v.meta > 0);
  const melhor = [...ranking].sort((a, b) => b.atingimento - a.atingimento)[0];
  if (melhor) {
    out.push({
      id: "melhor",
      tone: "positivo",
      icon: "⭐",
      title: `${melhor.nome} lidera em atingimento`,
      detail: `${fmtPct(melhor.atingimento)} da meta · ${fmtBRL(melhor.realizado)} realizados de ${fmtBRL(melhor.meta)}.`,
    });
  }

  // 3. Quem precisa de apoio
  const pior = [...ranking].sort((a, b) => a.atingimento - b.atingimento)[0];
  if (pior && melhor && pior.vendedorId !== melhor.vendedorId && pior.atingimento < 70) {
    out.push({
      id: "apoio",
      tone: pior.atingimento < 30 ? "critico" : "atencao",
      icon: "🤝",
      title: `${pior.nome} precisa de apoio`,
      detail: `Está em ${fmtPct(pior.atingimento)} da meta. Faltam ${fmtBRL(Math.max(0, pior.meta - pior.realizado))} para o objetivo.`,
    });
  }

  // 4. Categoria mais crítica
  const categorias = CATEGORIAS.map((c) => ({ nome: c, ...d.porCategoria[c] })).filter((c) => c.meta > 0);
  const catCritica = [...categorias].sort((a, b) => a.atingimento - b.atingimento)[0];
  if (catCritica && catCritica.atingimento < 70) {
    out.push({
      id: "categoria",
      tone: catCritica.atingimento < 30 ? "critico" : "atencao",
      icon: "📉",
      title: `${catCritica.nome} é a categoria mais crítica`,
      detail: `Apenas ${fmtPct(catCritica.atingimento)} da meta de ${fmtBRL(catCritica.meta)}. Priorize ações nesta frente.`,
    });
  }

  // 5. Melhor dia de vendas do período
  const dias = somaPorDia(d.atuais);
  const melhorDia = [...dias].sort((a, b) => b.valor - a.valor)[0];
  if (melhorDia) {
    const media = dias.reduce((s, x) => s + x.valor, 0) / Math.max(dias.length, 1);
    const acima = media > 0 ? ((melhorDia.valor - media) / media) * 100 : 0;
    out.push({
      id: "melhor-dia",
      tone: "neutro",
      icon: "📅",
      title: `${fmtData(melhorDia.data)} foi o melhor dia`,
      detail: `${fmtBRL(melhorDia.valor)} em vendas — ${fmtPct(Math.abs(acima), 1)} ${acima >= 0 ? "acima" : "abaixo"} da média diária de ${fmtBRL(media)}.`,
    });
  }

  // 6. Ticket médio comparado à loja
  if (t.ticketMedio > 0) {
    out.push({
      id: "ticket",
      tone: "neutro",
      icon: "🎟️",
      title: `Ticket médio de ${fmtBRL(t.ticketMedio)}`,
      detail: `${t.clientes} clientes atendidos geraram ${fmtBRL(t.vendasValor)} em lançamentos no período filtrado.`,
    });
  }

  // 7. Categorias sem nenhum realizado
  const zeradas = categorias.filter((c) => c.realizado === 0);
  if (zeradas.length > 0) {
    out.push({
      id: "zeradas",
      tone: "critico",
      icon: "⚠️",
      title: `${zeradas.length} categoria(s) sem realizado`,
      detail: `${zeradas.map((z) => z.nome).join(", ")} está(ão) zerada(s) com meta somada de ${fmtBRL(zeradas.reduce((s, z) => s + z.meta, 0))}.`,
    });
  }

  return out;
}

// Resumo em uma linha para o topo do dashboard
export function resumoExecutivo(d: DashboardData): { texto: string; tone: InsightTone } {
  const t = d.total;
  if (t.meta === 0) return { texto: "Sem metas cadastradas para o filtro atual.", tone: "neutro" };
  if (t.atingimento >= 100) return { texto: `Meta superada: ${fmtPct(t.atingimento)} de atingimento com ${fmtBRL(t.realizado)} realizados.`, tone: "positivo" };
  if (t.atingimento >= 70) return { texto: `Dentro da meta com ${fmtPct(t.atingimento)}. Faltam ${fmtBRL(t.meta - t.realizado)} para o objetivo.`, tone: "positivo" };
  if (t.atingimento >= 30) return { texto: `Atenção: ${fmtPct(t.atingimento)} da meta. Ritmo atual projeta ${fmtBRL(t.projecao)} no fechamento.`, tone: "atencao" };
  return { texto: `Situação crítica: apenas ${fmtPct(t.atingimento)} da meta atingida no período.`, tone: "critico" };
}
