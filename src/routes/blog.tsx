import { createFileRoute } from "@tanstack/react-router";
import { BlogPage } from "@/components/InstitutionalPages";

export const Route = createFileRoute("/blog")({
  component: () => <BlogPage />,
  head: () => ({
    meta: [
      { title: "Orion — BlogPage" },
      { name: "description", content: "BlogPage — Plataforma Orion" },
    ],
  }),
});
