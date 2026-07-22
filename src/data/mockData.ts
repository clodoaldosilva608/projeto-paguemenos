// ============================================================
// ORION · FILIAL 7537 · METAS E RESULTADOS (JULHO / 2026)
// ============================================================

export const filial = {
  id: 7537,
  nome: "Filial 7537",
  periodo: "Julho / 2026",
  periodoResultado: "01 a 12/07/2026",
  metaMensal: 766254.66,
  metaDiaria: 24717.89,
  clientesMes: 8664,
  tkm: 88.44,
  uvc: 3.02,
  atingimentoLoja: 38.71,
};

export const categorias = [
  {
    id: "genericos",
    nome: "GENÉRICOS + SIMILARES",
    mensal: 157268.17,
    diaria: 5073.16,
    tom: "navy" as const,
  },
  {
    id: "me",
    nome: "MARCAS EXCLUSIVAS",
    mensal: 57253.67,
    diaria: 1846.89,
    tom: "red" as const,
  },
  {
    id: "sd",
    nome: "SUPER DESCONTO",
    mensal: 4000.0,
    diaria: 100.0,
    tom: "navy" as const,
  },
];

export type StatusMeta = "DENTRO DA META" | "FORA DA META" | "ATENÇÃO";
export type CorStatus = "green" | "red" | "yellow";

export interface MetaColaborador {
  mensal: number | null;
  diaria: number | null;
  genericosMensal: number | null;
  genericosDiaria: number | null;
  sdMensal: number | null;
  sdDiaria: number | null;
  meMensal: number | null;
  meDiaria: number | null;
}

export interface ResultadoCategoria {
  meta: number;
  realizado: number;
  ranking: number;
  atingimento: number; // percentual
  projecao: number;
  status: StatusMeta;
  corStatus: CorStatus;
}

export interface ResultadoFaturamento extends ResultadoCategoria {
  clientes: number;
  ticketMedio: number;
}

export interface Colaborador {
  nome: string;
  iniciais: string;
  ferias?: boolean;
  metas: MetaColaborador;
  resultados?: {
    faturamento: ResultadoFaturamento;
    me: ResultadoCategoria;
    genericos: ResultadoCategoria;
  };
}

