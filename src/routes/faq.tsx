import { createFileRoute } from "@tanstack/react-router";
import { FAQPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/faq")({
  component: () => <FAQPage />,
  head: () => ({
    meta: [
      { title: "Orion — FAQPage" },
      { name: "description", content: "FAQPage — Plataforma Orion" },
    ],
  }),
});
