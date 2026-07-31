import type { Perfil, Permissao, Usuario } from "../types/core";

/**
 * Modelo: Gerente tem acesso TOTAL (igual admin) a todas as funcionalidades.
 * Reversão do item 5 da auditoria — solicitado pelo usuário em 31/07/2026.
 *
 * Hierarquia:
 *   - admin/gerente: CRUD em tudo (incluindo usuarios, auditoria, ia, configuracoes)
 *   - supervisor: CRUD em módulos operacionais, leitura nos demais
 *   - vendedor/farmacêutica: apenas leitura (suas próprias vendas são controladas por RLS)
 */
export const MODULOS_OPERACIONAIS_SUPERVISOR = new Set([
  "gamificacao",
  "treinamentos",
  "relatorio-vendas",
]);

export function gerarPermissoes(perfil: Perfil): Permissao[] {
  const modulos = [
    "dashboard",
    "metas",
    "indicadores",
    "campanhas",
    "equipes",
    "filiais",
    "usuarios",
    "ranking",
    "gamificacao",
    "relatorios",
    "notificacoes",
    "auditoria",
    "configuracoes",
    "ia",
  ];

  const isAdmin = perfil === "admin";
  const isGerente = perfil === "admin" || perfil === "gerente";

  return modulos.map((modulo) => {
    const ler = true;
    const exportar = isGerente || perfil === "supervisor";

    let criar = false;
    let editar = false;
    let excluir = false;

    if (isGerente) {
      // Gerente tem CRUD total (igual admin) — solicitado pelo usuário
      criar = true;
      editar = true;
      excluir = true;
    } else if (perfil === "supervisor") {
      if (MODULOS_OPERACIONAIS_SUPERVISOR.has(modulo)) {
        criar = true;
        editar = true;
      }
    }

    return { modulo, ler, criar, editar, excluir, exportar };
  });
}

/**
 * Helper para verificar se um perfil pode fazer CRUD em um módulo.
 */
export function podeGerenciar(perfil: Perfil, modulo: string, acao: "criar" | "editar" | "excluir"): boolean {
  const perm = gerarPermissoes(perfil).find((p) => p.modulo === modulo);
  return perm ? Boolean(perm[acao]) : false;
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
