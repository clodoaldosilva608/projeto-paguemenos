import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listarPowerbiTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("powerbi_tokens")
      .select("id, token, escopo, ativo, ultimo_uso_em, criado_em")
      .eq("user_id", context.userId)
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return { tokens: data ?? [] };
  });

export const criarPowerbiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ escopo: z.enum(["proprio", "equipe", "todos"]).default("proprio") }).parse(v))
  .handler(async ({ data, context }) => {
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const { data: row, error } = await context.supabase
      .from("powerbi_tokens")
      .insert({ user_id: context.userId, token, escopo: data.escopo })
      .select("id, token, escopo, ativo, criado_em")
      .single();
    if (error) throw new Error(error.message);
    return { token: row };
  });

export const revogarPowerbiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("powerbi_tokens")
      .update({ ativo: false })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
