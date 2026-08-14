import { createFileRoute } from "@tanstack/react-router";
import { StatusPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/status")({
  component: () => <StatusPage />,
  head: () => ({
    meta: [
      { title: "Orion — StatusPage" },
      { name: "description", content: "StatusPage — Plataforma Orion" },
    ],
  }),
});
