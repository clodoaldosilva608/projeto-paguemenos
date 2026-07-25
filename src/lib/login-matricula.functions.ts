import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ------------------------------------------------------------------
// Login por matrícula: recebe primeiro_nome + matricula
// Valida na tabela login_matricula e retorna o email real do usuário
// para o client fazer signInWithPassword com email + matricula (como senha)
// ------------------------------------------------------------------

export const buscarEmailPorMatricula = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) =>
    z.object({
      primeiro_nome: z.string().min(2).max(50),
      matricula: z.string().min(4).max(20),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar na tabela login_matricula (case-insensitive no primeiro_nome)
    const { data: registro, error } = await supabaseAdmin
      .from("login_matricula")
      .select("user_id, primeiro_nome, matricula, ativo")
      .ilike("primeiro_nome", data.primeiro_nome.trim().toLowerCase())
      .eq("matricula", data.matricula.trim())
      .eq("ativo", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!registro) {
      throw new Error("Credenciais inválidas. Verifique seu primeiro nome e matrícula.");
    }

    // Buscar email do auth.users
    const { data: authUser, error: errAuth } = await supabaseAdmin.auth.admin.getUserById(registro.user_id);
    if (errAuth || !authUser?.user?.email) {
      throw new Error("Usuário não encontrado no sistema de autenticação.");
    }

    return {
      email: authUser.user.email,
      senha: data.matricula.trim(),
      primeiroNome: registro.primeiro_nome,
    };
  });

// ------------------------------------------------------------------
// CRUD de credenciais (admin/gerente gerencia)
// ------------------------------------------------------------------

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "gerente"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Acesso negado. Necessário perfil admin ou gerente.");
}

export const listarCredenciais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: creds, error } = await supabaseAdmin
      .from("login_matricula")
      .select("*")
      .order("primeiro_nome");

    if (error) throw new Error(error.message);

    const userIds = (creds || []).map((c: any) => c.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return {
      credenciais: (creds || []).map((c: any) => ({
        ...c,
        nome_completo: profileMap.get(c.user_id)?.nome || c.primeiro_nome,
        email: profileMap.get(c.user_id)?.email || "",
      })),
    };
  });

export const salvarCredencial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      user_id: z.string().uuid(),
      primeiro_nome: z.string().min(2).max(50),
      matricula: z.string().min(4).max(20),
      ativo: z.boolean().default(true),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      user_id: data.user_id,
      primeiro_nome: data.primeiro_nome.trim().toLowerCase(),
      matricula: data.matricula.trim(),
      ativo: data.ativo,
      atualizado_em: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("login_matricula").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      const { error: errPw } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: data.matricula.trim(),
        email_confirm: true,
      });
      if (errPw) throw new Error("Credencial atualizada, mas erro ao trocar senha: " + errPw.message);
      return { ok: true };
    } else {
      const { error } = await supabaseAdmin.from("login_matricula").insert(payload);
      if (error) throw new Error(error.message);
      const { error: errPw } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        password: data.matricula.trim(),
        email_confirm: true,
      });
      if (errPw) throw new Error("Credencial criada, mas erro ao definir senha: " + errPw.message);
      return { ok: true };
    }
  });

export const excluirCredencial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("login_matricula").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
