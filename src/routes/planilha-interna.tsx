import { createFileRoute } from "@tanstack/react-router";
import PlanilhaInternaPage from "@/components/planilha/PlanilhaInternaPage";

export const Route = createFileRoute("/planilha-interna")({
  component: () => <PlanilhaInternaPage />,
  head: () => ({
    meta: [
      { title: "Planilha Interna — Orion" },
      { name: "description", content: "Dashboard executivo interno com KPIs, gráficos e insights automáticos." },
    ],
  }),
});
