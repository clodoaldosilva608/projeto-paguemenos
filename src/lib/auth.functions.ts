import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const criarUsuarioConfirmado = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ email: z.string().email(), password: z.string().min(4), nome: z.string().min(1) }).parse(v))
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!SUPABASE_URL || !SERVICE_KEY) return { ok: false, error: "Config ausente" };
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password, email_confirm: true, user_metadata: { nome: data.nome } }),
      });
      const result = await resp.json();
      if (!resp.ok) return { ok: false, error: result.message || result.msg || `HTTP ${resp.status}` };
      return { ok: true, userId: result.id };
    } catch (e: any) { return { ok: false, error: e.message }; }
  });
