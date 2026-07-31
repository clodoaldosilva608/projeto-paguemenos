import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { TemaProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Falha ao carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Algo deu errado. Tente novamente.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" },
      { title: "Orion Dashboard — Metas & Performance" },
      {
        name: "description",
        content: "Dashboard de metas, vendas e performance da equipe em tempo real.",
      },
      { name: "theme-color", content: "#0a3d8a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Orion" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "Orion Dashboard — Metas & Performance" },
      {
        property: "og:description",
        content: "Dashboard de metas, vendas e performance da equipe em tempo real.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Orion" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Orion Dashboard — Metas & Performance" },
      {
        name: "twitter:description",
        content: "Dashboard de metas, vendas e performance da equipe em tempo real.",
      },
      // === Headers de segurança (meta tags — backup dos headers HTTP) ===
      // Referrer-Policy: não vaza URL completa para origens cross-origin
      { name: "referrer", content: "strict-origin-when-cross-origin" },
      // Color-scheme hints
      { name: "color-scheme", content: "light dark" },
      // robots: indexação permitida (apenas landing page pública é relevante)
      { name: "robots", content: "index, follow" },
      // CSP via meta tag (defesa em profundidade — o server middleware também envia o header)
      {
        httpEquiv: "Content-Security-Policy",
        content: [
          "default-src 'self'",
          // scripts: self + inline (TanStack/Vite injetam inline em dev) + eval (dev only)
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          // styles: self + inline (Tailwind/framer-motion)
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          // images: self + data: (base64 avatares) + blob: (uploads) + https (CDNs)
          "img-src 'self' data: blob: https:",
          // fonts: self + Google Fonts CDN
          "font-src 'self' data: https://fonts.gstatic.com",
          // connect: self + Supabase + Google AI + Lovable gateway (IA)
          "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://ai.gateway.lovable.dev https://api.openai.com https://api.anthropic.com https://openrouter.ai",
          // media: self + data:
          "media-src 'self' data:",
          // object-src: bloqueia plugins (Flash/Java)
          "object-src 'none'",
          // base-uri: bloqueia hijack de <base>
          "base-uri 'self'",
          // form-action: self (não permite forms para origens externas)
          "form-action 'self'",
          // frame-ancestors: 'none' equivalente a X-Frame-Options: DENY (clickjacking)
          "frame-ancestors 'none'",
          // upgrade-insecure-requests: força HTTPS
          "upgrade-insecure-requests",
        ].join("; "),
      },
      // X-Content-Type-Options (via meta, pois browsers antigos suportam)
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      // X-Frame-Options (legacy — CSP frame-ancestors já cobre)
      { httpEquiv: "X-Frame-Options", content: "DENY" },
      // X-XSS-Protection (legacy, mas alguns browsers ainda respeitam)
      { httpEquiv: "X-XSS-Protection", content: "1; mode=block" },
      // X-DNS-Prefetch-Control: não fazer prefetch cross-origin (evita vazamento)
      { httpEquiv: "X-DNS-Prefetch-Control", content: "off" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-192.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TemaProvider>
        <AuthProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </TemaProvider>
    </QueryClientProvider>
  );
}
