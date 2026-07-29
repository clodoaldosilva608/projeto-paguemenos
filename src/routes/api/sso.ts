/**
 * SSO Cross-App — PagueMenos
 *
 * Recebe um JWT gerado pelo Orion (/api/sso/paguemenos-token) e faz
 * login automático no PagueMenos via Supabase Auth.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const ORION_SSO_SECRET = process.env.ORION_SSO_SECRET || "orion-sso-secret-dev-2026";

async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const crypto = await import("crypto");
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    if (signatureB64 !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch (err: any) {
    console.error("[sso] Erro ao verificar JWT:", err.message);
    return null;
  }
}

export const Route = (createFileRoute as any)("/api/sso")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");

        if (!token) {
          return new Response(JSON.stringify({ error: "Token obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const payload = await verifyJWT(token, ORION_SSO_SECRET);
        if (!payload) {
          return new Response(JSON.stringify({ error: "Token inválido ou expirado" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!SUPABASE_URL || !SERVICE_KEY) {
          return new Response(JSON.stringify({ error: "Supabase não configurado" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // Gera magic link para o email do payload
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: payload.email,
          options: {
            redirectTo: `${url.origin}/`,
          },
        });

        if (linkError || !linkData) {
          console.error("[sso] Erro gerando magic link:", linkError?.message);
          // Se usuário não existe, cria via admin API primeiro
          if (linkError?.message?.includes("not found") || linkError?.message?.includes("no user")) {
            const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + "A1!";
            const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: payload.email,
              password: tempPassword,
              email_confirm: true,
              user_metadata: {
                name: payload.name,
                company_id: payload.company_id,
                role: payload.role || "admin",
                source: "orion_sso",
              },
            });

            if (createError) {
              console.error("[sso] Erro criando usuário:", createError.message);
              return Response.redirect(`${url.origin}/auth`, 302);
            }

            // Tenta gerar magic link novamente
            const { data: linkData2 } = await supabaseAdmin.auth.admin.generateLink({
              type: "magiclink",
              email: payload.email,
              options: { redirectTo: `${url.origin}/` },
            });

            if (linkData2?.properties?.action_url) {
              console.log(`[sso] ✓ Login SSO (novo user): ${payload.email} → ${payload.company_id}`);
              return Response.redirect(linkData2.properties.action_url, 302);
            }
          }
          return Response.redirect(`${url.origin}/auth`, 302);
        }

        const actionUrl = linkData.properties?.action_url;
        if (!actionUrl) {
          return Response.redirect(`${url.origin}/auth`, 302);
        }

        console.log(`[sso] ✓ Login SSO: ${payload.email} → ${payload.company_id}`);
        return Response.redirect(actionUrl, 302);
      },
    },
  },
});
