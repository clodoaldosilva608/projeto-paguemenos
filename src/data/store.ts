import type { Perfil, Permissao, Usuario } from "../types/core";

export function gerarPermissoes(perfil: Perfil): Permissao[] {
  const modulos = ["dashboard","metas","indicadores","campanhas","equipes","filiais","usuarios","ranking","gamificacao","relatorios","notificacoes","auditoria","configuracoes","ia"];
  const isAdmin = perfil === "admin";
  // Gerente tem acesso total igual ao admin (todas as ferramentas e funções)
  const isGerente = perfil === "admin" || perfil === "gerente";
  const isSupervisor = isGerente || perfil === "supervisor";
  // 'farmaceutica' tem as mesmas permissões de vendedor: pode lançar vendas, sem poder gerencial
  const isVendedorOuFarmaceutica = perfil === "vendedor" || perfil === "farmaceutica";
  return modulos.map((modulo) => ({
    modulo, ler: true,
    criar: isGerente,
    editar: isGerente,
    excluir: isGerente,
    exportar: isSupervisor,
  }));
}

export const usuariosDemo: Usuario[] = [];

export const store: any = {
  usuarios: [], filiais: [], equipes: [], metas: [],
  getEmpresa: () => ({ id: "e-demo", nome: "Pague Menos", cnpj: "", corPrimaria: "#003DA5", corSecundaria: "#D64541", plano: "profissional", ativo: true, configuracoes: { idioma: "pt-BR", moeda: "BRL", fusoHorario: "America/Fortaleza", temaClaro: true, gamificacaoAtiva: true, iaAtiva: true, notificacoesAtivas: true, camposPersonalizados: [] } }),
  getFiliais: () => [], getUsuarios: () => [], getUsuarioByEmail: () => undefined,
  updateUsuario: () => {}, addUsuario: () => {}, deleteUsuario: () => {},
  getMetas: () => [], updateMeta: () => {}, addMeta: () => {}, deleteMeta: () => {},
};
export function subscribeStore(_cb: () => void) { return () => {}; }
export type MetaFuncionario = { [key: string]: any };
