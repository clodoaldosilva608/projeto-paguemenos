import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useTema } from "../contexts/ThemeContext";
import type { Perfil } from "../types/core";
import type { Pagina } from "./Sidebar";
import {
  LayoutDashboard,
  Target,
  Trophy,
  FileBarChart,
  ShoppingBag,
  Users2,
  Megaphone,
  Sparkles,
  Bot,
  Building2,
  ShieldCheck,
  Settings2,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Heart,
  HelpCircle,
  Award,
  FileText,
  BrainCircuit,
  KeyRound,
  BarChart3,
  Layout,
} from "lucide-react";

interface Item {
  id: Pagina;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  perfilMinimo: Perfil; // leitura/navegação — quem vê o item
  perfilMinimoEscrita: Perfil; // CRUD — quem vê botões criar/editar/excluir dentro da página
  destaque?: boolean;
}

const H: Record<Perfil, number> = { admin: 0, gerente: 1, supervisor: 2, farmaceutica: 3, vendedor: 4 };

// ITEM 5 AUDITORIA 30/07/2026:
// perfilMinimo:       controla quem VÊ o item no menu (leitura)
// perfilMinimoEscrita: controla quem pode CRUD dentro da página
//   - usuarios, auditoria, configuracoes, ia, equipes, filiais: apenas admin pode CRUD
//     (gerente VÊ no menu, mas não vê botões de criar/editar/excluir — a RLS bloquearia de qualquer forma)
//   - relatorio-vendas, campanhas, gamificacao: gerente+admin (CRUD operacional)
//   - dashboard, ranking, relatorios, tour: leitura para todos, sem CRUD
//
// Páginas devem usar useAuth().temPermissao(modulo, "criar"|"editar"|"excluir") para
// mostrar/ocultar botões de ação. O helper gerarPermissoes() em src/data/store.ts
// já reflete esta mesma matriz de permissões.
const ITEMS: Item[] = [
  {
    id: "dashboard",
    label: "Início",
    Icon: LayoutDashboard,
    perfilMinimo: "vendedor",
    perfilMinimoEscrita: "admin",
    destaque: true,
  },
  { id: "minhas-metas", label: "Metas", Icon: Target, perfilMinimo: "vendedor", perfilMinimoEscrita: "admin" },
  { id: "ranking", label: "Resultados", Icon: Trophy, perfilMinimo: "vendedor", perfilMinimoEscrita: "admin" },
  { id: "relatorio-vendas", label: "Vendas", Icon: ShoppingBag, perfilMinimo: "vendedor", perfilMinimoEscrita: "gerente" },
  { id: "relatorios", label: "Relatórios", Icon: FileBarChart, perfilMinimo: "vendedor", perfilMinimoEscrita: "admin" },
  { id: "funcionarios", label: "Funcionários", Icon: Users2, perfilMinimo: "supervisor", perfilMinimoEscrita: "admin" },
  { id: "campanhas", label: "Campanhas", Icon: Megaphone, perfilMinimo: "vendedor", perfilMinimoEscrita: "gerente" },
  { id: "gamificacao", label: "Gamificação", Icon: Sparkles, perfilMinimo: "supervisor", perfilMinimoEscrita: "gerente" },
  { id: "ia", label: "IA", Icon: Bot, perfilMinimo: "gerente", perfilMinimoEscrita: "admin" },
  { id: "equipes", label: "Equipes", Icon: Users2, perfilMinimo: "gerente", perfilMinimoEscrita: "admin" },
  { id: "filiais", label: "Filiais", Icon: Building2, perfilMinimo: "gerente", perfilMinimoEscrita: "admin" },
  { id: "usuarios", label: "Credenciais", Icon: KeyRound, perfilMinimo: "supervisor", perfilMinimoEscrita: "admin" },
  { id: "ia-config", label: "Config IA", Icon: BrainCircuit, perfilMinimo: "gerente", perfilMinimoEscrita: "admin" },
  { id: "kanban", label: "Kanban", Icon: Layout, perfilMinimo: "vendedor", perfilMinimoEscrita: "vendedor" },
  { id: "configuracoes", label: "Ajustes", Icon: Settings2, perfilMinimo: "gerente", perfilMinimoEscrita: "admin" },
  { id: "auditoria", label: "Auditoria", Icon: ClipboardList, perfilMinimo: "gerente", perfilMinimoEscrita: "admin" },
  { id: "dashboard-funcionario", label: "Dashboard Func", Icon: Heart, perfilMinimo: "vendedor", perfilMinimoEscrita: "vendedor" },
  { id: "curriculo", label: "Currículo", Icon: Award, perfilMinimo: "vendedor", perfilMinimoEscrita: "vendedor" },
  { id: "documentos", label: "Documentos", Icon: FileText, perfilMinimo: "vendedor", perfilMinimoEscrita: "vendedor" },
  { id: "tour", label: "Tour", Icon: HelpCircle, perfilMinimo: "vendedor", perfilMinimoEscrita: "admin" },
  { id: "planilha-interna", label: "Planilha", Icon: BarChart3, perfilMinimo: "vendedor", perfilMinimoEscrita: "admin" },
];

