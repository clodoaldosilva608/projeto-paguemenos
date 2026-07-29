import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  LogIn,
  Tv,
  ChevronDown,
  BarChart3,
  DollarSign,
  Bot,
  TrendingUp,
  ClipboardList,
  ShieldCheck,
  X,
  RefreshCw,
  Wifi,
  Activity,
  Target,
  Trophy,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brlMoeda, pct as fmtPct } from "@/utils/format";
import IAAssistantFAB from "./IAAssistantFAB";

// ============================================================================
// ESTILOS / ANIMAÇÕES (Aurora, Grid Mesh, Glow Pulse, Spotlight)
// ============================================================================

const LANDING_STYLES = `
@keyframes orion-aurora {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.orion-aurora-bg {
  background: linear-gradient(135deg, #0a192f 0%, #0d2847 25%, #1a3a6c 50%, #0d2847 75%, #0a192f 100%);
  background-size: 400% 400%;
  animation: orion-aurora 15s ease infinite;
}

.orion-grid-mesh {
  background-image:
    radial-gradient(circle at 1px 1px, rgba(66, 165, 245, 0.18) 1px, transparent 0);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
}

@keyframes orion-glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(21, 101, 192, 0.55), 0 0 24px 4px rgba(66, 165, 245, 0.45); }
  50%      { box-shadow: 0 0 0 6px rgba(21, 101, 192, 0.0),  0 0 36px 10px rgba(66, 165, 245, 0.7); }
}
.orion-glow-pulse {
  animation: orion-glow-pulse 2.4s ease-in-out infinite;
}

.orion-spotlight-text {
  background: linear-gradient(90deg, #94A3B8 0%, #FFFFFF 25%, #42A5F5 50%, #FFFFFF 75%, #94A3B8 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: orion-spotlight-pan 8s linear infinite;
}
@keyframes orion-spotlight-pan {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.orion-scroll-indicator {
  animation: orion-bounce 2s ease-in-out infinite;
}
@keyframes orion-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50%      { transform: translateY(8px); opacity: 1; }
}

@keyframes orion-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}
.orion-live-dot {
  animation: orion-blink 1.6s ease-in-out infinite;
}

.orion-tv-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.orion-tv-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
.orion-tv-scroll::-webkit-scrollbar-thumb { background: rgba(66,165,245,0.35); border-radius: 9999px; }
`;

// ============================================================================
// CONSTANTES DE IDENTIDADE VISUAL
// ============================================================================

const COLORS = {
  bg: "#0a192f",
  blueOrion: "#1565C0",
  blueLight: "#42A5F5",
  green: "#2E7D32",
  orange: "#FB8C00",
  red: "#D32F2F",
  white: "#FFFFFF",
  textGray: "#94A3B8",
} as const;

// ============================================================================
// SUBCOMPONENTES VISUAIS
// ============================================================================

/** Grade de pontos (Grid Mesh) com máscara radial para efeito de profundidade. */
function GridMesh() {
  return <div className="pointer-events-none absolute inset-0 orion-grid-mesh" aria-hidden />;
}

