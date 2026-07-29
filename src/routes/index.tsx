import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import OrionApp from "@/OrionApp";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/components/LandingPage";

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
  if (!mounted)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-300">
        <div className="font-display text-2xl tracking-wide">Orion</div>
      </div>
    );
  return <IndexRouter />;
}

function IndexRouter() {
  const { autenticado, carregando } = useAuth();
  if (carregando)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f1c] text-slate-300">
        <div className="font-display text-2xl tracking-wide">Orion</div>
      </div>
    );
  if (autenticado) return <OrionApp />;
  return <LandingPage />;
}
