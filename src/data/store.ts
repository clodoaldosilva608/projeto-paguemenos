import type { Perfil, Permissao, Usuario } from "../types/core";

/**
 * Módulos do sistema. Cada módulo tem um nível mínimo de acesso para leitura
 * (controlado pelo Sidebar/NavBar) e um nível mínimo para escrita (CRUD)
 * controlado por gerarPermissoes() abaixo.
 *
 * Item 5 auditoria 30/07/2026:
 *   Antes, gerente tinha criar/editar/excluir em TODOS os módulos (igual admin),
 *   incluindo `usuarios` e `auditoria` — contradiz o requisito de "gerente
 *   gerencia apenas sua equipe". Agora:
 *     - admin: CRUD em tudo
 *     - gerente: CRUD apenas nos módulos operacionais da própria equipe
 *               (metas, indicadores, vendas, campanhas, gamificacao)
 *               READ-ONLY em usuarios, auditoria, configuracoes, ia, equipes,
 *               filiais (a RLS do banco já bloqueava, mas a UI mostrava botões
 *               de editar/excluir que sempre falhavam)
 *     - supervisor: CRUD em gamificacao, treinamentos; READ-ONLY no resto
 *     - vendedor/farmacêutica: apenas leitura, exceto suas próprias vendas
 *                              (que são controladas por RLS, não por aqui)
 */
export const MODULOS_OPERACIONAIS_GERENTE = new Set([
  "metas",
  "indicadores",
  "relatorio-vendas", // vendas da equipe
  "campanhas",
  "gamificacao",
]);

export const MODULOS_ESCRITA_SUPERVISOR = new Set([
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

  return modulos.map((modulo) => {
    // Por padrão, todos podem ler e exportar
    const ler = true;
    const exportar = perfil === "admin" || perfil === "gerente" || perfil === "supervisor";

    // CRUD: apenas admin tem em tudo; gerente só em operacionais; supervisor só em alguns; vendedor nunca
    let criar = false;
    let editar = false;
    let excluir = false;

    if (isAdmin) {
      criar = true;
      editar = true;
      excluir = true;
    } else if (perfil === "gerente") {
      // Gerente: CRUD apenas em módulos operacionais da equipe
      // NÃO tem CRUD em: usuarios, auditoria, configuracoes, ia, equipes, filiais
      // (RLS bloqueia user_roles/audit_log de qualquer forma; aqui escondemos os botões)
      if (MODULOS_OPERACIONAIS_GERENTE.has(modulo)) {
        criar = true;
        editar = true;
        excluir = true;
      }
    } else if (perfil === "supervisor") {
      // Supervisor: CRUD limitado a gamificação/treinamentos/vendas
      if (MODULOS_ESCRITA_SUPERVISOR.has(modulo)) {
        criar = true;
        editar = true;
        // supervisor não exclui — apenas gerente/admin
      }
    }
    // vendedor e farmacêutica: apenas leitura (suas próprias vendas são controladas por RLS)

    return { modulo, ler, criar, editar, excluir, exportar };
  });
}

/**
 * Helper para verificar se um perfil pode fazer CRUD em um módulo.
 * Páginas devem usar este helper para mostrar/ocultar botões de criar/editar/excluir.
 *
 * Exemplo:
 *   const { temPermissao } = useAuth();
 *   {temPermissao("usuarios", "criar") && <BotaoCriar />}
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
