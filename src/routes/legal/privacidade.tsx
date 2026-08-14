import { createFileRoute } from "@tanstack/react-router";
import { PrivacidadePage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/legal/privacidade")({
  component: () => <PrivacidadePage />,
  head: () => ({
    meta: [
      { title: "Orion — PrivacidadePage" },
      { name: "description", content: "PrivacidadePage — Plataforma Orion" },
    ],
  }),
});
