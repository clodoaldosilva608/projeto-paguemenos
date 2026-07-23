import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Target, Trophy, FileBarChart, ShoppingBag, Users2,
  Megaphone, Sparkles, Bot, Building2, ShieldCheck, Settings2, ClipboardList,
  Heart, X, ChevronLeft, ChevronRight,
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
  { id: "campanhas", label: "Campanhas", Icon: Megaphone, perfilMinimo: "vendedor" },
  { id: "gamificacao", label: "Gamificação", Icon: Sparkles, perfilMinimo: "supervisor" },
  { id: "ia", label: "IA", Icon: Bot, perfilMinimo: "gerente" },
  { id: "equipes", label: "Equipes", Icon: Users2, perfilMinimo: "gerente" },
  { id: "filiais", label: "Filiais", Icon: Building2, perfilMinimo: "gerente" },
  { id: "usuarios", label: "Admin", Icon: ShieldCheck, perfilMinimo: "admin" },
  { id: "ia-config", label: "Config IA", Icon: Bot, perfilMinimo: "admin" },
  { id: "configuracoes", label: "Ajustes", Icon: Settings2, perfilMinimo: "gerente" },
  { id: "auditoria", label: "Auditoria", Icon: ClipboardList, perfilMinimo: "admin" },
  { id: "dashboard-funcionario", label: "Dashboard Func", Icon: Heart, perfilMinimo: "vendedor" },
];

interface Props {
  paginaAtual: Pagina;
  onNavegar: (p: Pagina) => void;
}

/**
 * PillNavBar 💊 — navegação flutuante em formato de pílula retrátil.
 *
 * Visual: cápsula com duas metades (azul Pague Menos + vermelho Coração).
 * Comportamento:
 *   - Estado recolhido: pílula pequena com ícone do item ativo + indicador 💊
 *   - Hover/touch: expande horizontalmente revelando os 5 itens principais
 *   - Botão "mais": abre grid completo com TODOS os itens disponíveis
 *   - Botão ativo: cor de fundo da metade correspondente da pílula
 */
export default function PillNavBar({ paginaAtual, onNavegar }: Props) {
  const { usuario } = useAuth();
  const [expandido, setExpandido] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  if (!usuario) return null;

  const nivel = H[usuario.perfil];
  const permitidos = ITEMS.filter((it) => nivel <= H[it.perfilMinimo]);
  const principais = permitidos.slice(0, 5);
  const extras = permitidos.slice(5);

  const ativo = permitidos.find((it) => it.id === paginaAtual) || principais[0];
  const isAtivoCard1 = principais.indexOf(ativo) >= 0 && principais.indexOf(ativo) < 3; // metade azul
  const isAtivoCard2 = principais.indexOf(ativo) >= 3; // metade vermelha

  return (
    <>
      {/* Overlay quando o grid completo está aberto */}
      <AnimatePresence>
        {mostrarTodos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMostrarTodos(false)}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Grid completo (modal) */}
      <AnimatePresence>
        {mostrarTodos && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-32 left-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Todas as páginas · {usuario.perfil}
              </h3>
              <button
                onClick={() => setMostrarTodos(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {permitidos.map((it) => {
                const sel = it.id === paginaAtual;
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      onNavegar(it.id);
                      setMostrarTodos(false);
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition ${
                      sel
                        ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                    }`}
                  >
                    <it.Icon className={`h-5 w-5 ${sel ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`} />
                    <span className={`text-[10px] font-semibold ${sel ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}>
                      {it.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== PÍLULA PRINCIPAL 💊 ====== */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <motion.div
          onHoverStart={() => setExpandido(true)}
          onHoverEnd={() => setExpandido(false)}
          onTouchStart={(e) => {
            e.preventDefault();
            setExpandido((v) => !v);
          }}
          animate={{
            width: expandido ? "min(560px, calc(100vw - 2rem))" : "200px",
          }}
          transition={{ type: "spring", damping: 24, stiffness: 280 }}
          className="relative flex h-16 items-center overflow-hidden rounded-full shadow-2xl"
          style={{
            background:
              "linear-gradient(90deg, #1B4F8C 0%, #1B4F8C 50%, #D64541 50%, #D64541 100%)",
            boxShadow:
              "0 10px 30px -8px rgba(27, 79, 140, 0.5), 0 8px 20px -6px rgba(214, 69, 65, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
          }}
        >
          {/* Brilho superior (efeito cápsula gelatinosa) */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 100%)",
            }}
          />

          {/* Linha central (selo da cápsula) */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/30" />

          {/* Selo "💊" no estado recolhido */}
          <AnimatePresence>
            {!expandido && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={() => setExpandido(true)}
                className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-white"
              >
                <ativo.Icon className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">{ativo.label}</span>
                <motion.span
                  animate={{ rotate: [0, 8, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-base"
                >
                  💊
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Itens visíveis quando expandido */}
          <AnimatePresence>
            {expandido && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex w-full items-center justify-between gap-1 px-3"
              >
                {/* Metade azul (3 itens à esquerda) */}
                <div className="flex items-center gap-1">
                  {principais.slice(0, 3).map((it) => {
                    const sel = it.id === paginaAtual;
                    return (
                      <motion.button
                        key={it.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * principais.indexOf(it) }}
                        onClick={() => onNavegar(it.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                          sel
                            ? "bg-white text-[#1B4F8C] shadow-md"
                            : "text-white/90 hover:bg-white/15"
                        }`}
                      >
                        <it.Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{it.label}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Botão central — menu completo ("><") */}
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  onClick={() => setMostrarTodos(true)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg hover:scale-105"
                  title="Ver todas as páginas"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.button>

                {/* Metade vermelha (2 itens à direita) */}
                <div className="flex items-center gap-1">
                  {principais.slice(3, 5).map((it, idx) => {
                    const sel = it.id === paginaAtual;
                    return (
                      <motion.button
                        key={it.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * (idx + 3) }}
                        onClick={() => onNavegar(it.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
                          sel
                            ? "bg-white text-[#D64541] shadow-md"
                            : "text-white/90 hover:bg-white/15"
                        }`}
                      >
                        <it.Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{it.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Botão retrair (setinha abaixo da pílula quando expandida) */}
        <AnimatePresence>
          {expandido && (
            <motion.button
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              onClick={() => setExpandido(false)}
              className="mx-auto mt-1.5 flex h-6 w-12 items-center justify-center rounded-full bg-slate-800/80 text-white backdrop-blur dark:bg-slate-700/80"
              title="Recolher"
            >
              <ChevronLeft className="h-3 w-3 rotate-90" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
