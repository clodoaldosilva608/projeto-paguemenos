/**
 * SSO Cross-App — PagueMenos
 *
 * Recebe um JWT gerado pelo Orion (/api/sso/paguemenos-token) e faz
 * login automático no PagueMenos via Supabase Auth.
 *
 * Fluxo:
 * 1. Usuário clica "Abrir PagueMenos" no dashboard do Orion
 * 2. Orion gera JWT com { company_id, email, role, exp: 60s }
 * 3. Redireciona para https://{subdomain}.projeto-paguemenos.vercel.app/api/sso?token=xxx
 * 4. Esta rota valida o JWT, busca/cria o usuário no Supabase Auth
 * 5. Seta cookie de sessão e redireciona para / (dashboard)
 */

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";

const ORION_SSO_SECRET = process.env.ORION_SSO_SECRET || "orion-sso-secret-dev-2026";

// Helper: verifica JWT HS256
async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    // Verifica assinatura
    const crypto = await import("crypto");
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    if (signatureB64 !== expectedSig) {
      console.error("[sso] Assinatura inválida");
      return null;
    }

    // Decodifica payload
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    // Verifica expiração
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error("[sso] Token expirado");
      return null;
    }

    return payload;
  } catch (err: any) {
    console.error("[sso] Erro ao verificar JWT:", err.message);
    return null;
  }
}

export const APIRoute = createAPIFileRoute("/api/sso")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Valida JWT
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

    // Cria cliente admin Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Busca usuário pelo email no auth.users
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    let userId: string | null = null;

    if (!usersError && usersData?.users) {
      const existingUser = usersData.users.find((u) => u.email === payload.email);
      if (existingUser) {
        userId = existingUser.id;
      }
    }

    // Se não existe, cria usuário via admin API com company_id nos metadados
    if (!userId) {
      // Gera senha temporária aleatória (usuário não precisa saber — usa SSO)
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + "A1!";

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

      if (createError || !newUserData?.user) {
        console.error("[sso] Erro criando usuário:", createError?.message);
        return new Response(JSON.stringify({ error: "Erro ao criar usuário" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      userId = newUserData.user.id;
      console.log(`[sso] ✓ Novo usuário criado: ${payload.email} → company_id: ${payload.company_id}`);
    }

    // Gera um link mágico de login para o usuário (1-use, expira em 60s)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: payload.email,
      options: {
        redirectTo: `${url.origin}/`,
      },
    });

    if (linkError || !linkData) {
      console.error("[sso] Erro gerando magic link:", linkError?.message);
      // Fallback: redireciona para login manual
      return Response.redirect(`${url.origin}/auth`, 302);
    }

    // O linkData.properties.action_url contém a URL com o token de verificação
    // que seta o cookie de sessão no browser
    const actionUrl = linkData.properties?.action_url;
    if (!actionUrl) {
      console.error("[sso] action_url não encontrado");
      return Response.redirect(`${url.origin}/auth`, 302);
    }

    console.log(`[sso] ✓ Login SSO redirecionando: ${payload.email} → ${payload.company_id}`);

    // Redireciona para a action_url do Supabase que seta o cookie
    // e depois redireciona para / (redirectTo definido acima)
    return Response.redirect(actionUrl, 302);
  },
});
