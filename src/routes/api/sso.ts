/**
 * SSO Cross-App — PagueMenos
 *
 * Recebe JWT do Orion e faz login automático via magic link do Supabase.
 *
 * IMPORTANTE: Só funciona para usuários que JÁ EXISTEM no Supabase do
 * PagueMenos (criados pelo admin do PagueMenos). Não cria usuários
 * automaticamente — cada tenant deve ter sua própria instância isolada.
 *
 * O Orion é a central de comando. O PagueMenos é o template/produto.
 * Quando um cliente assina, o Orion provisiona uma instância separada
 * (via Vercel for Platforms ou deploy independente) — NÃO compartilha
 * o banco do PagueMenos.
 */

import { createFileRoute } from "@tanstack/react-router";

const ORION_SSO_SECRET = process.env.ORION_SSO_SECRET || "orion-sso-secret-dev-2026";

async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;
    const crypto = await import("crypto");
    const expectedSig = crypto.createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`).digest("base64url");
    if (signatureB64 !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export const Route = (createFileRoute as any)("/api/sso")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        if (!token) {
          return new Response(JSON.stringify({ error: "Token obrigatório" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }

        const payload = await verifyJWT(token, ORION_SSO_SECRET);
        if (!payload) {
          return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!SUPABASE_URL || !SERVICE_KEY) {
          console.error("[sso] Supabase não configurado");
          return Response.redirect(`${url.origin}/auth`, 302);
        }

        const headers = {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        };

        // Verificar se usuário JÁ EXISTE no Supabase do PagueMenos
        // Se não existe, NÃO cria — redireciona para página de login
        // com mensagem explicando que a instância está sendo provisionada
        const linkResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "magiclink",
            email: payload.email,
            options: { redirect_to: `${url.origin}/` },
          }),
        });

        if (linkResp.ok) {
          const linkData = await linkResp.json();
          if (linkData?.action_link) {
            // Usuário existe — login automático
            console.log(`[sso] ✓ Login SSO: ${payload.email}`);
            return Response.redirect(linkData.action_link, 302);
          }
        }

        // Usuário NÃO existe — não cria automaticamente
        // Redireciona para login com mensagem
        console.log(`[sso] Usuário não encontrado no PagueMenos: ${payload.email} — redirecionando para login`);
        const loginUrl = new URL(`${url.origin}/auth`);
        loginUrl.searchParams.set("sso", "pending");
        loginUrl.searchParams.set("email", payload.email);
        return Response.redirect(loginUrl.toString(), 302);
      },
    },
  },
});
