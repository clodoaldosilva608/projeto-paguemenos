import { cn } from "../utils/cn";
import { useAuth } from "../contexts/AuthContext";
import { useTema } from "../contexts/ThemeContext";
import type { Perfil } from "../types/core";

export type Pagina =
  | "dashboard"
  | "metas"
  | "minhas-metas"
  | "ranking"
  | "relatorios"
  | "relatorio-vendas"
  | "colaboradores"
  | "funcionarios"
  | "campanhas"
  | "gamificacao"
  | "equipes"
  | "filiais"
  | "usuarios"
  | "configuracoes"
  | "auditoria"
  | "ia"
  | "ia-config"
  | "tour"
  | "dashboard-funcionario"
  | "curriculo"
  | "documentos";

interface ItemNav {
  id: Pagina;
  label: string;
  icone: string;
  perfilMinimo: Perfil;
  badge?: string;
  separador?: boolean;
}

// Quanto menor o nível, mais permissões (admin = 0)
const H: Record<Perfil, number> = { admin: 0, gerente: 1, supervisor: 2, vendedor: 3 };

const ITENS: ItemNav[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icone:
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    perfilMinimo: "vendedor",
  },
  {
    id: "minhas-metas",
    label: "Minhas Metas",
    icone: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    perfilMinimo: "vendedor",
  },
  {
    id: "ranking",
    label: "Resultados",
    icone:
      "M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-6 0H5a2 2 0 01-2-2V5a2 2 0 012-2h9l5 5v9a2 2 0 01-2 2h-2",
    perfilMinimo: "vendedor",
  },
  {
    id: "relatorios",
    label: "Relatórios",
    icone:
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    perfilMinimo: "vendedor",
  },
  {
    id: "relatorio-vendas",
    label: "Vendas Diárias",
    icone:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    perfilMinimo: "vendedor",
  },
  {
    id: "funcionarios",
    label: "Meus Funcionários",
    icone:
      "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z",
    perfilMinimo: "supervisor",
    separador: true,
  },
  {
    id: "campanhas",
    label: "Campanhas",
    icone:
      "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
    perfilMinimo: "vendedor",
  },
  {
    id: "gamificacao",
    label: "Gamificação",
    icone:
      "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    perfilMinimo: "supervisor",
  },
  {
    id: "ia",
    label: "Assistente IA",
    icone:
      "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-1.4 5.084a2.25 2.25 0 01-2.171 1.666H7.771a2.25 2.25 0 01-2.171-1.666L4.2 14.5m15.6 0h-15.6",
    perfilMinimo: "gerente",
    badge: "Beta",
  },
  {
    id: "equipes",
    label: "Equipes",
    icone:
      "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    perfilMinimo: "gerente",
    separador: true,
  },
  {
    id: "filiais",
    label: "Filiais",
    icone:
      "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    perfilMinimo: "gerente",
  },
  {
    id: "usuarios",
    label: "Usuários",
    icone:
      "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    perfilMinimo: "admin",
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icone:
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    perfilMinimo: "gerente",
    separador: true,
  },
  {
    id: "curriculo",
    label: "Meu Currículo",
    icone: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    perfilMinimo: "vendedor",
  },
  {
    id: "dashboard-funcionario",
    label: "Dashboard Funcionário",
    icone:
      "M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-6 0H5a2 2 0 01-2-2V5a2 2 0 012-2h9l5 5v9a2 2 0 01-2 2h-2",
    perfilMinimo: "vendedor",
  },
  {
    id: "documentos",
    label: "Documentos",
    icone:
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    perfilMinimo: "vendedor",
  },
  {
    id: "tour",
    label: "Tour Guiado",
    icone:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.548-.547m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    perfilMinimo: "vendedor",
    separador: true,
  },
  {
    id: "auditoria",
    label: "Auditoria",
    icone:
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    perfilMinimo: "admin",
  },
  {
    id: "ia-config",
    label: "Configuração da IA",
    icone:
      "M12 2a4 4 0 014 4v1h1a4 4 0 014 4v1h-2v-1a2 2 0 00-2-2h-3V6a2 2 0 00-4 0v1H6a2 2 0 00-2 2v1H2V8a4 4 0 014-4h1V6a2 2 0 004 0V4a4 4 0 014-4z M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2v-9a2 2 0 012-2h10a2 2 0 012 2v9a2 2 0 01-2 2z",
    perfilMinimo: "admin",
  },
];

function Icone({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] flex-shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

interface SidebarProps {
  paginaAtual: Pagina;
  onNavegar: (p: Pagina) => void;
  aberto: boolean;
  onFechar: () => void;
}

export default function Sidebar({ paginaAtual, onNavegar, aberto, onFechar }: SidebarProps) {
  const { usuario, logout } = useAuth();
  const { tema, alternar } = useTema();
  if (!usuario) return null;

  const nivelUsuario = H[usuario.perfil];
  // admin(0) vê item com min gerente(1): 0 <= 1 ✓
  // vendedor(3) vê item com min gerente(1): 3 <= 1 ✗
  const itensFiltrados = ITENS.filter((it) => nivelUsuario <= H[it.perfilMinimo]);
  const perfilLabel: Record<Perfil, string> = {
    admin: "Administrador",
    gerente: "Gerente",
    supervisor: "Supervisor",
    vendedor: "Vendedor",
  };

  return (
    <>
      {aberto && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={onFechar} />}
      <aside
        className={cn(
          "fixed z-40 flex h-full w-[260px] flex-col bg-slate-950 text-white transition-transform duration-300 lg:static lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={1.5}
              className="h-5 w-5"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9"
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400 ring-2 ring-slate-950" />
          </div>
          <div>
            <h1 className="font-display text-lg leading-none text-white">ORION</h1>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-blue-400">
              {perfilLabel[usuario.perfil]}
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-0.5">
            {itensFiltrados.map((item) => {
              const ativo = paginaAtual === item.id;
              return (
                <div key={item.id}>
                  {item.separador && (
                    <div className="mb-2 mt-4 border-t border-white/[0.06] pt-2" />
                  )}
                  <button
                    onClick={() => {
                      onNavegar(item.id);
                      onFechar();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-all",
                      ativo
                        ? "bg-blue-500/15 text-blue-400 shadow-sm shadow-blue-500/5"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <span className={cn(ativo ? "text-blue-400" : "text-slate-500")}>
                      <Icone d={item.icone} />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-400">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </nav>
        <div className="mx-3 mb-3">
          <button
            onClick={alternar}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
          >
            <span>{tema === "claro" ? "" : ""}</span>
            <span>{tema === "claro" ? "Modo Escuro" : "Modo Claro"}</span>
          </button>
        </div>
        <div className="border-t border-white/[0.06] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
              {usuario.iniciais}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{usuario.nome}</p>
              <p className="truncate text-[11px] text-slate-500">{usuario.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
