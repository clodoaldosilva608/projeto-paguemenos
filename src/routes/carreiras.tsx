import { createFileRoute } from "@tanstack/react-router";
import { CarreirasPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/carreiras")({
  component: () => <CarreirasPage />,
  head: () => ({
    meta: [
      { title: "Orion — CarreirasPage" },
      { name: "description", content: "CarreirasPage — Plataforma Orion" },
    ],
  }),
});
