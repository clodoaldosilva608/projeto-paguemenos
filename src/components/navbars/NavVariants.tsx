import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Target, Trophy, FileBarChart, ShoppingBag, Users2,
  Megaphone, Sparkles, Bot, Building2, ShieldCheck, Settings2, ClipboardList,
  Heart, HelpCircle, Award, FileText, BrainCircuit,
  Menu, X, Plus, Sun, Moon, LogOut, ChevronLeft, Scan, UserPlus, Home, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTema } from "@/contexts/ThemeContext";
import type { Perfil } from "@/types/core";
import type { Pagina } from "@/components/Sidebar";

interface Item {
  id: Pagina;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  perfilMinimo: Perfil;
  destaque?: boolean;
}

const H: Record<Perfil, number> = { admin: 0, gerente: 1, supervisor: 2, farmaceutica: 3, vendedor: 4 };

// Mesma lista do OrionNavBar clássico — garante paridade total
const TODOS_ITENS: Item[] = [
  { id: "dashboard", label: "Início", Icon: LayoutDashboard, perfilMinimo: "vendedor", destaque: true },
  { id: "minhas-metas", label: "Metas", Icon: Target, perfilMinimo: "vendedor" },
  { id: "ranking", label: "Resultados", Icon: Trophy, perfilMinimo: "vendedor" },
  { id: "relatorio-vendas", label: "Vendas", Icon: ShoppingBag, perfilMinimo: "vendedor" },
  { id: "relatorios", label: "Relatórios", Icon: FileBarChart, perfilMinimo: "vendedor" },
  { id: "funcionarios", label: "Funcionários", Icon: Users2, perfilMinimo: "supervisor" },
  { id: "campanhas", label: "Campanhas", Icon: Megaphone, perfilMinimo: "vendedor" },
  { id: "gamificacao", label: "Gamificação", Icon: Sparkles, perfilMinimo: "supervisor" },
  { id: "ia", label: "IA", Icon: Bot, perfilMinimo: "gerente" },
  { id: "equipes", label: "Equipes", Icon: Users2, perfilMinimo: "gerente" },
  { id: "filiais", label: "Filiais", Icon: Building2, perfilMinimo: "gerente" },
  { id: "usuarios", label: "Admin", Icon: ShieldCheck, perfilMinimo: "admin" },
  { id: "ia-config", label: "Config IA", Icon: BrainCircuit, perfilMinimo: "admin" },
  { id: "configuracoes", label: "Ajustes", Icon: Settings2, perfilMinimo: "gerente" },
  { id: "auditoria", label: "Auditoria", Icon: ClipboardList, perfilMinimo: "admin" },
  { id: "dashboard-funcionario", label: "Dashboard Func", Icon: Heart, perfilMinimo: "vendedor" },
  { id: "curriculo", label: "Currículo", Icon: Award, perfilMinimo: "vendedor" },
  { id: "documentos", label: "Documentos", Icon: FileText, perfilMinimo: "vendedor" },
  { id: "tour", label: "Tour", Icon: HelpCircle, perfilMinimo: "vendedor" },
];

function usePermitidos(): Item[] {
  const { usuario } = useAuth();
  if (!usuario) return [];
  const nivel = H[usuario.perfil];
  return TODOS_ITENS.filter((it) => nivel <= H[it.perfilMinimo]);
}

interface Props {
  paginaAtual: Pagina;
  onNavegar: (p: Pagina) => void;
}

