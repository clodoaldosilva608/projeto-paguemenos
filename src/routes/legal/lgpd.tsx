import { createFileRoute } from "@tanstack/react-router";
import { LGPDPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/legal/lgpd")({
  component: () => <LGPDPage />,
  head: () => ({
    meta: [
      { title: "Orion — LGPDPage" },
      { name: "description", content: "LGPDPage — Plataforma Orion" },
    ],
  }),
});
