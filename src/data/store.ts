// =============================================================
// ORION · DATA STORE REATIVO (localStorage + listeners)
// =============================================================

import type { Empresa, Filial, Equipe, Usuario, Permissao, Perfil } from "../types/core";

export interface MetaFuncionario {
  id: string;
  usuarioId: string;
  titulo: string;
  descricao: string;
  categoria: string;
  valorMeta: number;
  valorAtual: number;
  unidade: string;
  dataInicio: string;
  dataFim: string;
  status: "pendente" | "em_andamento" | "concluida" | "atrasada";
  criadoEm: string;
  atualizadoEm: string;
}

const STORAGE_KEYS = {
  empresas: "orion-empresas",
  filiais: "orion-filiais",
  equipes: "orion-equipes",
  usuarios: "orion-usuarios",
  metasFuncionario: "orion-metas-funcionario",
} as const;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeStore(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const hasLS = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

function carregar<T>(key: string, fallback: T): T {
  if (!hasLS) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function salvar<T>(key: string, data: T) {
  if (!hasLS) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* noop */
  }
}


export function gerarPermissoes(perfil: Perfil): Permissao[] {
  const modulos = [
    "dashboard", "metas", "indicadores", "campanhas", "equipes",
    "usuarios", "filiais", "empresas", "ranking", "gamificacao",
    "relatorios", "notificacoes", "auditoria", "configuracoes", "ia",
  ];
  return modulos.map((m) => {
    const base = { modulo: m, ler: true, criar: false, editar: false, excluir: false, exportar: false };
    switch (perfil) {
      case "admin":
        return { ...base, ler: true, criar: true, editar: true, excluir: true, exportar: true };
      case "gerente":
        return { ...base, ler: true, criar: true, editar: true, excluir: false, exportar: true };
      case "supervisor":
        return {
          ...base,
          ler: true,
          criar: ["metas", "campanhas", "notificacoes", "equipes"].includes(m),
          editar: ["metas", "equipes"].includes(m),
          exportar: ["relatorios", "metas"].includes(m),
        };
      case "vendedor":
        return {
          ...base,
          ler: !["empresas", "auditoria", "configuracoes", "usuarios", "filiais"].includes(m),
          exportar: m === "relatorios",
        };
    }
  });
}

function mkUsuario(
  id: string,
  nome: string,
  email: string,
  perfil: Perfil,
  senha: string,
  empresaId: string,
  filialId?: string,
  equipeId?: string
): Usuario {
  return {
    id,
    nome,
    email,
    iniciais: nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    perfil,
    ativo: true,
    empresaId,
    filialId,
    equipeId,
    permissoes: gerarPermissoes(perfil),
    criadoEm: "2026-01-01",
    senha,
    metodoLogin: "email",
  };
}

const empresaPadrao: Empresa = {
  id: "e-demo",
  nome: "Pague Menos",
  cnpj: "06.626.253/0001-51",
  corPrimaria: "#0a3d8a",
  corSecundaria: "#e30613",
  plano: "enterprise",
  ativo: true,
  configuracoes: {
    idioma: "pt-BR",
    moeda: "BRL",
    fusoHorario: "America/Fortaleza",
    temaClaro: true,
    gamificacaoAtiva: true,
    iaAtiva: true,
    notificacoesAtivas: true,
    camposPersonalizados: [],
  },
};

const filialPadrao: Filial = {
  id: "f-7537",
  empresaId: "e-demo",
  codigo: 7537,
  nome: "Filial 7537",
  cidade: "Fortaleza",
  estado: "CE",
  ativo: true,
};

const equipePadrao: Equipe = {
  id: "eq-1",
  filialId: "f-7537",
  nome: "Equipe Zênite",
  supervisorId: "u-supervisor",
  membros: ["u-elielton", "u-adelino", "u-mieko", "u-fabio", "u-alicia", "u-clodoaldo"],
  ativo: true,
};

function initUsuarios(): Usuario[] {
  return [
    mkUsuario("u-admin", "Administrador Orion", "admin@orion.com", "admin", "admin123", "e-demo"),
    mkUsuario("u-gerente", "Carlos Mendes", "gerente@orion.com", "gerente", "gerente123", "e-demo", "f-7537"),
    mkUsuario("u-supervisor", "Ana Costa", "supervisor@orion.com", "supervisor", "super123", "e-demo", "f-7537", "eq-1"),
    mkUsuario("u-vendedor", "Elielton Silva", "vendedor@orion.com", "vendedor", "vendedor123", "e-demo", "f-7537", "eq-1"),
    mkUsuario("u-elielton", "Elielton Silva", "elieiton@orion.com", "vendedor", "elieiton123", "e-demo", "f-7537", "eq-1"),
    mkUsuario("u-adelino", "Adelino Santos", "adelino@orion.com", "vendedor", "adelino123", "e-demo", "f-7537", "eq-1"),
    mkUsuario("u-mieko", "Mieko Tanaka", "mieko@orion.com", "vendedor", "mieko123", "e-demo", "f-7537", "eq-1"),
    mkUsuario("u-fabio", "Fábio Oliveira", "fabio@orion.com", "vendedor", "fabio123", "e-demo", "f-7537", "eq-1"),
    mkUsuario("u-alicia", "Alícia Ferreira", "alicia@orion.com", "vendedor", "alicia123", "e-demo", "f-7537", "eq-1"),
    mkUsuario("u-clodoaldo", "Clodoaldo Lima", "clodoaldo@orion.com", "vendedor", "clodoaldo123", "e-demo", "f-7537", "eq-1"),
  ];
}

const metasIniciais: MetaFuncionario[] = [
  { id: "mf-1", usuarioId: "u-vendedor", titulo: "Faturamento Julho", descricao: "Meta mensal de faturamento", categoria: "Vendas", valorMeta: 155292.03, valorAtual: 63082, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
  { id: "mf-2", usuarioId: "u-vendedor", titulo: "Genéricos + Similares", descricao: "Vendas de genéricos", categoria: "Genéricos", valorMeta: 32696.34, valorAtual: 11442, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
  { id: "mf-3", usuarioId: "u-elielton", titulo: "Faturamento Julho", descricao: "Meta mensal de faturamento", categoria: "Vendas", valorMeta: 155292.03, valorAtual: 63082, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
  { id: "mf-4", usuarioId: "u-fabio", titulo: "Faturamento Julho", descricao: "Meta mensal de faturamento", categoria: "Vendas", valorMeta: 178483.18, valorAtual: 74410, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
  { id: "mf-5", usuarioId: "u-alicia", titulo: "Faturamento Julho", descricao: "Meta mensal de faturamento", categoria: "Vendas", valorMeta: 114613.03, valorAtual: 54642, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
  { id: "mf-6", usuarioId: "u-adelino", titulo: "Faturamento Julho", descricao: "Meta mensal de faturamento", categoria: "Vendas", valorMeta: 150661.04, valorAtual: 54119, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
  { id: "mf-7", usuarioId: "u-mieko", titulo: "Faturamento Julho", descricao: "Meta mensal de faturamento", categoria: "Vendas", valorMeta: 127215.6, valorAtual: 34203, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
  { id: "mf-8", usuarioId: "u-clodoaldo", titulo: "Faturamento Julho", descricao: "Meta mensal de faturamento", categoria: "Vendas", valorMeta: 24855.66, valorAtual: 11135, unidade: "R$", dataInicio: "2026-07-01", dataFim: "2026-07-31", status: "em_andamento", criadoEm: "2026-07-01", atualizadoEm: "2026-07-12" },
];

export interface DataStore {
  getEmpresa(): Empresa | null;
  setEmpresa(e: Empresa): void;
  getFiliais(): Filial[];
  setFiliais(f: Filial[]): void;
  getEquipes(): Equipe[];
  setEquipes(e: Equipe[]): void;
  getUsuarios(): Usuario[];
  addUsuario(u: Usuario): void;
  updateUsuario(u: Usuario): void;
  deleteUsuario(id: string): void;
  getUsuarioByEmail(email: string): Usuario | undefined;
  getUsuarioById(id: string): Usuario | undefined;
  getMetas(usuarioId?: string): MetaFuncionario[];
  addMeta(m: Omit<MetaFuncionario, "id" | "criadoEm" | "atualizadoEm"> & Partial<Pick<MetaFuncionario, "id" | "criadoEm" | "atualizadoEm">>): MetaFuncionario;
  updateMeta(m: MetaFuncionario): void;
  deleteMeta(id: string): void;
  getUsuariosByFilial(filialId: string): Usuario[];
  getUsuariosByEquipe(equipeId: string): Usuario[];
  resetarDados(): void;
}

function createDataStore(): DataStore {
  let empresas = carregar<Empresa[]>(STORAGE_KEYS.empresas, [empresaPadrao]);
  let filiais = carregar<Filial[]>(STORAGE_KEYS.filiais, [filialPadrao]);
  let equipes = carregar<Equipe[]>(STORAGE_KEYS.equipes, [equipePadrao]);
  let usuarios = carregar<Usuario[]>(STORAGE_KEYS.usuarios, initUsuarios());
  let metas = carregar<MetaFuncionario[]>(STORAGE_KEYS.metasFuncionario, metasIniciais);

  // Garante usuários demo essenciais
  const essential = initUsuarios();
  essential.forEach((eu) => {
    if (!usuarios.find((u) => u.email.toLowerCase() === eu.email.toLowerCase())) {
      usuarios.push(eu);
    }
  });
  salvar(STORAGE_KEYS.usuarios, usuarios);

  const persist = () => {
    salvar(STORAGE_KEYS.empresas, empresas);
    salvar(STORAGE_KEYS.filiais, filiais);
    salvar(STORAGE_KEYS.equipes, equipes);
    salvar(STORAGE_KEYS.usuarios, usuarios);
    salvar(STORAGE_KEYS.metasFuncionario, metas);
    notify();
  };

  return {
    getEmpresa: () => empresas[0] || null,
    setEmpresa: (e) => {
      empresas = [e];
      persist();
    },
    getFiliais: () => [...filiais],
    setFiliais: (f) => {
      filiais = f;
      persist();
    },
    getEquipes: () => [...equipes],
    setEquipes: (e) => {
      equipes = e;
      persist();
    },
    getUsuarios: () => [...usuarios],
    addUsuario: (u) => {
      usuarios = [...usuarios, u];
      persist();
    },
    updateUsuario: (u) => {
      usuarios = usuarios.map((x) => (x.id === u.id ? u : x));
      persist();
    },
    deleteUsuario: (id) => {
      usuarios = usuarios.filter((x) => x.id !== id);
      metas = metas.filter((m) => m.usuarioId !== id);
      persist();
    },
    getUsuarioByEmail: (email) =>
      usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase()),
    getUsuarioById: (id) => usuarios.find((u) => u.id === id),
    getMetas: (usuarioId) =>
      usuarioId ? metas.filter((m) => m.usuarioId === usuarioId) : [...metas],
    addMeta: (m) => {
      const now = new Date().toISOString();
      const nova: MetaFuncionario = {
        ...m,
        id: m.id || `mf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        criadoEm: m.criadoEm || now,
        atualizadoEm: now,
      };
      metas = [...metas, nova];
      persist();
      return nova;
    },
    updateMeta: (m) => {
      metas = metas.map((x) =>
        x.id === m.id ? { ...m, atualizadoEm: new Date().toISOString() } : x
      );
      persist();
    },
    deleteMeta: (id) => {
      metas = metas.filter((x) => x.id !== id);
      persist();
    },
    getUsuariosByFilial: (filialId) =>
      usuarios.filter((u) => u.filialId === filialId && u.ativo),
    getUsuariosByEquipe: (equipeId) =>
      usuarios.filter((u) => u.equipeId === equipeId && u.ativo),
    resetarDados: () => {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
      empresas = [empresaPadrao];
      filiais = [filialPadrao];
      equipes = [equipePadrao];
      usuarios = initUsuarios();
      metas = metasIniciais;
      persist();
    },
  };
}

export const store = createDataStore();
