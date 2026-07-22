export const filial = { id: 0, nome: "", periodo: "", periodoResultado: "", metaMensal: 0, metaDiaria: 0, clientesMes: 0, tkm: 0, uvc: 0, atingimentoLoja: 0 };
export const categorias: any[] = [];
export const colaboradores: any[] = [];
export const mediaDiaria = { metaDiaria: 0, genericosDiaria: 0, sdDiaria: 0, meDiaria: 0 };
export const conquistas: any[] = [];
export const insights: any[] = [];
export const pilares: any[] = [];
export const notificacoesIniciais: any[] = [];
export const resultadoLoja: any = null;
export const vendasSemanais: any[] = [];
export const evolucaoMensal: any[] = [];
export const distribuicaoCategorias: any[] = [];
export const compromissosHoje: any[] = [];
export const ranking: any[] = [];
export const metas: any[] = [];
export const usuario: any = null;
export type StatusMeta = string;
export type CorStatus = string;
export interface MetaColaborador { [key: string]: any }
export interface ResultadoCategoria { [key: string]: any }
export interface ResultadoFaturamento extends ResultadoCategoria {}
export interface Colaborador { [key: string]: any }
export interface Meta { [key: string]: any }
export interface Notificacao { [key: string]: any }
