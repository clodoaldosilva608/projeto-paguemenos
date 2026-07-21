import { metas, ranking, usuario } from "../data/mockData";

export interface Insight {
  id: number;
  titulo: string;
  descricao: string;
  icone: string;
  tipo: "positivo" | "alerta" | "dica";
  prioridade: "alta" | "media" | "baixa";
}

export function gerarInsights(): Insight[] {
  const insights: Insight[] = [];
  const usuarioRanking = ranking.find((r) => r.nome === usuario.nome);

  // Insight 1: Posição no ranking
  if (usuarioRanking) {
    const acima = ranking.find((r) => r.posicao === usuarioRanking.posicao - 1);
    if (acima) {
      const diferenca = acima.vendas - usuarioRanking.vendas;
      insights.push({
        id: 1,
        titulo: `Faltam ${diferenca} vendas para subir no ranking`,
        descricao: `Você está na ${usuarioRanking.posicao}ª posição. ${acima.nome} lidera com ${acima.vendas.toLocaleString("pt-BR")} vendas. Foco nos próximos 5 dias!`,
        icone: "🎯",
        tipo: "alerta",
        prioridade: "alta",
      });
    }
  }

  // Insight 2: Metas atrasadas
  const atrasadas = metas.filter((m) => m.status === "Atrasada");
  if (atrasadas.length > 0) {
    insights.push({
      id: 2,
      titulo: `${atrasadas.length} meta${atrasadas.length > 1 ? "s" : ""} atrasada${atrasadas.length > 1 ? "s" : ""}`,
      descricao: `Priorize "${atrasadas[0].titulo}" — ela está afetando seu progresso geral. Dedique 2h hoje para recuperar.`,
      icone: "⚠️",
      tipo: "alerta",
      prioridade: "alta",
    });
  }

  // Insight 3: Meta próxima de concluir
  const quase = metas.filter((m) => m.progresso >= 80 && m.progresso < 100 && m.status !== "Concluída");
  if (quase.length > 0) {
    insights.push({
      id: 3,
      titulo: `Quase lá! ${quase.length} meta${quase.length > 1 ? "s" : ""} no sprint final`,
      descricao: `Você está acima de 80% em ${quase.map((m) => `"${m.titulo}"`).join(", ")}. Um pequeno esforço extra garante a conclusão.`,
      icone: "🔥",
      tipo: "positivo",
      prioridade: "media",
    });
  }

  // Insight 4: Dia produtivo
  insights.push({
    id: 4,
    titulo: "Melhor dia da semana: Sexta-feira",
    descricao: "Historicamente, você vende 32% mais nas sextas. Agende reuniões importantes e follow-ups para esse dia.",
    icone: "📊",
    tipo: "dica",
    prioridade: "baixa",
  });

  // Insight 5: Horário produtivo
  insights.push({
    id: 5,
    titulo: "Seu horário de ouro: 10h-12h",
    descricao: "Suas maiores conversões acontecem entre 10h e 12h. Evite reuniões internas nesse intervalo.",
    icone: "⏰",
    tipo: "dica",
    prioridade: "baixa",
  });

  // Insight 6: Momentum positivo
  insights.push({
    id: 6,
    titulo: "Momentum: 5 dias consecutivos com vendas",
    descricao: "Você está numa sequência vencedora! Mantenha o ritmo — times em streak performam 28% melhor no mês.",
    icone: "💪",
    tipo: "positivo",
    prioridade: "media",
  });

  return insights.sort((a, b) => {
    const p = { alta: 0, media: 1, baixa: 2 };
    return p[a.prioridade] - p[b.prioridade];
  });
}
