import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Users, Zap, LineChart, LogIn, Rocket, Download } from "lucide-react";
import OrionApp from "@/OrionApp";
import { useAuth } from "@/contexts/AuthContext";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Orion — Gestão Multi-Empresa e Performance de Vendas" },
      { name: "description", content: "Plataforma de gestão de metas, vendas, equipes e performance em tempo real para redes de farmácia e varejo." },
      { property: "og:title", content: "Orion — Gestão Multi-Empresa e Performance de Vendas" },
      { property: "og:description", content: "Plataforma de gestão de metas, vendas, equipes e performance em tempo real." },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-300"><div className="font-display text-2xl tracking-wide">Orion</div></div>;
  return <IndexRouter />;
}

function IndexRouter() {
  const { autenticado, carregando } = useAuth();
  if (carregando) return <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-300"><div className="font-display text-2xl tracking-wide">Orion</div></div>;
  if (autenticado) return <OrionApp />;
  return <LandingPage />;
}

function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: TrendingUp, title: "Metas & Performance", desc: "Acompanhe metas mensais, individuais e por filial com projeções em tempo real." },
    { icon: Users, title: "Equipes & Filiais", desc: "Organize colaboradores, cargos e territórios em uma estrutura multi-empresa." },
    { icon: LineChart, title: "Relatórios inteligentes", desc: "Lançamento de vendas por foto — a IA lê a imagem e registra os números." },
    { icon: Zap, title: "Gamificação", desc: "Ranking, campanhas e recompensas para engajar seu time todos os dias." },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-900 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-20"><div className="h-full w-full" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.3) 1px, transparent 0)", backgroundSize: "40px 40px" }} /></div>
      <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-5 w-5"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9" strokeLinecap="round" /></svg>
          </div>
          <span className="font-display text-xl tracking-wide">ORION</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/auth" search={{ mode: "signin" }} className="hidden rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 sm:inline-flex">Entrar</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500">Criar conta</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-10 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-300">
            <Rocket className="h-3.5 w-3.5" /> Plataforma multi-empresa
          </span>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-6xl">
            Gestão de metas e performance de <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">vendas em tempo real</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
            O Orion centraliza vendas, metas, campanhas, equipes e relatórios com IA em uma única plataforma. Instale como aplicativo no seu celular e acompanhe seu time onde estiver.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500">
              <Rocket className="h-4 w-4" /> Testar grátis 14 dias
            </button>
            <button onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10">
              <LogIn className="h-4 w-4" /> Já tenho conta
            </button>
            <PWAInstallPrompt variant="button" />
          </div>
          <p className="mt-3 text-xs text-slate-400">Acesso completo por 14 dias · Sem cartão de crédito · Cancele quando quiser</p>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/80 to-indigo-600/80">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 font-display text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-slate-400 sm:flex-row">
          <p>© {new Date().getFullYear()} Orion · Gestão Multi-Empresa</p>
          <div className="flex items-center gap-3">
            <Link to="/auth" search={{ mode: "signin" }} className="hover:text-white">Entrar</Link>
            <span>·</span>
            <Link to="/auth" search={{ mode: "signup" }} className="hover:text-white">Cadastro</Link>
            <span>·</span>
            <Link to="/auth" search={{ mode: "signin" }} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 font-semibold text-slate-200 hover:bg-white/10">
              <ShieldCheck className="h-3 w-3" /> Acesso Admin
            </Link>
          </div>
        </div>
      </footer>

      <PWAInstallPrompt />
    </div>
  );
}
