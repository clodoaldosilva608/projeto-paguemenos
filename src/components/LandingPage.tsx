import { useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import HeroSection from "./HeroSection";
import KineticGrid from "./KineticGrid";
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
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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

function GridMesh() {
  return <div className="pointer-events-none absolute inset-0 orion-grid-mesh" aria-hidden />;
}

function FloatingParticles({ count = 26 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
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

function SpotlightText({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const mx = useMotionValue(50);
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

function ScrollIndicator({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Rolar para ver recursos"
      className="orion-scroll-indicator mx-auto flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-white"
    >
      <span className="text-[11px] uppercase tracking-[0.25em]">Explorar</span>
      <ChevronDown className="h-5 w-5" />
    </button>
  );
}

// ============================================================================
// KINETIC GRID — agora usado como plano de fundo fixo de tela cheia
// (declarado no componente LandingPage, não mais como seção dedicada).
// ============================================================================

// (Seção dedicada removida — o KineticGrid agora é renderizado como camada
// de fundo fixa em <LandingPage />, com globalMouse=true para capturar
// eventos em window sem bloquear cliques no conteúdo.)

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
        <p className="mt-4 text-base text-slate-400 dark:text-slate-500 sm:text-lg">
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
            <p className="relative mt-2 text-sm text-slate-400 dark:text-slate-500">{f.desc}</p>
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
  const navigate = useNavigate();
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Grid de seções */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {/* Logo + descrição */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <img
              src="/assets/images/orion_logo.png"
              alt="ORION Logo"
              className="h-8 w-auto"
            />
            <p className="mt-3 max-w-xs text-[11px] leading-relaxed text-slate-500">
              Plataforma de gestão de vendas, metas e performance em tempo real para redes de farmácia e varejo.
            </p>
          </div>

          {/* Institucional */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">Institucional</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li><a href="/sobre" className="hover:text-sky-400 transition-colors">Sobre o Orion</a></li>
              <li><a href="/quem-somos" className="hover:text-sky-400 transition-colors">Quem Somos</a></li>
              <li><a href="/blog" className="hover:text-sky-400 transition-colors">Blog</a></li>
              <li><a href="/carreiras" className="hover:text-sky-400 transition-colors">Carreiras</a></li>
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">Suporte</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li><a href="/faq" className="hover:text-sky-400 transition-colors">FAQ</a></li>
              <li><a href="/central-ajuda" className="hover:text-sky-400 transition-colors">Central de Ajuda</a></li>
              <li><a href="/contato" className="hover:text-sky-400 transition-colors">Contato</a></li>
              <li><a href="/status" className="hover:text-sky-400 transition-colors">Status do Sistema</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">Legal</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li><a href="/legal/termos" className="hover:text-sky-400 transition-colors">Termos de Serviço</a></li>
              <li><a href="/legal/privacidade" className="hover:text-sky-400 transition-colors">Política de Privacidade</a></li>
              <li><a href="/legal/lgpd" className="hover:text-sky-400 transition-colors">LGPD</a></li>
              <li><a href="/legal/cookies" className="hover:text-sky-400 transition-colors">Cookies</a></li>
            </ul>
          </div>

          {/* Admin */}
          <div>
            <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-300">Acesso</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li>
                <button
                  onClick={() => navigate({ to: "/admin/login" })}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-sky-400 transition-colors"
                >
                  <ShieldCheck className="h-3 w-3" /> Painel Admin
                </button>
              </li>
              <li><button onClick={() => navigate({ to: "/auth" })} className="hover:text-sky-400 transition-colors">Entrar no Sistema</button></li>
              <li><button onClick={() => navigate({ to: "/tv" })} className="hover:text-sky-400 transition-colors">TV Mode</button></li>
            </ul>
          </div>
        </div>

        {/* Linha inferior */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 sm:flex-row">
          <p className="text-[10px] text-slate-600">© 2026 Orion · Plataforma de Gestão de Vendas e Performance</p>
          <div className="flex items-center gap-4 text-[10px] text-slate-600">
            <span>Powered by</span>
            <a href="https://supabase.com" target="_blank" rel="noreferrer" className="hover:text-slate-400">Supabase</a>
            <span>·</span>
            <a href="https://vercel.com" target="_blank" rel="noreferrer" className="hover:text-slate-400">Vercel</a>
          </div>
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
  const featuresRef = useRef<HTMLElement>(null);

  const irParaAuth = () => navigate({ to: "/auth", search: { mode: "signin" } });
  const irParaTV = () => navigate({ to: "/tv" });
  const rolarParaFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col overflow-hidden text-slate-100">
      <style>{LANDING_STYLES}</style>

      {/* ============================================================
          PLANO DE FUNDO — Kinetic Grid (tela cheia, fixo, interativo)
          - position: fixed; inset: 0 → cobre toda a viewport
          - globalMouse → escuta mouse/touch em window
          - pointer-events: none → não bloqueia cliques no conteúdo
          - z-index: 0 → fica atrás de todo o conteúdo (z-10+)
         ============================================================ */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <KineticGrid
          background="#0a192f"
          dotColor="#7DD3FC"
          lineColor="#22D3EE"
          trailColor="#06B6D4"
          spacing={36}
          radius={420}
          strength={4}
          trail={true}
          globalMouse={true}
        />
        {/* Camada de gradiente sutil para dar profundidade sobre o grid */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(8,47,73,0.35) 0%, rgba(10,25,47,0.55) 60%, rgba(2,8,23,0.75) 100%)",
          }}
        />
      </div>

      {/* Glows decorativos (acima do grid, abaixo do conteúdo) */}
      <div
        className="pointer-events-none fixed left-1/4 top-0 z-0 h-96 w-96 rounded-full blur-[140px]"
        style={{ background: "rgba(21,101,192,0.18)" }}
      />
      <div
        className="pointer-events-none fixed bottom-0 right-1/4 z-0 h-96 w-96 rounded-full blur-[140px]"
        style={{ background: "rgba(66,165,245,0.14)" }}
      />

      {/* HEADER */}
      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <img
            src="/assets/images/orion_logo.png"
            alt="ORION Logo"
            className="h-9 w-auto"
            loading="eager"
          />
        </div>

        <nav className="flex items-center gap-2">
          <button
            onClick={irParaTV}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
            title="Painel TV Mode — acesso restrito a admin, gerente ou supervisor"
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

      {/* HERO — nova seção com partículas 3D */}
      <HeroSection />

      {/* FEATURES */}
      <div ref={featuresRef as React.RefObject<HTMLDivElement>}>
        <FeaturesSection />
      </div>

      {/* FOOTER */}
      <Footer />

      {/* FAB da IA */}
      <IAAssistantFAB />
    </div>
  );
}
