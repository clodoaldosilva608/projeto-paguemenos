// Auth middleware simplificado (2026-08-05)
// Remove createSupabaseFetch e getClaims/getUser — usa fetch direto.
// Resolve erro "Unregistered API key" causado por header manipulation do SDK.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Configuração do Supabase ausente.");
    }

    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Unauthorized: No request");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: No token");
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.split(".").length !== 3) {
      throw new Error("Unauthorized: Invalid token");
    }

    // Validar token chamando Supabase Auth diretamente (sem SDK wrapper)
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      throw new Error(`Unauthorized: ${resp.status} ${errBody.slice(0, 100)}`);
    }

    const user = await resp.json();
    if (!user?.id) {
      throw new Error("Unauthorized: No user ID");
    }

    // Criar client com JWT do usuário (para queries com RLS)
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return next({
      context: {
        supabase,
        userId: user.id,
        claims: {
          sub: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  },
);