/** Partículas flutuantes animadas com framer-motion. */
function FloatingParticles({ count = 26 }: { count?: number }) {
  // useMemo para que as posições aleatórias sejam fixas por mount
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // %
        y: Math.random() * 100, // %
        size: 1 + Math.random() * 2.6,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 8,
        opacity: 0.2 + Math.random() * 0.5,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: COLORS.blueLight,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 4}px ${COLORS.blueLight}`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, p.id % 2 === 0 ? 12 : -12, 0],
            opacity: [p.opacity, p.opacity * 1.6, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/** Spotlight que segue o cursor sobre o título — implementado com motion value. */
function SpotlightText({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const mx = useMotionValue(50); // % dentro do título
  const my = useMotionValue(50);
  const sx = useSpring(mx, { stiffness: 120, damping: 20 });
  const sy = useSpring(my, { stiffness: 120, damping: 20 });
  const bg = useTransform(
    [sx, sy],
    ([x, y]) =>
      `radial-gradient(circle at ${x}% ${y}%, rgba(66,165,245,0.95) 0%, rgba(255,255,255,0.9) 35%, rgba(148,163,184,0.7) 70%)`,
  );

  const onMove = (e: React.MouseEvent<HTMLHeadingElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mx.set(Math.max(0, Math.min(100, x)));
    my.set(Math.max(0, Math.min(100, y)));
  };

  return (
    <motion.h1
      ref={ref}
      onMouseMove={onMove}
      className="font-display text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl"
      style={{
        backgroundImage: bg,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {children}
    </motion.h1>
  );
}

/** Botão de scroll (Hero → Features). */
function ScrollIndicator({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Rolar para ver recursos"
      className="orion-scroll-indicator mx-auto flex flex-col items-center gap-1 text-slate-400 hover:text-white"
    >
      <span className="text-[11px] uppercase tracking-[0.25em]">Explorar</span>
      <ChevronDown className="h-5 w-5" />
    </button>
  );
}

// ============================================================================
// TV MODE — Painel de monitoramento em tempo real
// ============================================================================

interface VendedorTV {
  usuario_id: string;
  nome: string;
  iniciais: string | null;
  meta: number;
  realizado: number;
  projecao: number;
  categorias: Record<string, { meta: number; realizado: number }>;
}

interface ResumoLoja {
  metaTotal: number;
  realizadoTotal: number;
  projecaoTotal: number;
  vendedores: VendedorTV[];
}

/** Calcula o data_inicio do mês corrente (YYYY-MM-01) — usado no filtro Supabase. */
function mesAtualInicio(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}-01`;
}

function statusPct(p: number): { label: string; color: string; bg: string } {
  if (p >= 100) return { label: "Meta batida", color: COLORS.green, bg: "rgba(46,125,50,0.18)" };
  if (p >= 75) return { label: "No caminho", color: COLORS.blueLight, bg: "rgba(66,165,245,0.18)" };
  if (p >= 50) return { label: "Atenção", color: COLORS.orange, bg: "rgba(251,140,0,0.18)" };
  return { label: "Crítico", color: COLORS.red, bg: "rgba(211,47,47,0.18)" };
}

/** Busca metas_individuais (mensal) + profiles para o TV mode. */
async function carregarResumoLoja(): Promise<ResumoLoja> {
  const inicio = mesAtualInicio();
  const { data: metas, error } = await supabase
    .from("metas_individuais")
    .select("usuario_id, categoria, periodo, valor_meta, valor_realizado, valor_projecao")
    .eq("periodo", "mensal")
    .eq("data_inicio", inicio);

  if (error) throw new Error(error.message);
  const lista = metas ?? [];

  // Agrupa por usuario_id
  const porUsuario = new Map<string, VendedorTV>();
  for (const m of lista) {
    const uid = m.usuario_id as string;
    const meta = Number(m.valor_meta ?? 0);
    const realizado = Number(m.valor_realizado ?? 0);
    const projecao = Number(m.valor_projecao ?? 0);
    const categoria = (m.categoria as string) || "geral";

    if (!porUsuario.has(uid)) {
      porUsuario.set(uid, {
        usuario_id: uid,
        nome: uid,
        iniciais: null,
        meta: 0,
        realizado: 0,
        projecao: 0,
        categorias: {},
      });
    }
    const v = porUsuario.get(uid)!;
    v.meta += meta;
    v.realizado += realizado;
    v.projecao += projecao;
    v.categorias[categoria] = {
      meta: (v.categorias[categoria]?.meta ?? 0) + meta,
      realizado: (v.categorias[categoria]?.realizado ?? 0) + realizado,
    };
  }

  // Busca profiles para nomes
  const uids = Array.from(porUsuario.keys());
  let perfis: { id: string; nome: string; iniciais: string | null }[] = [];
  if (uids.length > 0) {
    const { data: profData, error: profErr } = await supabase
      .from("profiles")
      .select("id, nome, iniciais")
      .in("id", uids);
    if (profErr) {
      // Não abortar: TV mode pode continuar mostrando IDs
      console.warn("[TV] Falha ao buscar profiles:", profErr.message);
    } else {
      perfis = (profData ?? []) as { id: string; nome: string; iniciais: string | null }[];
    }
  }
  const perfMap = new Map(perfis.map((p) => [p.id, p]));
  for (const v of porUsuario.values()) {
    const p = perfMap.get(v.usuario_id);
    if (p) {
      v.nome = p.nome || v.usuario_id;
      v.iniciais = p.iniciais;
    }
  }

  const vendedores = Array.from(porUsuario.values()).sort((a, b) => b.realizado - a.realizado);
  const metaTotal = vendedores.reduce((s, v) => s + v.meta, 0);
  const realizadoTotal = vendedores.reduce((s, v) => s + v.realizado, 0);
  const projecaoTotal = vendedores.reduce((s, v) => s + v.projecao, 0);

  return { metaTotal, realizadoTotal, projecaoTotal, vendedores };
}

