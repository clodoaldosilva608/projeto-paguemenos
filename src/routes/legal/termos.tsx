import { createFileRoute } from "@tanstack/react-router";
import { TermosPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/legal/termos")({
  component: () => <TermosPage />,
  head: () => ({
    meta: [
      { title: "Orion — TermosPage" },
      { name: "description", content: "TermosPage — Plataforma Orion" },
    ],
  }),
});
