import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import OrionApp from "@/OrionApp";
import LandingPage from "@/components/LandingPage";

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
  return <IndexRouter />;
}

function IndexRouter() {
  const { autenticado, carregando } = useAuth();
  if (carregando) return <LoadingScreen />;
  if (autenticado) return <OrionApp />;
  return <LandingPage />;
}
