// =============================================================
// ORION · TIPOS CENTRAIS DO SISTEMA
// =============================================================

// ---- Perfis de Acesso (RBAC) ----
// 'farmaceutica' pode lançar vendas mas não tem metas explícitas nem poder gerencial/supervisor
export type Perfil = "admin" | "gerente" | "supervisor" | "vendedor" | "farmaceutica";

export interface Permissao {
  modulo: string;
  ler: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  exportar: boolean;
}

export type NavbarVariant =
  | "pill"
  | "bottom-dock"
  | "sidebar-float"
  | "top-minimal"
  | "nav-bottom-flutuante"
  | "nav-fab-inteligente"
  | "nav-perfil-dinamico"
  | "nav-dock-animado"
  | "nav-morphing"
  | "nav-quick-actions"
  | "nav-inteligente";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  avatar?: string;
  iniciais: string;
  perfil: Perfil;
  ativo: boolean;
  empresaId: string;
  filialId?: string;
  equipeId?: string;
  permissoes: Permissao[];
  criadoEm: string;
  ultimoAcesso?: string;
  senha?: string;
  metodoLogin: "email" | "google";
  telefone?: string;
  cargo?: string;
  dataAdmissao?: string;
  navbarVariant?: NavbarVariant;
  onboardingCompleto?: boolean;
  plano?: "trial" | "limitado" | "ativo";
  trialExpiresAt?: string | null;
  aprovado?: boolean;
}

// ---- Empresa ----
export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  logo?: string;
  corPrimaria: string;
  corSecundaria: string;
  plano: "starter" | "profissional" | "enterprise";
  ativo: boolean;
  configuracoes: ConfiguracaoEmpresa;
}

export interface ConfiguracaoEmpresa {
  idioma: string;
  moeda: string;
  fusoHorario: string;
  temaClaro: boolean;
  gamificacaoAtiva: boolean;
  iaAtiva: boolean;
  notificacoesAtivas: boolean;
  camposPersonalizados: CampoPersonalizado[];
}

export interface CampoPersonalizado {
  id: string;
  nome: string;
  tipo: "texto" | "numero" | "data" | "selecao" | "booleano";
  obrigatorio: boolean;
  opcoes?: string[];
  modulo: string;
}

// ---- Filial ----
export interface Filial {
  id: string;
  empresaId: string;
  codigo: number;
  nome: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
  gerenteId?: string;
}

// ---- Equipe ----
export interface Equipe {
  id: string;
  filialId: string;
  nome: string;
  supervisorId?: string;
  membros: string[];
  ativo: boolean;
}

// ---- Indicador ----
export type TipoIndicador = "monetario" | "quantidade" | "percentual" | "unidade";
export type FormulaCalculo = "soma" | "media" | "maximo" | "minimo" | "contagem" | "personalizada";

export interface Indicador {
  id: string;
  empresaId: string;
  nome: string;
  descricao: string;
  tipo: TipoIndicador;
  formula: FormulaCalculo;
  unidade: string;
  icone: string;
  corPrimaria: string;
  ativo: boolean;
  ordenacao: number;
}

// ---- Meta ----
export type PeriodoMeta = "diario" | "semanal" | "quinzenal" | "mensal" | "trimestral" | "semestral" | "anual";
export type StatusMeta = "pendente" | "em_andamento" | "atingida" | "nao_atingida" | "cancelada";

export interface Meta {
  id: string;
  indicadorId: string;
  filialId?: string;
  equipeId?: string;
  usuarioId?: string;
  periodo: PeriodoMeta;
  valorMeta: number;
  valorRealizado: number;
  dataInicio: string;
  dataFim: string;
  status: StatusMeta;
  projecao?: number;
}

// ---- Campanha ----
export type StatusCampanha = "rascunho" | "ativa" | "pausada" | "encerrada";

export interface Campanha {
  id: string;
  empresaId: string;
  nome: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusCampanha;
  regras: RegraCampanha[];
  premios: Premio[];
  participantes: string[];
}

export interface RegraCampanha {
  indicadorId: string;
  peso: number;
  metaMinima: number;
}

export interface Premio {
  posicao: number;
  descricao: string;
  valor?: number;
}

// ---- Gamificação ----
export interface Conquista {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  pontos: number;
  raridade: "comum" | "rara" | "epica" | "lendaria";
  criterio: string;
  ativa: boolean;
}

export interface ConquistaUsuario {
  conquistaId: string;
  usuarioId: string;
  progresso: number;
  desbloqueada: boolean;
  dataDesbloqueio?: string;
}

// ---- Widget ----
export type TipoWidget = "kpi" | "grafico_barra" | "grafico_linha" | "grafico_pizza" | "tabela" | "ranking" | "atividades" | "mapa" | "personalizado";

export interface Widget {
  id: string;
  tipo: TipoWidget;
  titulo: string;
  indicadorId?: string;
  configuracao: Record<string, unknown>;
  largura: 1 | 2 | 3 | 4;
  altura: 1 | 2;
  ordenacao: number;
  perfilMinimo: Perfil;
}

// ---- Notificação ----
export type TipoNotificacao = "info" | "sucesso" | "alerta" | "erro" | "conquista";

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
  link?: string;
}

// ---- Auditoria ----
export interface LogAuditoria {
  id: string;
  usuarioId: string;
  acao: string;
  modulo: string;
  descricao: string;
  dadosAntigos?: Record<string, unknown>;
  dadosNovos?: Record<string, unknown>;
  ip?: string;
  criadoEm: string;
}

// ---- Navegação ----
export interface ItemMenu {
  id: string;
  label: string;
  icone: string;
  rota: string;
  perfilMinimo: Perfil;
  filhos?: ItemMenu[];
  badge?: string;
  separador?: boolean;
}
