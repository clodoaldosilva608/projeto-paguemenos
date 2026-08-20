import { createFileRoute } from "@tanstack/react-router";
import { CookiesPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/legal/cookies")({
  component: () => <CookiesPage />,
  head: () => ({
    meta: [
      { title: "Orion — CookiesPage" },
      { name: "description", content: "CookiesPage — Plataforma Orion" },
    ],
  }),
});
