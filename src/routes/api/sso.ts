/**
 * SSO Cross-App — PagueMenos
 *
 * Recebe JWT do Orion e faz login automático via magic link do Supabase.
 * Usa REST API direto (sem SDK) para evitar problemas de formato de resposta.
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

        // 1. Gerar magic link diretamente via REST API
        // Se usuário não existir, o Supabase cria o link mesmo assim (para usuários confirmados)
        // Se não for confirmado, retorna erro e criamos o usuário
        const linkResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "magiclink",
            email: payload.email,
            options: { redirect_to: `${url.origin}/` },
          }),
        });

        const linkData = await linkResp.json();

        // Se o magic link foi gerado com sucesso, action_link está no nível raiz
        if (linkResp.ok && linkData?.action_link) {
          console.log(`[sso] ✓ Login SSO: ${payload.email} → ${payload.company_id}`);
          return Response.redirect(linkData.action_link, 302);
        }

        // 2. Se falhou (usuário não existe?), criar usuário
        if (!linkResp.ok || !linkData?.action_link) {
          console.log(`[sso] Magic link falhou, criando usuário: ${payload.email}`);
          const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + "A1!";

          const createResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              email: payload.email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                name: payload.name,
                company_id: payload.company_id,
                role: payload.role || "admin",
                source: "orion_sso",
              },
            }),
          });

          if (!createResp.ok) {
            console.error("[sso] Erro criando usuário:", await createResp.text());
            return Response.redirect(`${url.origin}/auth`, 302);
          }

          console.log(`[sso] ✓ Usuário criado: ${payload.email} → ${payload.company_id}`);

          // 3. Tentar magic link novamente
          const linkResp2 = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              type: "magiclink",
              email: payload.email,
              options: { redirect_to: `${url.origin}/` },
            }),
          });

          const linkData2 = await linkResp2.json();

          if (linkResp2.ok && linkData2?.action_link) {
            console.log(`[sso] ✓ Login SSO (novo user): ${payload.email}`);
            return Response.redirect(linkData2.action_link, 302);
          }

          console.error("[sso] Magic link falhou após criar usuário");
        }

        return Response.redirect(`${url.origin}/auth`, 302);
      },
    },
  },
});
