import { createFileRoute } from "@tanstack/react-router";
import { ContatoPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/contato")({
  component: () => <ContatoPage />,
  head: () => ({
    meta: [
      { title: "Orion — ContatoPage" },
      { name: "description", content: "ContatoPage — Plataforma Orion" },
    ],
  }),
});
