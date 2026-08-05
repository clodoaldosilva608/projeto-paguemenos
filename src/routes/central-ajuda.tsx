import { createFileRoute } from "@tanstack/react-router";
import { CentralAjudaPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/central-ajuda")({
  component: () => <CentralAjudaPage />,
  head: () => ({
    meta: [
      { title: "Orion — CentralAjudaPage" },
      { name: "description", content: "CentralAjudaPage — Plataforma Orion" },
    ],
  }),
});
