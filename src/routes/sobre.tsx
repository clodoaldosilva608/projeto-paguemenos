import { createFileRoute } from "@tanstack/react-router";
import { SobrePage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/sobre")({
  component: () => <SobrePage />,
  head: () => ({
    meta: [
      { title: "Orion — SobrePage" },
      { name: "description", content: "SobrePage — Plataforma Orion" },
    ],
  }),
});
