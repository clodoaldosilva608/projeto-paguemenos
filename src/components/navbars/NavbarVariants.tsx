import { motion } from "framer-motion";
import {
  LayoutDashboard, Target, Trophy, FileBarChart, ShoppingBag, Users2,
  Megaphone, Sparkles, Bot, Building2, ShieldCheck, Settings2, ClipboardList,
  Menu,
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

const ITEMS: Item[] = [
  { id: "dashboard", label: "Início", Icon: LayoutDashboard, perfilMinimo: "vendedor" },
  { id: "minhas-metas", label: "Metas", Icon: Target, perfilMinimo: "vendedor" },
  { id: "ranking", label: "Ranking", Icon: Trophy, perfilMinimo: "vendedor" },
  { id: "relatorio-vendas", label: "Vendas", Icon: ShoppingBag, perfilMinimo: "vendedor" },
  { id: "relatorios", label: "Relatórios", Icon: FileBarChart, perfilMinimo: "vendedor" },
  { id: "funcionarios", label: "Funcionários", Icon: Users2, perfilMinimo: "supervisor" },
  { id: "campanhas", label: "Campanhas", Icon: Megaphone, perfilMinimo: "supervisor" },
  { id: "gamificacao", label: "Gamificação", Icon: Sparkles, perfilMinimo: "supervisor" },
  { id: "ia", label: "IA", Icon: Bot, perfilMinimo: "gerente" },
  { id: "equipes", label: "Equipes", Icon: Users2, perfilMinimo: "gerente" },
  { id: "filiais", label: "Filiais", Icon: Building2, perfilMinimo: "gerente" },
  { id: "usuarios", label: "Admin", Icon: ShieldCheck, perfilMinimo: "admin" },
  { id: "configuracoes", label: "Ajustes", Icon: Settings2, perfilMinimo: "gerente" },
  { id: "auditoria", label: "Auditoria", Icon: ClipboardList, perfilMinimo: "admin" },
];

function usePermitidos(): Item[] {
  const { usuario } = useAuth();
  if (!usuario) return [];
  const nivel = H[usuario.perfil];
  return ITEMS.filter((it) => nivel <= H[it.perfilMinimo]);
}

interface Props { paginaAtual: Pagina; onNavegar: (p: Pagina) => void; onAbrirMenu?: () => void; }

// ---------- 1) Bottom Dock (iOS) ----------
export function NavbarBottomDock({ paginaAtual, onNavegar, onAbrirMenu }: Props) {
  const perm = usePermitidos();
  const principais = perm.slice(0, 4);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 sm:bottom-6">
      <motion.nav
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="pointer-events-auto flex items-center gap-1 rounded-3xl border border-white/20 bg-white/70 px-3 py-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70"
      >
        {principais.map((it) => {
          const ativo = paginaAtual === it.id;
          return (
            <button key={it.id} onClick={() => onNavegar(it.id)} aria-label={it.label}
              className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl transition ${ativo ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"}`}>
              <it.Icon className="h-6 w-6" />
              <span className="mt-0.5 text-[9px] font-semibold">{it.label}</span>
            </button>
          );
        })}
        <button onClick={onAbrirMenu} aria-label="Mais" className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10">
          <Menu className="h-6 w-6" />
          <span className="mt-0.5 text-[9px] font-semibold">Mais</span>
        </button>
      </motion.nav>
    </div>
  );
}

// ---------- 2) Sidebar flutuante (desktop) / bottom compact (mobile) ----------
export function NavbarSidebarFloat({ paginaAtual, onNavegar, onAbrirMenu }: Props) {
  const perm = usePermitidos();
  const principais = perm.slice(0, 6);
  return (
    <>
      {/* Desktop lateral */}
      <div className="pointer-events-none fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:block">
        <motion.nav initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          className="pointer-events-auto flex flex-col gap-1 rounded-full border border-white/10 bg-slate-950/85 p-2 shadow-2xl backdrop-blur-xl">
          {principais.map((it) => {
            const ativo = paginaAtual === it.id;
            return (
              <button key={it.id} onClick={() => onNavegar(it.id)} aria-label={it.label}
                title={it.label}
                className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition ${ativo ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/40" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}>
                <it.Icon className="h-5 w-5" />
                <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">{it.label}</span>
              </button>
            );
          })}
          <button onClick={onAbrirMenu} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white">
            <Menu className="h-5 w-5" />
          </button>
        </motion.nav>
      </div>
      {/* Mobile bottom compact */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 md:hidden">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/90 px-2 py-2 shadow-2xl backdrop-blur-xl">
          {principais.slice(0, 5).map((it) => {
            const ativo = paginaAtual === it.id;
            return (
              <button key={it.id} onClick={() => onNavegar(it.id)} aria-label={it.label}
                className={`flex h-10 w-10 items-center justify-center rounded-full ${ativo ? "bg-blue-500/20 text-blue-300" : "text-slate-400"}`}>
                <it.Icon className="h-5 w-5" />
              </button>
            );
          })}
          <button onClick={onAbrirMenu} aria-label="Mais" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
    </>
  );
}

// ---------- 3) Top minimal com underline animado ----------
export function NavbarTopMinimal({ paginaAtual, onNavegar, onAbrirMenu }: Props) {
  const perm = usePermitidos();
  const principais = perm.slice(0, 7);
  return (
    <div className="sticky top-0 z-40 -mx-4 mb-4 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 sm:-mx-8 sm:px-8">
      <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto py-2" aria-label="Navegação principal">
        {principais.map((it) => {
          const ativo = paginaAtual === it.id;
          return (
            <button key={it.id} onClick={() => onNavegar(it.id)}
              className={`relative flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold transition ${ativo ? "text-blue-600 dark:text-blue-400" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}>
              <it.Icon className="h-4 w-4" />
              {it.label}
              {ativo && <motion.span layoutId="orion-underline" className="absolute inset-x-2 -bottom-2 h-0.5 rounded-full bg-blue-600" />}
            </button>
          );
        })}
        <button onClick={onAbrirMenu} className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
          <Menu className="h-4 w-4" /> Mais
        </button>
      </nav>
    </div>
  );
}
