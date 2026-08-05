import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";

// 🔒 Fase 7.1 (2026-08-04): code splitting.
// ANTES: OrionApp e LandingPage eram importados estaticamente, fazendo
// o bundle inicial carregar TODAS as 17 páginas admin mesmo para usuários
// não logados que só veriam a landing page.
// DEPOIS: lazy load — só carrega o que for necessário.
const OrionApp = lazy(() => import("@/OrionApp"));
const LandingPage = lazy(() => import("@/components/LandingPage"));

// Fallback simples paraSuspense
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-300">
      <div className="font-display text-2xl tracking-wide animate-pulse">Orion</div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Orion — Gestão Multi-Empresa e Performance de Vendas" },
      {
        name: "description",
        content:
          "Plataforma de gestão de metas, vendas, equipes e performance em tempo real para redes de farmácia e varejo.",
      },
      { property: "og:title", content: "Orion — Gestão Multi-Empresa e Performance de Vendas" },
      {
        property: "og:description",
        content: "Plataforma de gestão de metas, vendas, equipes e performance em tempo real.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <LoadingScreen />;
  return (
    <Suspense fallback={<LoadingScreen />}>
      <IndexRouter />
    </Suspense>
  );
}

function IndexRouter() {
  const { autenticado, carregando } = useAuth();
  if (carregando) return <LoadingScreen />;
  if (autenticado) return <OrionApp />;
  return <LandingPage />;
}