// ====================================================================
// DRAWER COMPLETO compartilhado por TODOS os variants
// Mesmo padrão do OrionNavBar clássico: grid 3-4 colunas com TODOS os itens
// + botões Modo escuro/claro + Sair
// ====================================================================
function DrawerCompleto({
  aberto, onClose, paginaAtual, onNavegar,
}: {
  aberto: boolean;
  onClose: () => void;
  paginaAtual: Pagina;
  onNavegar: (p: Pagina) => void;
}) {
  const { usuario, logout } = useAuth();
  const { tema, alternar } = useTema();
  const permitidos = usePermitidos();

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
          onClick={onClose}
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
                  {usuario?.iniciais || "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{usuario?.nome}</p>
                  <p className="text-[11px] text-slate-500">{usuario?.email}</p>
                </div>
              </div>
              <button
                aria-label="Fechar"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {permitidos.map((it) => {
                const ativo = paginaAtual === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      onNavegar(it.id);
                      onClose();
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
                onClick={() => void logout()}
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
  );
}

// Hook compartilhado para abrir drawer
function useDrawer() {
  const [drawerAberto, setDrawerAberto] = useState(false);
  return { drawerAberto, abrirDrawer: () => setDrawerAberto(true), fecharDrawer: () => setDrawerAberto(false) };
}

// ====================================================================
// OPÇÃO 1 — Bottom Navigation Flutuante (cápsula + botão Menu)
// ====================================================================
export function NavBottomFlutuante({ paginaAtual, onNavegar }: Props) {
  const { drawerAberto, abrirDrawer, fecharDrawer } = useDrawer();
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 4);

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/80 px-2 py-2 shadow-2xl backdrop-blur-xl"
          style={{ boxShadow: "0 10px 40px -10px rgba(59, 130, 246, 0.5)" }}
        >
          {principais.map((it) => (
            <NavBtn key={it.id} it={it} ativo={it.id === paginaAtual} onClick={() => onNavegar(it.id)} />
          ))}

          {/* Botão Menu (☰) — abre drawer completo */}
          <button
            onClick={abrirDrawer}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40"
            aria-label="Ver todas as páginas"
            title="Ver todas as páginas"
          >
            <Menu className="h-5 w-5" />
          </button>
        </motion.nav>
      </div>
      <DrawerCompleto aberto={drawerAberto} onClose={fecharDrawer} paginaAtual={paginaAtual} onNavegar={onNavegar} />
    </>
  );
}

function NavBtn({ it, ativo, onClick }: { it: Item; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-2 transition ${
        ativo ? "bg-blue-600 text-white shadow-md" : "text-slate-400 dark:text-slate-500 hover:text-white"
      }`}
      title={it.label}
      aria-label={it.label}
    >
      <it.Icon className="h-5 w-5" />
    </button>
  );
}

// ====================================================================
// OPÇÃO 2 — FAB Inteligente (botão flutuante + drawer)
// ====================================================================
export function NavFABInteligente({ paginaAtual, onNavegar }: Props) {
  const { drawerAberto, abrirDrawer, fecharDrawer } = useDrawer();
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 4);
  const ativo = permitidos.find((it) => it.id === paginaAtual) || permitidos[0];

  return (
    <>
      {/* Barra horizontal com 4 itens + botão Menu */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-slate-900">
          {principais.map((it) => {
            const ativoBtn = it.id === paginaAtual;
            return (
              <button
                key={it.id}
                onClick={() => onNavegar(it.id)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition ${
                  ativoBtn ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
                title={it.label}
                aria-label={it.label}
              >
                <it.Icon className="h-5 w-5" />
                <span className="text-[9px] font-semibold uppercase">{it.label}</span>
              </button>
            );
          })}
          <button
            onClick={abrirDrawer}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-600/40"
            aria-label="Ver todas as páginas"
            title="Ver todas as páginas"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </div>
      <DrawerCompleto aberto={drawerAberto} onClose={fecharDrawer} paginaAtual={paginaAtual} onNavegar={onNavegar} />
    </>
  );
}

// ====================================================================
// OPÇÃO 3 — Navigation Dinâmica por Perfil + botão Menu
// ====================================================================
export function NavPerfilDinamico({ paginaAtual, onNavegar }: Props) {
  const { drawerAberto, abrirDrawer, fecharDrawer } = useDrawer();
  const { usuario } = useAuth();
  const permitidos = usePermitidos();

  // Cada perfil vê itens diferentes na barra principal, mas TODOS no drawer
  const itensPorPerfil: Record<Perfil, Pagina[]> = {
    vendedor: ["dashboard", "minhas-metas", "relatorio-vendas", "curriculo"],
    farmaceutica: ["dashboard", "minhas-metas", "relatorio-vendas", "curriculo"],
    supervisor: ["dashboard", "funcionarios", "ranking", "gamificacao"],
    gerente: ["dashboard", "ranking", "equipes", "ia"],
    admin: ["dashboard", "ranking", "ia", "usuarios"],
  };

  const itensPerfil = itensPorPerfil[usuario?.perfil || "vendedor"]
    .map((id) => permitidos.find((it) => it.id === id))
    .filter(Boolean) as Item[];

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-slate-900">
          {itensPerfil.map((it) => {
            const ativo = it.id === paginaAtual;
            return (
              <button
                key={it.id}
                onClick={() => onNavegar(it.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  ativo ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
                title={it.label}
                aria-label={it.label}
              >
                <it.Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{it.label}</span>
              </button>
            );
          })}
          {/* Botão Menu para acessar TODAS as páginas */}
          <button
            onClick={abrirDrawer}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200"
            aria-label="Ver todas as páginas"
            title="Ver todas as páginas"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </div>
      <DrawerCompleto aberto={drawerAberto} onClose={fecharDrawer} paginaAtual={paginaAtual} onNavegar={onNavegar} />
    </>
  );
}

// ====================================================================
// OPÇÃO 4 — Dock Animado (estilo macOS com magnify) + botão Menu
// ====================================================================
export function NavDockAnimado({ paginaAtual, onNavegar }: Props) {
  const { drawerAberto, abrirDrawer, fecharDrawer } = useDrawer();
  const permitidos = usePermitidos();
  const itens = permitidos.slice(0, 6);
  const [mouseX, setMouseX] = useState<number | null>(null);

  function getScale(idx: number) {
    if (mouseX === null) return 1;
    const center = idx * 56 + 28;
    const dist = Math.abs(mouseX - center);
    return Math.max(1, 1.5 - dist / 100);
  }

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
        <motion.nav
          onMouseMove={(e) => setMouseX(e.nativeEvent.offsetX)}
          onMouseLeave={() => setMouseX(null)}
          className="flex items-end gap-2 rounded-2xl border border-white/30 bg-white/40 px-3 py-2 shadow-2xl backdrop-blur-2xl dark:bg-slate-900/40"
          style={{ boxShadow: "0 20px 50px -10px rgba(0,0,0,0.3)" }}
        >
          {itens.map((it, i) => {
            const scale = getScale(i);
            const ativo = it.id === paginaAtual;
            return (
              <motion.button
                key={it.id}
                animate={{ scale }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => onNavegar(it.id)}
                className={`relative flex flex-col items-center justify-end rounded-xl p-1.5 transition ${
                  ativo ? "bg-blue-500/20" : "hover:bg-white/20"
                }`}
                title={it.label}
                aria-label={it.label}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-md transition ${
                    ativo
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                      : "bg-white text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  <it.Icon className="h-5 w-5" />
                </div>
                {ativo && (
                  <motion.div
                    layoutId="dock-indicator"
                    className="mt-1 h-1 w-1 rounded-full bg-blue-600"
                  />
                )}
              </motion.button>
            );
          })}
          {/* Botão Menu no dock */}
          <motion.button
            animate={{ scale: 1 }}
            onClick={abrirDrawer}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-white shadow-md hover:bg-slate-700"
            aria-label="Ver todas as páginas"
            title="Ver todas as páginas"
          >
            <Menu className="h-5 w-5" />
          </motion.button>
        </motion.nav>
      </div>
      <DrawerCompleto aberto={drawerAberto} onClose={fecharDrawer} paginaAtual={paginaAtual} onNavegar={onNavegar} />
    </>
  );
}

// ====================================================================
// OPÇÃO 5 — Navigation Morphing (barra horizontal + drawer)
// Nota: mantemos barra fixa (4 itens + Menu) e usamos DrawerCompleto
// em vez do grid interno, para garantir paridade total com o clássico.
// ====================================================================
export function NavMorphing({ paginaAtual, onNavegar }: Props) {
  const { drawerAberto, abrirDrawer, fecharDrawer } = useDrawer();
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 4);

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="flex h-16 items-center gap-1 rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-900"
        >
          {principais.map((it) => {
            const ativo = it.id === paginaAtual;
            return (
              <button
                key={it.id}
                onClick={() => onNavegar(it.id)}
                className={`flex h-12 flex-1 items-center justify-center rounded-xl transition ${
                  ativo ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
                title={it.label}
                aria-label={it.label}
              >
                <it.Icon className="h-5 w-5" />
              </button>
            );
          })}
          <button
            onClick={abrirDrawer}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200"
            aria-label="Ver todas as páginas"
            title="Ver todas as páginas"
          >
            <Menu className="h-5 w-5" />
          </button>
        </motion.nav>
      </div>
      <DrawerCompleto aberto={drawerAberto} onClose={fecharDrawer} paginaAtual={paginaAtual} onNavegar={onNavegar} />
    </>
  );
}

