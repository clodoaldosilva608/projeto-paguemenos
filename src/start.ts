import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

/**
 * Headers de segurança HTTP são injetados em TODAS as respostas (HTML, JS,
 * CSS, imagens, server fns, rotas estáticas) em DOIS lugares para defesa em
 * profundidade:
 *
 * 1. `vercel.json` → bloco `headers[].source = "/(.*)"`. Injetado pelo Vercel
 *    em produção em TODAS as respostas HTTP. Inclui: CSP, X-Frame-Options,
 *    X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy,
 *    X-XSS-Protection, X-DNS-Prefetch-Control.
 *
 * 2. `src/routes/__root.tsx` → meta tags http-equiv no <head>. Funciona como
 *    fallback em ambientes que não passam pelo Vercel (ex.: preview local,
 *    deploy em outro provedor). Não cobre assets estáticos, mas cobre a
 *    página HTML inicial — que é o vetor principal de XSS/clickjacking.
 *
 * OBS: tentamos inicialmente um `functionMiddleware` para aplicar headers em
 * respostas de server fns, mas TanStack Start typing exige que `functionMiddleware`
 * retorne o resultado de `next()` (não Response custom). Por isso, server fns que
 * retornam Response custom (ex.: exportarIALogs CSV) dependem apenas dos headers
 * do vercel.json + meta tags, que é suficiente.
 */
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