interface Props {
  paginaAtual: Pagina;
  onNavegar: (p: Pagina) => void;
}

export default function OrionNavBar({ paginaAtual, onNavegar }: Props) {
  const { usuario, logout } = useAuth();
  const { tema, alternar } = useTema();
  const [drawer, setDrawer] = useState(false);
  if (!usuario) return null;

  const nivel = H[usuario.perfil];
  const permitidos = ITEMS.filter((it) => nivel <= H[it.perfilMinimo]);

  // Layout guidão: até 5 itens principais visíveis; o ícone central "Início" tem destaque flutuante
  const principais = permitidos.slice(0, 5);
  const restantes = permitidos.slice(5);

  const central = principais.find((p) => p.destaque) || principais[0];
  const laterais = principais.filter((p) => p.id !== central.id);
  const esquerda = laterais.slice(0, 2);
  const direita = laterais.slice(2, 4);

  return (
    <>
      {/* Barra flutuante (guidão / pílula) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:bottom-6">
        <motion.nav
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="pointer-events-auto relative flex items-end gap-1 rounded-full border border-white/10 bg-slate-950/90 px-2 py-2 shadow-2xl backdrop-blur-xl sm:gap-2 sm:px-3"
        >
          {esquerda.map((it) => (
            <BotaoNav
              key={it.id}
              item={it}
              ativo={paginaAtual === it.id}
              onClick={() => onNavegar(it.id)}
            />
          ))}

          {/* Ícone central destacado (Início) */}
          <button
            onClick={() => onNavegar(central.id)}
            className="group relative -mt-8 mx-1 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-600/40 ring-4 ring-slate-950 transition hover:scale-105"
            aria-label={central.label}
          >
            <central.Icon className="h-7 w-7" />
            <span className="pointer-events-none absolute -bottom-6 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-blue-300">
              {central.label}
            </span>
          </button>

          {direita.map((it) => (
            <BotaoNav
              key={it.id}
              item={it}
              ativo={paginaAtual === it.id}
              onClick={() => onNavegar(it.id)}
            />
          ))}

          {/* Menu completo */}
          <button
            onClick={() => setDrawer(true)}
            className="ml-1 flex h-11 w-11 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition hover:bg-white/10 hover:text-white"
            aria-label="Mais"
          >
            <Menu className="h-5 w-5" />
          </button>
        </motion.nav>
      </div>

      {/* Drawer completo */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
            onClick={() => setDrawer(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                    {usuario.iniciais}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{usuario.nome}</p>
                    <p className="text-[11px] text-slate-500">{usuario.email}</p>
                  </div>
                </div>
                <button
                  aria-label="Fechar"
                  onClick={() => setDrawer(false)}
                  className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {permitidos
                  .concat(restantes)
                  .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
                  .map((it) => {
                    const ativo = paginaAtual === it.id;
                    return (
                      <button
                        key={it.id}
                        onClick={() => {
                          onNavegar(it.id);
                          setDrawer(false);
                        }}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition ${
                          ativo
                            ? "border-blue-500/60 bg-blue-500/10 text-blue-300"
                            : "border-white/5 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <it.Icon className="h-5 w-5" />
                        <span className="text-[11px] font-medium">{it.label}</span>
                      </button>
                    );
                  })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
                <button
                  onClick={alternar}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  {tema === "claro" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {tema === "claro" ? "Modo escuro" : "Modo claro"}
                </button>
                <button
                  onClick={() => {
                    void logout();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BotaoNav({ item, ativo, onClick }: { item: Item; ativo: boolean; onClick: () => void }) {
  const { Icon, label } = item;
  return (
    <button
      onClick={onClick}
      className={`group flex h-11 min-w-[52px] flex-col items-center justify-center rounded-full px-2 transition sm:min-w-[64px] sm:px-3 ${
        ativo ? "bg-blue-500/15 text-blue-300" : "text-slate-400 dark:text-slate-500 hover:bg-white/5 hover:text-white"
      }`}
      aria-label={label}
    >
      <Icon className={`h-5 w-5 ${ativo ? "text-blue-300" : ""}`} />
      <span className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-wider sm:block">
        {label}
      </span>
    </button>
  );
}