export const colaboradores: Colaborador[] = [
  {
    nome: "TAINÁ",
    iniciais: "TA",
    ferias: true,
    metas: {
      mensal: null,
      diaria: null,
      genericosMensal: null,
      genericosDiaria: null,
      sdMensal: null,
      sdDiaria: null,
      meMensal: null,
      meDiaria: null,
    },
  },
  {
    nome: "ELIELTON",
    iniciais: "EL",
    metas: {
      mensal: 155292.03,
      diaria: 6470.5,
      genericosMensal: 32696.34,
      genericosDiaria: 1362.34,
      sdMensal: 670.0,
      sdDiaria: 27.92,
      meMensal: 9899.3,
      meDiaria: 412.47,
    },
    resultados: {
      faturamento: {
        meta: 155292.03,
        realizado: 63082.0,
        ranking: 4,
        atingimento: 40.62,
        projecao: 162961.83,
        status: "DENTRO DA META",
        corStatus: "green",
        clientes: 571,
        ticketMedio: 110.48,
      },
      me: {
        meta: 9899.3,
        realizado: 3954.0,
        ranking: 2,
        atingimento: 39.94,
        projecao: 10214.5,
        status: "DENTRO DA META",
        corStatus: "green",
      },
      genericos: {
        meta: 32696.34,
        realizado: 11442.0,
        ranking: 3,
        atingimento: 34.99,
        projecao: 29558.5,
        status: "FORA DA META",
        corStatus: "yellow",
      },
    },
  },
  {
    nome: "ADELINO",
    iniciais: "AD",
    metas: {
      mensal: 150661.04,
      diaria: 5794.65,
      genericosMensal: 28324.37,
      genericosDiaria: 1089.39,
      sdMensal: 670.0,
      sdDiaria: 29.13,
      meMensal: 11980.43,
      meDiaria: 460.78,
    },
    resultados: {
      faturamento: {
        meta: 150661.04,
        realizado: 54119.0,
        ranking: 5,
        atingimento: 35.92,
        projecao: 139807.42,
        status: "FORA DA META",
        corStatus: "red",
        clientes: 606,
        ticketMedio: 89.31,
      },
      me: {
        meta: 11980.43,
        realizado: 4684.0,
        ranking: 4,
        atingimento: 39.1,
        projecao: 12100.33,
        status: "DENTRO DA META",
        corStatus: "green",
      },
      genericos: {
        meta: 28324.37,
        realizado: 11766.0,
        ranking: 1,
        atingimento: 41.54,
        projecao: 30395.5,
        status: "DENTRO DA META",
        corStatus: "green",
      },
    },
  },
  {
    nome: "MIEKO",
    iniciais: "MI",
    metas: {
      mensal: 127215.6,
      diaria: 6057.88,
      genericosMensal: 27785.42,
      genericosDiaria: 1323.11,
      sdMensal: 670.0,
      sdDiaria: 27.92,
      meMensal: 8303.11,
      meDiaria: 395.38,
    },
    resultados: {
      faturamento: {
        meta: 127215.6,
        realizado: 34203.0,
        ranking: 6,
        atingimento: 26.89,
        projecao: 88357.75,
        status: "FORA DA META",
        corStatus: "red",
        clientes: 470,
        ticketMedio: 72.77,
      },
      me: {
        meta: 8303.11,
        realizado: 2287.0,
        ranking: 6,
        atingimento: 27.54,
        projecao: 5908.08,
        status: "FORA DA META",
        corStatus: "red",
      },
      genericos: {
        meta: 27785.42,
        realizado: 7335.0,
        ranking: 5,
        atingimento: 26.4,
        projecao: 18948.75,
        status: "FORA DA META",
        corStatus: "red",
      },
    },
  },
  {
    nome: "FÁBIO",
    iniciais: "FA",
    metas: {
      mensal: 178483.18,
      diaria: 7760.13,
      genericosMensal: 34554.32,
      genericosDiaria: 1502.36,
      sdMensal: 670.0,
      sdDiaria: 29.13,
      meMensal: 13790.25,
      meDiaria: 599.57,
    },
    resultados: {
      faturamento: {
        meta: 178483.18,
        realizado: 74410.0,
        ranking: 3,
        atingimento: 41.69,
        projecao: 192225.83,
        status: "DENTRO DA META",
        corStatus: "green",
        clientes: 764,
        ticketMedio: 97.4,
      },
      me: {
        meta: 13790.25,
        realizado: 6158.0,
        ranking: 1,
        atingimento: 44.65,
        projecao: 15908.17,
        status: "DENTRO DA META",
        corStatus: "green",
      },
      genericos: {
        meta: 34554.32,
        realizado: 14194.0,
        ranking: 2,
        atingimento: 41.08,
        projecao: 36667.83,
        status: "DENTRO DA META",
        corStatus: "green",
      },
    },
  },
  {
    nome: "ALÍCIA",
    iniciais: "AL",
    metas: {
      mensal: 114613.03,
      diaria: 4775.54,
      genericosMensal: 28341.05,
      genericosDiaria: 1180.87,
      sdMensal: 670.0,
      sdDiaria: 29.13,
      meMensal: 7665.35,
      meDiaria: 319.38,
    },
    resultados: {
      faturamento: {
        meta: 114613.03,
        realizado: 54642.0,
        ranking: 1,
        atingimento: 47.68,
        projecao: 141158.5,
        status: "DENTRO DA META",
        corStatus: "green",
        clientes: 584,
        ticketMedio: 93.57,
      },
      me: {
        meta: 7665.35,
        realizado: 3028.0,
        ranking: 3,
        atingimento: 39.5,
        projecao: 7822.33,
        status: "DENTRO DA META",
        corStatus: "green",
      },
      genericos: {
        meta: 28341.05,
        realizado: 9555.0,
        ranking: 4,
        atingimento: 33.71,
        projecao: 24683.75,
        status: "FORA DA META",
        corStatus: "red",
      },
    },
  },
  {
    nome: "CLODOALDO",
    iniciais: "CL",
    metas: {
      mensal: 24855.66,
      diaria: 994.22,
      genericosMensal: null,
      genericosDiaria: null,
      sdMensal: 670.0,
      sdDiaria: null,
      meMensal: 5967.44,
      meDiaria: 238.69,
    },
    resultados: {
      faturamento: {
        meta: 24855.66,
        realizado: 11135.0,
        ranking: 2,
        atingimento: 44.8,
        projecao: 28765.42,
        status: "DENTRO DA META",
        corStatus: "green",
        clientes: 319,
        ticketMedio: 34.91,
      },
      me: {
        meta: 5967.44,
        realizado: 1990.0,
        ranking: 5,
        atingimento: 33.35,
        projecao: 5140.83,
        status: "FORA DA META",
        corStatus: "red",
      },
      genericos: {
        meta: 0,
        realizado: 0,
        ranking: 0,
        atingimento: 0,
        projecao: 0,
        status: "FORA DA META",
        corStatus: "red",
      },
    },
  },
];