function KpiCardTV({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}22, 0 12px 32px -16px ${accent}88` }}
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl"
        style={{ background: `${accent}55` }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: `${accent}22`, color: accent }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
        </div>
      </div>
      <p className="font-num mt-4 text-3xl font-bold sm:text-4xl" style={{ color: COLORS.white }}>
        {value}
      </p>
    </motion.div>
  );
}

function BarraProgressoTV({
  pctValor,
  cor,
  altura = "h-3",
}: {
  pctValor: number;
  cor: string;
  altura?: string;
}) {
  const w = Math.max(0, Math.min(100, pctValor));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/10 ${altura}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: cor, boxShadow: `0 0 12px ${cor}aa` }}
        initial={{ width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function LinhaVendedorTV({ v, rank }: { v: VendedorTV; rank: number }) {
  const pctVal = v.meta > 0 ? (v.realizado / v.meta) * 100 : 0;
  const falta = Math.max(0, v.meta - v.realizado);
  const st = statusPct(pctVal);
  const iniciais = v.iniciais || v.nome.slice(0, 2).toUpperCase();
  const medalha = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
      className="border-b border-white/5 hover:bg-white/[0.03]"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="w-6 text-center text-base">{medalha ?? `#${rank + 1}`}</span>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: `${st.color}22`, color: st.color }}
          >
            {iniciais}
          </div>
          <span className="font-display text-base text-white sm:text-lg">{v.nome}</span>
        </div>
      </td>
      <td className="px-4 py-4 font-num text-base text-slate-300 sm:text-lg">
        {brlMoeda(v.meta, 0)}
      </td>
      <td className="px-4 py-4 font-num text-base font-semibold text-white sm:text-lg">
        {brlMoeda(v.realizado, 0)}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-40 sm:w-56">
            <BarraProgressoTV pctValor={pctVal} cor={st.color} />
          </div>
          <span
            className="font-num w-16 text-right text-base font-bold sm:text-lg"
            style={{ color: st.color }}
          >
            {fmtPct(pctVal, 1)}
          </span>
        </div>
      </td>
      <td className="hidden px-4 py-4 font-num text-base text-slate-400 sm:table-cell sm:text-lg">
        {brlMoeda(falta, 0)}
      </td>
      <td className="px-4 py-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ background: st.bg, color: st.color }}
        >
          {pctVal >= 100 ? <CheckCircle2 className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
          {st.label}
        </span>
      </td>
    </motion.tr>
  );
}

