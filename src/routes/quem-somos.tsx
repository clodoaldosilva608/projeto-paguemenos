import { createFileRoute } from "@tanstack/react-router";
import { QuemSomosPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/quem-somos")({
  component: () => <QuemSomosPage />,
  head: () => ({
    meta: [
      { title: "Orion — QuemSomosPage" },
      { name: "description", content: "QuemSomosPage — Plataforma Orion" },
    ],
  }),
});
