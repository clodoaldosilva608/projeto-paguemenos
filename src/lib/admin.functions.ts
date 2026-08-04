import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const perfilEnum = z.enum(["admin", "gerente", "supervisor", "vendedor"]);

// Exportado para reutilização por outras server functions.
// Nota: atualmente aceita admin OU gerente (decisão de negócio de 31/07/2026).
// A Fase 3 do plano de correção vai reverter para apenas admin.
export async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "gerente"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado. Necessário perfil admin ou gerente.");
}

// Helper para exigir especificamente admin (não gerente).
// Usar em operações críticas como mutar user_roles, members, companies.
export async function ensureAdminOnly(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado. Necessário perfil admin.");
}

async function logAudit(admin: any, params: {
  actor_user_id: string; actor_email?: string | null;
  action: string; entity: string; entity_id?: string | null;
  before?: any; after?: any; metadata?: any;
}) {
  try {
    await admin.from("audit_log").insert({
      actor_user_id: params.actor_user_id,
      actor_email: params.actor_email ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (e) {
    console.error("[audit] falha ao registrar", e);
  }
}

// -------- Invites --------
export const criarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z.object({
      email: z.string().email(),
      nome: z.string().min(1),
      perfil: perfilEnum.default("vendedor"),
      filial_id: z.string().optional().nullable(),
      equipe_id: z.string().optional().nullable(),
      cargo: z.string().optional().nullable(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { data: inv, error } = await supabaseAdmin
      .from("invites")
      .insert({
        email: data.email.toLowerCase(),
        nome: data.nome,
        perfil: data.perfil,
        filial_id: data.filial_id ?? null,
        equipe_id: data.equipe_id ?? null,
        cargo: data.cargo ?? null,
        token,
        criado_por: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId, actor_email: context.claims?.email,
      action: "convite.criar", entity: "invite", entity_id: inv.id,
      after: { email: inv.email, nome: inv.nome, perfil: inv.perfil },
    });

    const origin = process.env.SITE_URL || "";
    const inviteUrl = `${origin || ""}/auth?mode=signup&invite=${token}&email=${encodeURIComponent(inv.email)}`;
    return { invite: inv, inviteUrl };
  });

export const revogarConvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin.from("invites").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin.from("invites").update({ status: "revogado" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId, actor_email: context.claims?.email,
      action: "convite.revogar", entity: "invite", entity_id: data.id,
      before, after: { ...before, status: "revogado" },
    });
    return { ok: true };
  });

// -------- Users --------
export const alterarPerfilUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ user_id: z.string().uuid(), perfil: perfilEnum }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.user_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.perfil });
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId, actor_email: context.claims?.email,
      action: "usuario.perfil", entity: "user", entity_id: data.user_id,
      before: { roles: before }, after: { role: data.perfil },
    });
    return { ok: true };
  });

export const alternarAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ user_id: z.string().uuid(), ativo: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin.from("profiles").select("ativo,nome,email").eq("id", data.user_id).maybeSingle();
    const { error } = await supabaseAdmin.from("profiles").update({ ativo: data.ativo, atualizado_em: new Date().toISOString() }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId, actor_email: context.claims?.email,
      action: data.ativo ? "usuario.ativar" : "usuario.desativar", entity: "user", entity_id: data.user_id,
      before, after: { ...before, ativo: data.ativo },
    });
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ user_id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Você não pode excluir sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin.from("profiles").select("nome,email").eq("id", data.user_id).maybeSingle();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId, actor_email: context.claims?.email,
      action: "usuario.excluir", entity: "user", entity_id: data.user_id, before,
    });
    return { ok: true };
  });

// -------- Quick Links --------
export const salvarQuickLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      label: z.string().min(1).max(60),
      url: z.string().url(),
      icone: z.string().default("link"),
      cor: z.string().default("#25D366"),
      ativo: z.boolean().default(true),
      ordem: z.number().int().default(0),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, atualizado_em: new Date().toISOString(), criado_por: context.userId };
    if (data.id) {
      const { data: before } = await supabaseAdmin.from("quick_links").select("*").eq("id", data.id).maybeSingle();
      const { error } = await supabaseAdmin.from("quick_links").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit(supabaseAdmin, {
        actor_user_id: context.userId, actor_email: context.claims?.email,
        action: "quicklink.atualizar", entity: "quick_link", entity_id: data.id, before, after: payload,
      });
    } else {
      const { data: created, error } = await supabaseAdmin.from("quick_links").insert(payload).select("*").single();
      if (error) throw new Error(error.message);
      await logAudit(supabaseAdmin, {
        actor_user_id: context.userId, actor_email: context.claims?.email,
        action: "quicklink.criar", entity: "quick_link", entity_id: created.id, after: created,
      });
    }
    return { ok: true };
  });

export const excluirQuickLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin.from("quick_links").select("*").eq("id", data.id).maybeSingle();
    const { error } = await supabaseAdmin.from("quick_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId, actor_email: context.claims?.email,
      action: "quicklink.excluir", entity: "quick_link", entity_id: data.id, before,
    });
    return { ok: true };
  });

export const reordenarQuickLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ ordem: z.array(z.object({ id: z.string().uuid(), ordem: z.number().int() })) }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const item of data.ordem) {
      await supabaseAdmin.from("quick_links").update({ ordem: item.ordem }).eq("id", item.id);
    }
    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId, actor_email: context.claims?.email,
      action: "quicklink.reordenar", entity: "quick_link", metadata: data.ordem,
    });
    return { ok: true };
  });

// -------- Auditoria --------
export const listarAuditoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => z.object({ limit: z.number().int().min(1).max(500).default(100) }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: logs, error } = await supabaseAdmin
      .from("audit_log")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { logs: logs ?? [] };
  });

// -------- Welcome / First access --------
export const atualizarPerfilProprio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z.object({
      telefone: z.string().max(20).optional().nullable(),
      nome: z.string().min(1).max(100).optional(),
      nova_senha: z.string().min(6).max(72).optional().nullable(),
      navbar_variant: z.enum([
        "pill", "bottom-dock", "sidebar-float", "top-minimal",
        "nav-bottom-flutuante", "nav-fab-inteligente", "nav-perfil-dinamico",
        "nav-dock-animado", "nav-morphing", "nav-quick-actions", "nav-inteligente",
      ]).optional(),
      onboarding_completo: z.boolean().optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const patch: any = { atualizado_em: new Date().toISOString() };
    if (data.telefone !== undefined) patch.telefone = data.telefone;
    if (data.nome) patch.nome = data.nome;
    if (data.navbar_variant) patch.navbar_variant = data.navbar_variant;
    if (data.onboarding_completo !== undefined) patch.onboarding_completo = data.onboarding_completo;
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    if (data.nova_senha) {
      const { error: pwErr } = await context.supabase.auth.updateUser({ password: data.nova_senha });
      if (pwErr) throw new Error(pwErr.message);
    }
    return { ok: true };
  });