function TVModePanel({ onClose }: { onClose: () => void }) {
  const [resumo, setResumo] = useState<ResumoLoja | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(30);

  const buscar = useCallback(async (silencioso = false) => {
    if (silencioso) setAtualizando(true);
    else setLoading(true);
    setErro(null);
    try {
      const r = await carregarResumoLoja();
      setResumo(r);
      setUltimaAtualizacao(new Date());
      setSegundosRestantes(30);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg || "Falha ao carregar dados do painel.");
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    void buscar();
    // Auto refresh a cada 30s + contador regressivo a cada 1s
    const refresh = setInterval(() => void buscar(true), 30_000);
    const ticker = setInterval(() => {
      setSegundosRestantes((s) => (s <= 1 ? 30 : s - 1));
    }, 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(ticker);
    };
  }, [buscar]);

  const metaTotal = resumo?.metaTotal ?? 0;
  const realizadoTotal = resumo?.realizadoTotal ?? 0;
  const projecaoTotal = resumo?.projecaoTotal ?? 0;
  const faltaTotal = Math.max(0, metaTotal - realizadoTotal);
  const pctLoja = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0;
  const stLoja = statusPct(pctLoja);

  const hora = ultimaAtualizacao.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col overflow-y-auto orion-tv-scroll"
      style={{ background: "#06101f" }}
    >
      {/* Aurora sutil de fundo */}
      <div className="pointer-events-none absolute inset-0 orion-aurora-bg opacity-30" />
      <div className="pointer-events-none absolute inset-0 orion-grid-mesh opacity-40" />

      {/* HEADER */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/30 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: COLORS.blueOrion }}
          >
            <Tv className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide text-white sm:text-2xl">
              ORIONN · Monitoramento em Tempo Real
            </h2>
            <p className="text-xs text-slate-400">Painel TV · atualização automática a cada 30s</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
            <span className="orion-live-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              AO VIVO
            </span>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:flex">
            <Clock className="h-3.5 w-3.5" />
            <span>Próx. atualização em {segundosRestantes}s</span>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 md:flex">
            <Wifi className="h-3.5 w-3.5" />
            <span>Última: {hora}</span>
          </div>
          <button
            onClick={() => void buscar(true)}
            disabled={atualizando}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
            aria-label="Atualizar agora"
            title="Atualizar agora"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${atualizando ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-red-500/20 hover:text-red-300"
            aria-label="Fechar painel"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Fechar painel</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
            <div
              className="h-12 w-12 animate-spin rounded-full border-4 border-white/10"
              style={{ borderTopColor: COLORS.blueLight }}
            />
            <p className="text-sm text-slate-400">Carregando dados da loja...</p>
          </div>
        ) : erro ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h3 className="text-lg font-bold text-white">Não foi possível carregar</h3>
            <p className="mt-1 text-sm text-slate-400">{erro}</p>
            <button
              onClick={() => void buscar()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Tentar novamente
            </button>
          </div>
        ) : resumo && resumo.vendedores.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <Target className="mx-auto mb-3 h-12 w-12 text-slate-500" />
            <h3 className="text-lg font-bold text-white">Nenhuma meta encontrada</h3>
            <p className="mt-1 text-sm text-slate-400">
              Não há metas mensais cadastradas para o período atual ({mesAtualInicio()}).
            </p>
          </div>
        ) : resumo ? (
          <>
            {/* KPIs da loja */}
            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCardTV
                label="Meta da Loja"
                value={brlMoeda(metaTotal, 0)}
                icon={<Target className="h-6 w-6" />}
                accent={COLORS.blueLight}
                sub="Total mensal de todos os vendedores"
              />
              <KpiCardTV
                label="Realizado"
                value={brlMoeda(realizadoTotal, 0)}
                icon={<DollarSign className="h-6 w-6" />}
                accent={COLORS.green}
                sub={`${resumo.vendedores.length} vendedores`}
              />
              <KpiCardTV
                label="Falta para Meta"
                value={brlMoeda(faltaTotal, 0)}
                icon={<TrendingUp className="h-6 w-6" />}
                accent={faltaTotal > 0 ? COLORS.orange : COLORS.green}
                sub={faltaTotal > 0 ? "Ainda falta bater" : "Meta atingida!"}
              />
              <KpiCardTV
                label="% Atingimento"
                value={fmtPct(pctLoja, 1)}
                icon={<Trophy className="h-6 w-6" />}
                accent={stLoja.color}
                sub={`Projeção: ${brlMoeda(projecaoTotal, 0)}`}
              />
            </section>

            {/* Barra geral da loja */}
            <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                    Progresso Geral da Loja
                  </h3>
                  <p className="text-xs text-slate-400">
                    {fmtPct(pctLoja, 1)} da meta atingida ·{" "}
                    {faltaTotal > 0 ? `faltam ${brlMoeda(faltaTotal, 0)}` : "meta conquistada"}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className="font-num text-2xl font-bold sm:text-3xl"
                    style={{ color: stLoja.color }}
                  >
                    {fmtPct(pctLoja, 1)}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <BarraProgressoTV pctValor={pctLoja} cor={stLoja.color} altura="h-5" />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                <span>R$ 0</span>
                <span>Meta: {brlMoeda(metaTotal, 0)}</span>
              </div>
            </section>

            {/* Tabela de vendedores */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                  Desempenho por Vendedor
                </h3>
                <span className="text-xs text-slate-400">
                  {resumo.vendedores.length} vendedores ativos
                </span>
              </div>
              <div className="overflow-x-auto orion-tv-scroll">
                <table className="w-full min-w-[760px] table-fixed">
                  <colgroup>
                    <col className="w-[34%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[24%]" />
                    <col className="w-[6%]" />
                    <col className="w-[6%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 font-semibold">Vendedor</th>
                      <th className="px-4 py-3 font-semibold">Meta</th>
                      <th className="px-4 py-3 font-semibold">Realizado</th>
                      <th className="px-4 py-3 font-semibold">Progresso</th>
                      <th className="hidden px-4 py-3 font-semibold sm:table-cell">Falta</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {resumo.vendedores.map((v, i) => (
                        <LinhaVendedorTV key={v.usuario_id} v={v} rank={i} />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mt-6 text-center text-xs text-slate-500">
              Orionn TV Mode · Mês de referência:{" "}
              <span className="font-semibold text-slate-400">{mesAtualInicio()}</span> · dados
              fornecidos pelo Supabase em tempo real
            </p>
          </>
        ) : null}
      </main>
    </motion.div>
  );
}

// ============================================================================
// FEATURES
// ============================================================================

const FEATURES = [
  {
    icon: BarChart3,
    title: "Dashboard Executivo",
    desc: "Visão consolidada multi-empresa com KPIs, projeções e ranking em tempo real.",
    color: COLORS.blueLight,
  },
  {
    icon: DollarSign,
    title: "Lançamento de Vendas",
    desc: "Registro rápido por texto, voz ou foto do cupom com leitura automática da IA.",
    color: COLORS.green,
  },
  {
    icon: Bot,
    title: "IA com Foto e Voz",
    desc: "Assistente que lê imagens, entende comandos de voz e lança vendas automaticamente.",
    color: COLORS.blueOrion,
  },
  {
    icon: TrendingUp,
    title: "Relatórios com Gráficos",
    desc: "Exportação para Excel/Power BI, filtros por filial, categoria e período.",
    color: COLORS.orange,
  },
  {
    icon: ClipboardList,
    title: "Campanhas Comerciais",
    desc: "Crie campanhas, defina prêmios e acompanhe o engajamento do time.",
    color: COLORS.blueLight,
  },
  {
    icon: ShieldCheck,
    title: "Segurança e Auditoria",
    desc: "Controle de perfis (admin, gerente, supervisor, vendedor) e trilha de auditoria completa.",
    color: COLORS.green,
  },
] as const;

function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-300">
          <Activity className="h-3.5 w-3.5" /> Recursos
        </span>
        <h2 className="font-display mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
          Tudo o que sua operação precisa
        </h2>
        <p className="mt-4 text-base text-slate-400 sm:text-lg">
          Da ponta do vendedor ao board executivo — uma plataforma só para metas, vendas, equipes e
          performance.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors hover:border-white/20"
          >
            <div
              className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
              style={{ background: f.color }}
            />
            <div
              className="relative flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: `${f.color}22`, color: f.color }}
            >
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="font-display relative mt-5 text-lg font-bold text-white">{f.title}</h3>
            <p className="relative mt-2 text-sm text-slate-400">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER
// ============================================================================

function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-slate-400 sm:flex-row">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: COLORS.blueOrion }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={1.5}
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-display text-sm tracking-wide text-white">ORIONN</span>
        </div>
        <p className="text-center">© 2026 Orionn · Sistema de Gestão Multi-Empresa</p>
        <div className="flex items-center gap-4">
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            Supabase
          </a>
          <span>·</span>
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            Vercel
          </a>
          <span>·</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function LandingPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [tvMode, setTvMode] = useState(false);
  const featuresRef = useRef<HTMLElement>(null);

  // Se o usuário logar em outra aba enquanto a landing está aberta, o AuthContext
  // dispara refresh e `usuario` é populado — então o IndexRouter do route/index
  // já troca para OrionApp. Aqui só usamos para mostrar o nome no CTA.
  useEffect(() => {
    if (tvMode) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [tvMode]);

  const irParaAuth = () => navigate({ to: "/auth", search: { mode: "signin" } });
  const rolarParaFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden text-slate-100">
      <style>{LANDING_STYLES}</style>

      {/* Background layers */}
      <div className="orion-aurora-bg pointer-events-none absolute inset-0" />
      <GridMesh />
      <FloatingParticles count={26} />

      {/* Glows decorativos */}
      <div
        className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full blur-[140px]"
        style={{ background: "rgba(21,101,192,0.35)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full blur-[140px]"
        style={{ background: "rgba(66,165,245,0.25)" }}
      />

      {/* HEADER */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${COLORS.blueLight}, ${COLORS.blueOrion})`,
              boxShadow: `0 8px 24px -8px ${COLORS.blueOrion}`,
            }}
          >
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
          </div>
          <span className="font-display text-xl font-black tracking-wide text-white">ORIONN</span>
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={() => setTvMode(true)}
            className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 sm:inline-flex"
          >
            <Tv className="h-4 w-4" /> Painel TV
          </button>
          {usuario ? (
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              {usuario.iniciais} · {usuario.perfil}
            </span>
          ) : (
            <button
              onClick={irParaAuth}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-blue-400"
            >
              <LogIn className="h-4 w-4" /> Entrar
            </button>
          )}
        </nav>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 pb-16 pt-10 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            <Activity className="h-3.5 w-3.5" /> Plataforma multi-empresa
          </span>

          <div className="mt-6">
            <SpotlightText>ORIONN</SpotlightText>
            <p className="orion-spotlight-text font-display mt-2 text-2xl font-bold sm:text-4xl">
              Sistema de Gestão Multi-Empresa e Performance
            </p>
          </div>

          <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
            Centralize vendas, metas, campanhas, equipes e relatórios com IA em uma única
            plataforma. Acompanhe o desempenho do seu time em tempo real, em qualquer dispositivo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={irParaAuth}
              className="orion-glow-pulse inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.03]"
              style={{
                background: `linear-gradient(135deg, ${COLORS.blueOrion}, ${COLORS.blueLight})`,
              }}
            >
              <LogIn className="h-4 w-4" /> Entrar no Sistema
            </button>
            <button
              onClick={() => setTvMode(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              <Tv className="h-4 w-4" /> Painel em Tempo Real
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Acesso para admin · gerente · supervisor · vendedor
          </p>
        </motion.div>

        <div className="mt-16">
          <ScrollIndicator onClick={rolarParaFeatures} />
        </div>
      </section>

      {/* FEATURES */}
      <div ref={featuresRef as React.RefObject<HTMLDivElement>}>
        <FeaturesSection />
      </div>

      {/* FOOTER */}
      <Footer />

      {/* FAB da IA */}
      <IAAssistantFAB />

      {/* TV MODE OVERLAY */}
      <AnimatePresence>
        {tvMode && <TVModePanel onClose={() => setTvMode(false)} />}
      </AnimatePresence>
    </div>
  );
}
