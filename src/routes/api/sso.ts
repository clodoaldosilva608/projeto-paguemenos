/**
 * SSO Cross-App — PagueMenos
 *
 * Recebe um JWT gerado pelo Orion (/api/sso/paguemenos-token) e faz
 * login automático no PagueMenos via Supabase Auth.
 *
 * Fluxo:
 * 1. Valida JWT (HS256 + ORION_SSO_SECRET)
 * 2. Verifica se usuário existe no auth.users do PagueMenos
 * 3. Se não existe, cria via admin.createUser com company_id nos metadados
 * 4. Gera magic link e redireciona para action_url (login automático)
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
          console.error("[sso] Supabase não configurado");
          return Response.redirect(`${url.origin}/auth`, 302);
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        // === PASSO 1: Verificar se usuário existe ===
        // Busca na lista de users pelo email
        let userExists = false;
        let page = 1;
        for (let i = 0; i < 10; i++) {
          const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage: 100,
          });
          if (listError || !listData?.users) break;
          const found = listData.users.find((u) => u.email === payload.email);
          if (found) {
            userExists = true;
            break;
          }
          if (listData.users.length < 100) break;
          page++;
        }

        // === PASSO 2: Se não existe, criar ===
        if (!userExists) {
          console.log(`[sso] Usuário não encontrado, criando: ${payload.email}`);
          const tempPassword =
            Math.random().toString(36).slice(2) +
            Math.random().toString(36).slice(2) +
            "A1!";

          const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: payload.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              name: payload.name,
              company_id: payload.company_id, // slug do tenant
              role: payload.role || "admin",
              source: "orion_sso",
            },
          });

          if (createError) {
            console.error("[sso] Erro criando usuário:", createError.message);
            return Response.redirect(`${url.origin}/auth`, 302);
          }

          console.log(`[sso] ✓ Usuário criado: ${payload.email} → company_id: ${payload.company_id}`);
        }

        // === PASSO 3: Gerar magic link ===
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: payload.email,
          options: {
            redirectTo: `${url.origin}/`,
          },
        });

        if (linkError || !linkData?.properties?.action_url) {
          console.error("[sso] Erro gerando magic link:", linkError?.message);
          return Response.redirect(`${url.origin}/auth`, 302);
        }

        console.log(`[sso] ✓ Login SSO redirecionando: ${payload.email} → ${payload.company_id}`);
        return Response.redirect(linkData.properties.action_url, 302);
      },
    },
  },
});
