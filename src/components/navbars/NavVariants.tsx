import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Target, Trophy, ShoppingBag, FileBarChart, Users2,
  Megaphone, Sparkles, Bot, Building2, ShieldCheck, Settings2, ClipboardList,
  Heart, HelpCircle, Award, FileText, BrainCircuit, Menu, X, Plus, Bell,
  ChevronUp, Scan, Package, UserPlus, TrendingUp, Home,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Perfil } from "@/types/core";
import type { Pagina } from "@/components/Sidebar";

interface Item {
  id: Pagina;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  perfilMinimo: Perfil;
}

const H: Record<Perfil, number> = { admin: 0, gerente: 1, supervisor: 2, vendedor: 3 };

const TODOS_ITENS: Item[] = [
  { id: "dashboard", label: "Início", Icon: Home, perfilMinimo: "vendedor" },
  { id: "minhas-metas", label: "Metas", Icon: Target, perfilMinimo: "vendedor" },
  { id: "ranking", label: "Indicadores", Icon: TrendingUp, perfilMinimo: "vendedor" },
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
// OPÇÃO 1 — Bottom Navigation Flutuante (cápsula + menu radial)
// ====================================================================
export function NavBottomFlutuante({ paginaAtual, onNavegar }: Props) {
  const [expandido, setExpandido] = useState(false);
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 4);
  const atalhos = permitidos.slice(4, 12);
  const ativo = permitidos.find((it) => it.id === paginaAtual) || principais[0];

  return (
    <>
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandido(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Menu radial expandido */}
      <AnimatePresence>
        {expandido && (
          <div className="fixed bottom-32 left-1/2 z-50 -translate-x-1/2">
            <div className="grid grid-cols-4 gap-2 rounded-3xl border border-white/15 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
              {atalhos.map((it, i) => (
                <motion.button
                  key={it.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => { onNavegar(it.id); setExpandido(false); }}
                  className="flex flex-col items-center gap-1 rounded-xl p-2.5 text-slate-300 hover:bg-white/10 hover:text-white"
                  title={it.label}
                >
                  <it.Icon className="h-5 w-5" />
                  <span className="text-[9px] font-semibold uppercase tracking-wider">{it.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Cápsula principal */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/80 px-2 py-2 shadow-2xl backdrop-blur-xl"
          style={{ boxShadow: "0 10px 40px -10px rgba(59, 130, 246, 0.5)" }}
        >
          {principais.slice(0, 2).map((it) => (
            <NavBtn key={it.id} it={it} ativo={it.id === paginaAtual} onClick={() => onNavegar(it.id)} />
          ))}

          {/* Botão central expandível */}
          <motion.button
            onClick={() => setExpandido(!expandido)}
            whileTap={{ scale: 0.9 }}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40"
            aria-label="Expandir menu"
          >
            <AnimatePresence mode="wait">
              {expandido ? (
                <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                  <Plus className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {principais.slice(2, 4).map((it) => (
            <NavBtn key={it.id} it={it} ativo={it.id === paginaAtual} onClick={() => onNavegar(it.id)} />
          ))}
        </motion.nav>
      </div>
    </>
  );
}

function NavBtn({ it, ativo, onClick }: { it: Item; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-2 transition ${
        ativo ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
      }`}
      title={it.label}
      aria-label={it.label}
    >
      <it.Icon className="h-5 w-5" />
    </button>
  );
}

// ====================================================================
// OPÇÃO 2 — FAB Inteligente (menu circular por perfil)
// ====================================================================
export function NavFABInteligente({ paginaAtual, onNavegar }: Props) {
  const [aberto, setAberto] = useState(false);
  const permitidos = usePermitidos();
  const itens = permitidos.slice(0, 8);
  const ativo = permitidos.find((it) => it.id === paginaAtual) || permitidos[0];

  return (
    <>
      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Menu circular */}
      <AnimatePresence>
        {aberto && (
          <div className="fixed bottom-28 right-6 z-50">
            {itens.map((it, i) => {
              const angle = (i / itens.length) * Math.PI - Math.PI / 2;
              const radius = 110;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <motion.button
                  key={it.id}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{ x, y, opacity: 1, scale: 1 }}
                  exit={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 20 }}
                  onClick={() => { onNavegar(it.id); setAberto(false); }}
                  className={`absolute flex h-12 w-12 items-center justify-center rounded-full shadow-lg ${
                    it.id === paginaAtual
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                  style={{ right: 0, bottom: 0 }}
                  title={it.label}
                  aria-label={it.label}
                >
                  <it.Icon className="h-5 w-5" />
                  <span className="absolute -top-7 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase text-white opacity-0 transition group-hover:opacity-100">
                    {it.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* FAB principal */}
      <div className="fixed bottom-24 right-6 z-40">
        <motion.button
          onClick={() => setAberto(!aberto)}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: aberto ? 45 : 0 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/40"
          aria-label={aberto ? "Fechar menu" : "Abrir menu de navegação"}
        >
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
          {aberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </motion.button>
        {/* Indicador da página atual */}
        {!aberto && (
          <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            <ativo.Icon className="h-3 w-3" />
          </div>
        )}
      </div>
    </>
  );
}

// ====================================================================
// OPÇÃO 3 — Navigation Dinâmica por Perfil
// ====================================================================
export function NavPerfilDinamico({ paginaAtual, onNavegar }: Props) {
  const { usuario } = useAuth();
  const permitidos = usePermitidos();

  // Cada perfil vê itens diferentes
  const itensPorPerfil: Record<Perfil, Pagina[]> = {
    vendedor: ["dashboard", "minhas-metas", "relatorio-vendas", "curriculo", "dashboard-funcionario"],
    supervisor: ["dashboard", "funcionarios", "ranking", "gamificacao", "curriculo"],
    gerente: ["dashboard", "ranking", "equipes", "ia", "configuracoes"],
    admin: ["dashboard", "ranking", "ia", "usuarios", "configuracoes"],
  };

  const itensPerfil = itensPorPerfil[usuario?.perfil || "vendedor"]
    .map((id) => permitidos.find((it) => it.id === id))
    .filter(Boolean) as Item[];

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-slate-900">
        {itensPerfil.map((it) => {
          const ativo = it.id === paginaAtual;
          return (
            <button
              key={it.id}
              onClick={() => onNavegar(it.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                ativo
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
              title={it.label}
              aria-label={it.label}
            >
              <it.Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{it.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ====================================================================
// OPÇÃO 4 — Dock Animado (estilo macOS com magnify)
// ====================================================================
export function NavDockAnimado({ paginaAtual, onNavegar }: Props) {
  const permitidos = usePermitidos();
  const itens = permitidos.slice(0, 8);
  const [mouseX, setMouseX] = useState<number | null>(null);

  function getScale(idx: number) {
    if (mouseX === null) return 1;
    const center = idx * 60 + 30;
    const dist = Math.abs(mouseX - center);
    return Math.max(1, 1.6 - dist / 100);
  }

  return (
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
      </motion.nav>
    </div>
  );
}

// ====================================================================
// OPÇÃO 5 — Navigation Morphing (barra se transforma)
// ====================================================================
export function NavMorphing({ paginaAtual, onNavegar }: Props) {
  const [expandido, setExpandido] = useState(false);
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 4);
  const todos = permitidos.slice(0, 10);

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <motion.nav
        animate={{
          width: expandido ? 320 : 280,
          height: expandido ? 380 : 64,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-slate-900"
      >
        {!expandido ? (
          // Estado recolhido: barra horizontal com 4 ícones + botão Menu
          <div className="flex h-full items-center gap-1">
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
              onClick={() => setExpandido(true)}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200"
              aria-label="Expandir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        ) : (
          // Estado expandido: lista vertical
          <div className="flex h-full flex-col">
            <div className="mb-2 flex items-center justify-between px-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Todas as páginas</h3>
              <button
                onClick={() => setExpandido(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                aria-label="Recolher menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-1 overflow-auto">
              {todos.map((it) => {
                const ativo = it.id === paginaAtual;
                return (
                  <button
                    key={it.id}
                    onClick={() => { onNavegar(it.id); setExpandido(false); }}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      ativo ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                    }`}
                  >
                    <it.Icon className="h-4 w-4" />
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.nav>
    </div>
  );
}

// ====================================================================
// OPÇÃO 6 — Quick Actions por Contexto (botão central muda)
// ====================================================================
export function NavQuickActions({ paginaAtual, onNavegar }: Props) {
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 4);

  // Ação contextual baseada na página atual
  const acaoContexto: Record<string, { label: string; Icon: any; onClick: () => void }> = {
    "minhas-metas": {
      label: "Adicionar Meta",
      Icon: Plus,
      onClick: () => onNavegar("minhas-metas"),
    },
    "relatorio-vendas": {
      label: "Lançar Venda",
      Icon: Plus,
      onClick: () => onNavegar("dashboard"),
    },
    "funcionarios": {
      label: "Novo Funcionário",
      Icon: UserPlus,
      onClick: () => onNavegar("funcionarios"),
    },
    "dashboard-funcionario": {
      label: "Checklist",
      Icon: ClipboardList,
      onClick: () => onNavegar("dashboard-funcionario"),
    },
  };

  const acao = acaoContexto[paginaAtual] || {
    label: "Início",
    Icon: Home,
    onClick: () => onNavegar("dashboard"),
  };

  return (
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
      </nav>
    </div>
  );
}

// ====================================================================
// OPÇÃO 7 — Dashboard Inteligente (navbar se oculta ao rolar)
// ====================================================================
export function NavInteligente({ paginaAtual, onNavegar }: Props) {
  const [visivel, setVisivel] = useState(true);
  const lastScrollY = useRef(0);
  const permitidos = usePermitidos();
  const principais = permitidos.slice(0, 5);

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 100) {
        // Rolando para baixo: esconder
        setVisivel(false);
      } else {
        // Rolando para cima: mostrar
        setVisivel(true);
      }
      lastScrollY.current = currentY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
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
                    ativo ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                  title={it.label}
                  aria-label={it.label}
                >
                  <it.Icon className="h-5 w-5" />
                  <span className="text-[9px] font-semibold uppercase">{it.label}</span>
                </button>
              );
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
