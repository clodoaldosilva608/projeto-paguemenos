import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// Validação de força de senha (mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial)
const senhaSchema = z.string()
  .min(8, "Senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Senha deve conter ao menos 1 letra maiúscula")
  .regex(/[a-z]/, "Senha deve conter ao menos 1 letra minúscula")
  .regex(/\d/, "Senha deve conter ao menos 1 número")
  .regex(/[^A-Za-z0-9]/, "Senha deve conter ao menos 1 caractere especial");

export const criarUsuarioConfirmado = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({
    email: z.string().email(),
    password: senhaSchema,
    nome: z.string().min(1)
  }).parse(v))
  .handler(async ({ data, context }) => {
    // Rate limit: 5 cadastros por minuto por IP (proteção contra spam de contas)
    await applyRateLimit(
      (context as any)?.request,
      "signup",
      RATE_LIMITS.signup.max,
      RATE_LIMITS.signup.windowMs,
    );

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