// ====================================================================
// OPÇÃO 6 — Quick Actions por Contexto + botão Menu
// ====================================================================
export function NavQuickActions({ paginaAtual, onNavegar }: Props) {
  const { drawerAberto, abrirDrawer, fecharDrawer } = useDrawer();
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 4);

  // Ação contextual baseada na página atual
  const acaoContexto: Record<string, { label: string; Icon: any; onClick: () => void }> = {
    "minhas-metas": { label: "Adicionar Meta", Icon: Plus, onClick: () => onNavegar("minhas-metas") },
    "relatorio-vendas": { label: "Lançar Venda", Icon: Plus, onClick: () => onNavegar("dashboard") },
    "funcionarios": { label: "Novo Funcionário", Icon: UserPlus, onClick: () => onNavegar("funcionarios") },
    "dashboard-funcionario": { label: "Checklist", Icon: ClipboardList, onClick: () => onNavegar("dashboard-funcionario") },
  };

  const acao = acaoContexto[paginaAtual] || {
    label: "Início",
    Icon: Home,
    onClick: () => onNavegar("dashboard"),
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-slate-900">
          {principais.map((it) => {
            const ativo = it.id === paginaAtual;
            return (
              <button
                key={it.id}
                onClick={() => onNavegar(it.id)}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition ${
                  ativo ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                }`}
                title={it.label}
                aria-label={it.label}
              >
                <it.Icon className="h-5 w-5" />
                <span className="text-[9px] font-semibold uppercase">{it.label}</span>
              </button>
            );
          })}

          {/* Botão de ação contextual */}
          <motion.button
            key={acao.label}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={acao.onClick}
            className="ml-1 flex h-12 items-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 px-3 text-xs font-bold uppercase text-white shadow-lg shadow-emerald-500/30"
            aria-label={acao.label}
            title={acao.label}
          >
            <acao.Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{acao.label}</span>
          </motion.button>

          {/* Botão Menu */}
          <button
            onClick={abrirDrawer}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200"
            aria-label="Ver todas as páginas"
            title="Ver todas as páginas"
          >
            <Menu className="h-5 w-5" />
          </button>
        </nav>
      </div>
      <DrawerCompleto aberto={drawerAberto} onClose={fecharDrawer} paginaAtual={paginaAtual} onNavegar={onNavegar} />
    </>
  );
}

// ====================================================================
// OPÇÃO 7 — Dashboard Inteligente (navbar se oculta ao rolar) + botão Menu
// ====================================================================
export function NavInteligente({ paginaAtual, onNavegar }: Props) {
  const [visivel, setVisivel] = useState(true);
  const { drawerAberto, abrirDrawer, fecharDrawer } = useDrawer();
  const lastScrollY = useRef(0);
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 5);

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 100) {
        setVisivel(false);
      } else {
        setVisivel(true);
      }
      lastScrollY.current = currentY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <AnimatePresence>
        {visivel && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <nav className="flex items-center gap-1 rounded-2xl border border-white/20 bg-slate-900/90 px-2 py-2 shadow-2xl backdrop-blur-xl">
              {principais.map((it) => {
                const ativo = it.id === paginaAtual;
                return (
                  <button
                    key={it.id}
                    onClick={() => onNavegar(it.id)}
                    className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition ${
                      ativo ? "bg-blue-600 text-white shadow-md" : "text-slate-400 dark:text-slate-500 hover:text-white"
                    }`}
                    title={it.label}
                    aria-label={it.label}
                  >
                    <it.Icon className="h-5 w-5" />
                    <span className="text-[9px] font-semibold uppercase">{it.label}</span>
                  </button>
                );
              })}
              {/* Botão Menu */}
              <button
                onClick={abrirDrawer}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"
                aria-label="Ver todas as páginas"
                title="Ver todas as páginas"
              >
                <Menu className="h-5 w-5" />
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
      <DrawerCompleto aberto={drawerAberto} onClose={fecharDrawer} paginaAtual={paginaAtual} onNavegar={onNavegar} />
    </>
  );
}
