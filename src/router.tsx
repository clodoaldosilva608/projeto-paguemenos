import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // 🔒 Fase 7.7 (2026-08-04): configurar React Query com defaults sensatos.
  // ANTES: QueryClient sem config → retry: 3 (multiplica carga em erros 500),
  // staleTime: 0 (sempre refetch), gcTime: 5min (default), refetchOnWindowFocus: true.
  // DEPOIS: retry: 1 (1 retry apenas), staleTime: 30s, gcTime: 5min,
  // refetchOnWindowFocus: false (evita refetch desnecessário em PWAs).
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,          // 30 segundos
        gcTime: 5 * 60_000,         // 5 minutos (era default, explícito agora)
        retry: 1,                    // 1 retry apenas (não 3)
        refetchOnWindowFocus: false, // Evita refetch em PWA/mobile
        refetchOnReconnect: "always",
      },
      mutations: {
        retry: 0, // Mutations não devem ser retryadas automaticamente
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // 🔒 Fase 7.7: 30s de preload stale time (em vez de 0 = sempre refetch)
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