export const mediaDiaria = {
  metaDiaria: 24717.89,
  genericosDiaria: 5100.0,
  sdDiaria: 140.0,
  meDiaria: 1900.0,
};

// ============== RESULTADOS CONSOLIDADOS DA LOJA ==============

export const resultadoLoja = {
  faturamento: {
    meta: 766254.66,
    realizado: 300387.0,
    atingimento: 39.2,
    projecao: 775999.75,
    status: "DENTRO DA META" as StatusMeta,
    corStatus: "green" as CorStatus,
    clientes: 3387,
    ticketMedio: 88.69,
  },
  me: {
    meta: 57253.67,
    realizado: 22435.0,
    atingimento: 39.19,
    projecao: 57957.08,
    status: "DENTRO DA META" as StatusMeta,
    corStatus: "green" as CorStatus,
  },
  genericos: {
    meta: 157268.17,
    realizado: 56503.0,
    atingimento: 35.93,
    projecao: 145966.08,
    status: "FORA DA META" as StatusMeta,
    corStatus: "yellow" as CorStatus,
  },
};

export const pilares = [
  "Disciplina na rotina gera resultado.",
  "Acompanhamento diário",
  "Feedback semanal",
  "Execução com foco",
];

// ============== COMPATIBILIDADE (componentes legados) ==============

export interface Meta {
  id: number;
  titulo: string;
  categoria: string;
  progresso: number;
  meta: number;
  atual: number;
  unidade: string;
  prazo: string;
  status: "Em dia" | "Atenção" | "Atrasada" | "Concluída";
}

export const metas: Meta[] = colaboradores
  .filter((c) => !c.ferias && c.resultados)
  .map((c, i) => ({
    id: i + 1,
    titulo: `Meta mensal · ${c.nome}`,
    categoria: "Faturamento",
    progresso: c.resultados!.faturamento.atingimento,
    meta: c.resultados!.faturamento.meta,
    atual: c.resultados!.faturamento.realizado,
    unidade: "R$",
    prazo: "31 Jul 2026",
    status:
      c.resultados!.faturamento.corStatus === "green"
        ? "Em dia"
        : c.resultados!.faturamento.corStatus === "yellow"
        ? "Atenção"
        : "Atrasada",
  }));

export interface RankingItem {
  posicao: number;
  nome: string;
  iniciais: string;
  vendas: number;
  meta: number;
  variacao: number;
  cor: string;
}

export const ranking: RankingItem[] = colaboradores
  .filter((c) => c.resultados)
  .sort((a, b) => a.resultados!.faturamento.ranking - b.resultados!.faturamento.ranking)
  .map((c) => ({
    posicao: c.resultados!.faturamento.ranking,
    nome: c.nome.charAt(0) + c.nome.slice(1).toLowerCase(),
    iniciais: c.iniciais,
    vendas: c.resultados!.faturamento.realizado,
    meta: c.resultados!.faturamento.meta,
    variacao: c.resultados!.faturamento.atingimento,
    cor: "from-sky-500 to-blue-700",
  }));

export const vendasSemanais = [
  { dia: "01", vendas: 24100, meta: 24717 },
  { dia: "02", vendas: 25800, meta: 24717 },
  { dia: "03", vendas: 23400, meta: 24717 },
  { dia: "04", vendas: 26900, meta: 24717 },
  { dia: "05", vendas: 27500, meta: 24717 },
  { dia: "06", vendas: 28200, meta: 24717 },
  { dia: "07", vendas: 25400, meta: 24717 },
  { dia: "08", vendas: 24800, meta: 24717 },
  { dia: "09", vendas: 26300, meta: 24717 },
  { dia: "10", vendas: 25100, meta: 24717 },
  { dia: "11", vendas: 24600, meta: 24717 },
  { dia: "12", vendas: 24287, meta: 24717 },
];

export const evolucaoMensal = [
  { mes: "Fev", vendas: 612000 },
  { mes: "Mar", vendas: 648000 },
  { mes: "Abr", vendas: 671000 },
  { mes: "Mai", vendas: 695000 },
  { mes: "Jun", vendas: 724000 },
  { mes: "Jul", vendas: 300387 },
];

