import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ------------------------------------------------------------------
// Login por matrícula: recebe primeiro_nome + matricula
// Valida na tabela login_matricula e retorna o email real do usuário
// para o client fazer signInWithPassword com email + matricula (como senha)
// ------------------------------------------------------------------

export const buscarEmailPorMatricula = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
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
// CRUD de credenciais (admin/gerente gerencia; supervisor visualiza)
// ------------------------------------------------------------------

// Verifica se o usuário tem perfil admin, gerente ou supervisor (todos podem VISUALIZAR)
async function ensureGestao(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "gerente", "supervisor"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error("Acesso negado. Necessário perfil admin, gerente ou supervisor.");
}

// Verifica se o usuário pode EDITAR (admin ou gerente) — supervisor é read-only
async function ensureAdminOuGerente(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "gerente"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error("Acesso negado. Apenas admin ou gerente podem editar credenciais.");
}

// Verifica se o usuário alvo é admin — NINGUÉM pode editar/excluir credencial de admin
async function ensureTargetNaoEhAdmin(supabaseAdmin: any, targetUserId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if (data && data.length > 0)
    throw new Error(
      "Não é permitido editar ou excluir credencial de um Administrador Master. O admin faz login exclusivamente por email + senha.",
    );
}

// Lista TODOS os usuários (profiles + roles + credencial se houver)
// Retorna admin, gerente, supervisor e vendedores — todos visíveis para admin/gerente/supervisor
export const listarUsuariosComCredenciais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureGestao(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar profiles, user_roles e login_matricula em paralelo
    const [profRes, rolesRes, credsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nome, email").order("nome"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("login_matricula").select("*"),
    ]);

    if (profRes.error) throw new Error(profRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (credsRes.error) throw new Error(credsRes.error.message);

    const profiles = profRes.data || [];
    const roles = rolesRes.data || [];
    const creds = credsRes.data || [];

    const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
    const credMap = new Map(creds.map((c: any) => [c.user_id, c]));

    // Monta lista combinada: profile + role + credencial (se houver)
    const usuarios = profiles.map((p: any) => {
      const cred = credMap.get(p.id);
      return {
        user_id: p.id,
        nome: p.nome || "",
        email: p.email || "",
        role: roleMap.get(p.id) || "vendedor",
        // Campos de credencial (se existir)
        credencial_id: cred?.id || null,
        primeiro_nome: cred?.primeiro_nome || null,
        matricula: cred?.matricula || null,
        ativo: cred?.ativo ?? null,
        tem_credencial: !!cred,
      };
    });

    // Ordena: admin primeiro, depois gerente, supervisor, vendedores
    const ordemRoles: Record<string, number> = {
      admin: 0,
      gerente: 1,
      supervisor: 2,
      vendedor: 3,
    };
    usuarios.sort((a: any, b: any) => {
      const ra = ordemRoles[a.role] ?? 99;
      const rb = ordemRoles[b.role] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.nome || "").localeCompare(b.nome || "");
    });

    return { usuarios };
  });

// Mantido para compatibilidade — agora apenas chama listarUsuariosComCredenciais
export const listarCredenciais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureGestao(context.supabase, context.userId);
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
  .validator((v: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      user_id: z.string().uuid(),
      primeiro_nome: z.string().min(2).max(50),
      matricula: z.string().min(4).max(20),
      ativo: z.boolean().default(true),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await ensureAdminOuGerente(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // BLOQUEIO: ninguém pode editar/criar credencial para um admin
    await ensureTargetNaoEhAdmin(supabaseAdmin, data.user_id);

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
  .validator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdminOuGerente(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar a credencial para obter o user_id e validar que não é admin
    const { data: cred, error: credErr } = await supabaseAdmin
      .from("login_matricula")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (credErr) throw new Error(credErr.message);
    if (!cred) throw new Error("Credencial não encontrada.");

    // BLOQUEIO: ninguém pode excluir credencial de um admin
    await ensureTargetNaoEhAdmin(supabaseAdmin, cred.user_id);

    const { error } = await supabaseAdmin.from("login_matricula").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------------------------------------------------------------------
// Auto-atualização de credencial pelo próprio usuário
// Permite que o usuário troque a própria senha quando está usando credencial padrão
// ------------------------------------------------------------------

// Verifica se o usuário está usando credencial padrão (senha == matrícula)
// Retorna true se a senha atual é igual à matrícula cadastrada
export const verificarCredencialPadrao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Buscar credencial do usuário na tabela login_matricula
    const { data: cred, error } = await supabaseAdmin
      .from("login_matricula")
      .select("matricula, primeiro_nome")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Se não tem credencial por matrícula (ex: admin master), não é credencial padrão
    if (!cred) {
      return {
        temCredencial: false,
        ehPadrao: false,
        primeiroNome: null,
        matricula: null,
      };
    }

    // Verificar se a senha atual do auth é igual à matrícula
    // Buscar dados do usuário no auth
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user?.email) {
      throw new Error("Erro ao verificar credencial do usuário.");
    }

    // Tentar autenticar com a matrícula como senha — se funcionar, é credencial padrão
    const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
      email: authUser.user.email,
      password: cred.matricula,
    });

    // Se o login com a matrícula funcionou, é credencial padrão
    const ehPadrao = !signInErr && !!signInData.session;

    // Se logamos com a matrícula para testar, fazemos signOut para não poluir a sessão
    if (ehPadrao && signInData.session) {
      await supabaseAdmin.auth.signOut();
    }

    return {
      temCredencial: true,
      ehPadrao,
      primeiroNome: cred.primeiro_nome,
      matricula: cred.matricula,
    };
  });

// Permite ao usuário atualizar a própria credencial (senha + opcionalmente primeiro nome)
// Valida força da senha e atualiza no auth.users
export const atualizarPropriaCredencial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z.object({
      novaSenha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
      primeiroNome: z.string().min(2).max(50).optional(),
    }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Validações de força de senha
    const senha = data.novaSenha;
    if (!/[A-Z]/.test(senha)) throw new Error("Senha deve conter ao menos 1 letra maiúscula.");
    if (!/[a-z]/.test(senha)) throw new Error("Senha deve conter ao menos 1 letra minúscula.");
    if (!/\d/.test(senha)) throw new Error("Senha deve conter ao menos 1 número.");
    if (!/[^A-Za-z0-9]/.test(senha)) throw new Error("Senha deve conter ao menos 1 caractere especial.");

    // Não permitir que a nova senha seja igual à matrícula atual (se tiver credencial)
    const { data: cred } = await supabaseAdmin
      .from("login_matricula")
      .select("matricula")
      .eq("user_id", userId)
      .maybeSingle();

    if (cred && senha === cred.matricula) {
      throw new Error("A nova senha não pode ser igual à matrícula atual. Escolha uma senha diferente.");
    }

    // Atualizar senha no auth.users
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: senha,
    });
    if (updateErr) throw new Error("Erro ao atualizar senha: " + updateErr.message);

    // Se informou novo primeiro_nome, atualizar na tabela login_matricula
    if (data.primeiroNome && cred) {
      const { error: credErr } = await supabaseAdmin
        .from("login_matricula")
        .update({
          primeiro_nome: data.primeiroNome.trim().toLowerCase(),
          atualizado_em: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (credErr) throw new Error("Senha atualizada, mas erro ao atualizar primeiro nome: " + credErr.message);
    }

    return { ok: true };
  });
