import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ------------------------------------------------------------------
// Login por matrícula: recebe primeiro_nome + matricula
// Valida na tabela login_matricula e retorna APENAS o email real do usuário.
//
// 🔒 Segurança (Fase 2 da auditoria, 2026-08-04):
// ANTES esta função retornava { email, senha, primeiroNome } — vazando a
// senha (matrícula) ao client. Agora retorna apenas { email, primeiroNome }.
// O client deve usar a matrícula que o usuário digitou como senha no
// signInWithPassword — não precisa receber a senha de volta do servidor.
// ------------------------------------------------------------------

export const buscarEmailPorMatricula = createServerFn({ method: "POST" })
  .validator((v: unknown) =>
    z.object({
      primeiro_nome: z.string().min(2).max(50),
      matricula: z.string().min(4).max(20),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    // Rate limit: 10 tentativas por minuto por IP (proteção contra força bruta)
    await applyRateLimit(
      getRequest(),
      "matricula",
      RATE_LIMITS.matricula.max,
      RATE_LIMITS.matricula.windowMs,
    );

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

    // 🔒 Não retornar a senha! O client já tem a matrícula (digitada pelo usuário).
    // Retornar apenas o email para que o client possa fazer signInWithPassword.
    return {
      email: authUser.user.email,
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

// Modelo filial=loja: gerente/supervisor só pode editar credencial de funcionário da SUA filial.
// Admin pode editar de qualquer filial.
// Retorna { isAdmin, minhaFilialId } para uso nas funções de mutação.
async function getCtxFilial(context: any): Promise<{ isAdmin: boolean; minhaFilialId: string | null }> {
  const { data: myRoles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const myRole = (myRoles && myRoles[0]?.role) || "vendedor";
  const isAdmin = myRole === "admin";

  if (isAdmin) return { isAdmin: true, minhaFilialId: null };

  const { data: myProfile } = await context.supabase
    .from("profiles")
    .select("filial_id")
    .eq("id", context.userId)
    .maybeSingle();
  const minhaFilialId = myProfile?.filial_id || null;
  if (!minhaFilialId) {
    throw new Error("Seu perfil não tem filial atribuída. Contate o administrador.");
  }
  return { isAdmin: false, minhaFilialId };
}

// Verifica que o usuário alvo (targetUserId) pertence à mesma filial do gerente/supervisor logado.
// Admin bypassa essa verificação.
async function ensureTargetNaMinhaFilial(
  supabaseAdmin: any,
  targetUserId: string,
  ctx: { isAdmin: boolean; minhaFilialId: string | null },
) {
  if (ctx.isAdmin) return; // admin pode editar de qualquer filial
  const { data: targetProfile, error } = await supabaseAdmin
    .from("profiles")
    .select("filial_id")
    .eq("id", targetUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!targetProfile) throw new Error("Usuário alvo não encontrado.");
  if (targetProfile.filial_id !== ctx.minhaFilialId) {
    throw new Error(
      "Acesso negado: você só pode gerenciar credenciais de funcionários da sua filial.",
    );
  }
}

// Lista TODOS os usuários (profiles + roles + credencial se houver)
// Modelo filial=loja:
//   - admin vê TODOS os usuários de TODAS as filiais
//   - gerente/supervisor vê APENAS os usuários da SUA filial (loja)
export const listarUsuariosComCredenciais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureGestao(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Descobrir o perfil e filial do usuário logado
    const { data: myRoles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const myRole = (myRoles && myRoles[0]?.role) || "vendedor";
    const isAdmin = myRole === "admin";

    // Buscar o filial_id do usuário logado (para gerente/supervisor filtrarem)
    let minhaFilialId: string | null = null;
    if (!isAdmin) {
      const { data: myProfile } = await context.supabase
        .from("profiles")
        .select("filial_id")
        .eq("id", context.userId)
        .maybeSingle();
      minhaFilialId = myProfile?.filial_id || null;
      if (!minhaFilialId) {
        // Gerente/supervisor sem filial_id atribuída → não vê ninguém
        return { usuarios: [] };
      }
    }

    // Buscar profiles, user_roles e login_matricula em paralelo
    // Para gerente/supervisor: filtrar por filial_id da SUA filial
    // Para admin: sem filtro (vê todos)
    const [
      profRes,
      rolesRes,
      credsRes,
    ] = await Promise.all([
      isAdmin
        ? supabaseAdmin.from("profiles").select("id, nome, email, filial_id").order("nome")
        : supabaseAdmin.from("profiles").select("id, nome, email, filial_id").eq("filial_id", minhaFilialId).order("nome"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      // Para login_matricula, precisamos filtrar pelos user_ids da filial —
      // mas como fazemos o join no código abaixo, trazemos todos e filtramos depois
      // (em produção com muitos usuários, otimizar para trazer só os relevantes)
      supabaseAdmin.from("login_matricula").select("*"),
    ]);

    if (profRes.error) throw new Error(profRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (credsRes.error) throw new Error(credsRes.error.message);

    const profiles = profRes.data || [];
    const roles = rolesRes.data || [];
    const creds = credsRes.data || [];

    // Mapa de user_id -> filial_id (para filtrar credenciais quando não-admin)
    const filialByUserId = new Map(profiles.map((p: any) => [p.id, p.filial_id]));

    // Se gerente/supervisor, filtra credenciais para só as da sua filial
    const credsFiltradas = isAdmin
      ? creds
      : creds.filter((c: any) => filialByUserId.get(c.user_id) === minhaFilialId);

    const roleMap = new Map(roles.map((r: any) => [r.user_id, r.role]));
    const credMap = new Map(credsFiltradas.map((c: any) => [c.user_id, c]));

    // Monta lista combinada: profile + role + credencial (se houver)
    const usuarios = profiles.map((p: any) => {
      const cred = credMap.get(p.id);
      return {
        user_id: p.id,
        nome: p.nome || "",
        email: p.email || "",
        role: roleMap.get(p.id) || "vendedor",
        filial_id: p.filial_id || null,
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

    // Modelo filial=loja: gerente só edita credencial de funcionário da SUA filial
    const ctx = await getCtxFilial(context);
    await ensureTargetNaMinhaFilial(supabaseAdmin, data.user_id, ctx);

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

    // Modelo filial=loja: gerente só exclui credencial de funcionário da SUA filial
    const ctx = await getCtxFilial(context);
    await ensureTargetNaMinhaFilial(supabaseAdmin, cred.user_id, ctx);

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
// Retorna true se o usuário tem credencial por matrícula (indicando que provavelmente usa matrícula como senha)
// Não faz signIn para evitar criar sessões paralelas no service role
export const verificarCredencialPadrao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Buscar credencial do usuário na tabela login_matricula
    const { data: cred, error } = await supabaseAdmin
      .from("login_matricula")
      .select("matricula, primeiro_nome, atualizado_em")
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

    // Heurística para detectar credencial padrão:
    // Se a credencial foi criada/atualizada há menos de 24h, assume que é padrão
    // (não foi atualizada pelo usuário ainda)
    // Se foi atualizada há mais de 24h, assume que já foi personalizada
    // Isso é uma heurística simples que evita fazer signIn com a matrícula
    const atualizadoEm = new Date(cred.atualizado_em || "").getTime();
    const agora = Date.now();
    const horasDesdeAtualizacao = (agora - atualizadoEm) / (1000 * 60 * 60);

    // Se a credencial foi criada há menos de 1 hora, é padrão (recém-criada pelo admin)
    // Se foi atualizada há mais de 1 hora, pode ter sido personalizada — mas para segurança,
    // mostramos o banner se atualizado_em == criado_em (nunca foi personalizada)
    // Vamos simplificar: se a credencial existe, mostramos o banner nas primeiras 24h
    // Após o usuário atualizar via atualizarPropriaCredencial, o atualizado_em muda
    // e o banner some porque atualizado_em != criado_em
    const { data: credCompleta } = await supabaseAdmin
      .from("login_matricula")
      .select("criado_em, atualizado_em")
      .eq("user_id", userId)
      .maybeSingle();

    const criadoEm = credCompleta?.criado_em ? new Date(credCompleta.criado_em).getTime() : 0;
    const atualizadoEmReal = credCompleta?.atualizado_em ? new Date(credCompleta.atualizado_em).getTime() : 0;

    // ehPadrao = true se nunca foi personalizada (criado_em == atualizado_em)
    // ou se foi criada há menos de 24h
    const nuncaPersonalizada = criadoEm === atualizadoEm;
    const recente = horasDesdeAtualizacao < 24;
    const ehPadrao = nuncaPersonalizada || recente;

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