export const distribuicaoCategorias = [
  { nome: "Genéricos", valor: 56503 },
  { nome: "Marcas Exclusivas", valor: 22435 },
  { nome: "Super Desconto", valor: 2400 },
  { nome: "Outros", valor: 219049 },
];

export const usuario = {
  nome: "Gerente da Filial",
  cargo: "Gestor · Filial 7537",
  equipe: "Filial 7537",
};

export interface Compromisso {
  id: number;
  titulo: string;
  horario: string;
  tipo: "reuniao" | "treinamento" | "followup" | "entrega";
  participantes?: string[];
}

export const compromissosHoje: Compromisso[] = [
  { id: 1, titulo: "Reunião de abertura · briefing diário", horario: "07:30", tipo: "reuniao", participantes: ["EL", "AD", "MI", "FA", "AL", "CL"] },
  { id: 2, titulo: "Acompanhamento de caixa e ticket médio", horario: "11:00", tipo: "followup" },
  { id: 3, titulo: "Treinamento · Marcas Exclusivas", horario: "14:00", tipo: "treinamento" },
  { id: 4, titulo: "Feedback semanal com equipe", horario: "17:30", tipo: "reuniao", participantes: ["EL", "AD", "MI", "FA", "AL", "CL"] },
];

export interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  tempo: string;
  lida: boolean;
  tipo: "sucesso" | "alerta" | "info" | "conquista";
}

export const notificacoesIniciais: Notificacao[] = [
  { id: 1, titulo: "Alícia lidera o faturamento", mensagem: "47,68% de atingimento · projeção de R$ 141.158,50.", tempo: "há 1h", lida: false, tipo: "sucesso" },
  { id: 2, titulo: "Atenção em Genéricos", mensagem: "Categoria fora da meta com 35,93% de atingimento.", tempo: "há 3h", lida: false, tipo: "alerta" },
  { id: 3, titulo: "Projeção da filial positiva", mensagem: "Faturamento projetado em R$ 775.999,75 (101,3% da meta).", tempo: "há 6h", lida: true, tipo: "info" },
  { id: 4, titulo: "Tainá em férias", mensagem: "Retorno previsto para 01/08.", tempo: "há 2d", lida: true, tipo: "info" },
];

export interface Conquista {
  id: number;
  titulo: string;
  descricao: string;
  icone: string;
  desbloqueada: boolean;
  progresso?: number;
  data?: string;
  raridade: "comum" | "rara" | "épica" | "lendária";
}

export const conquistas: Conquista[] = [
  { id: 1, titulo: "Abertura no horário", descricao: "12 dias consecutivos abrindo a filial antes das 07:00", icone: "⏰", desbloqueada: true, data: "12 Jul 2026", raridade: "comum" },
  { id: 2, titulo: "UVC acima de 3", descricao: "Manter UVC ≥ 3,00 por 7 dias seguidos", icone: "📦", desbloqueada: true, data: "10 Jul 2026", raridade: "rara" },
  { id: 3, titulo: "Ticket Médio premium", descricao: "TKM ≥ R$ 95,00 em um dia de operação", icone: "💎", desbloqueada: true, data: "08 Jul 2026", raridade: "rara" },
  { id: 4, titulo: "ME em destaque", descricao: "Marcas Exclusivas dentro da meta por 15 dias", icone: "🏷️", desbloqueada: false, progresso: 60, raridade: "épica" },
  { id: 5, titulo: "Filial de Elite", descricao: "Atingir 100% da meta mensal em todas as categorias", icone: "🏆", desbloqueada: false, progresso: 39, raridade: "lendária" },
  { id: 6, titulo: "Zero ruptura", descricao: "7 dias sem ruptura em gôndola de genéricos", icone: "🛒", desbloqueada: false, progresso: 71, raridade: "épica" },
];

export const atividadesRecentes = [
  { id: 1, texto: "FÁBIO atingiu 41,69% de faturamento · projeção de R$ 192.225,83.", tempo: "há 2 horas" },
  { id: 2, texto: "ADELINO lidera genéricos com 41,54% · dentro da meta.", tempo: "há 5 horas" },
  { id: 3, texto: "Ticket médio da filial em R$ 88,69 · acima do planejado.", tempo: "há 1 dia" },
  { id: 4, texto: "Genéricos da filial fora da meta (35,93%) · ação corretiva acionada.", tempo: "há 1 dia" },
  { id: 5, texto: "Relatório consolidado de 01 a 12/07 disponível para download.", tempo: "há 2 dias" },
];
