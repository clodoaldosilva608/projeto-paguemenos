import { createFileRoute } from "@tanstack/react-router";
import TVModePanel from "@/components/TVModePanel";

export const Route = createFileRoute("/tv")({
  component: TVRoute,
  head: () => ({
    meta: [
      { title: "Painel TV Mode — Orion" },
      {
        name: "description",
        content:
          "Painel de monitoramento em tempo real — meta da loja, realizado por vendedor e quanto falta para bater a meta.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function TVRoute() {
  // standalone=true: renderiza como página full (não overlay)
  return <TVModePanel standalone />;
}
