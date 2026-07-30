import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ============================================================================
// CRUD GENÉRICO — server functions reutilizáveis para o painel /admin
// Cada entidade usa estas funções com parâmetros de tabela
// ============================================================================

async function ensureAdmin(supabase: any, userId: string) {
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
  actor_user_id: string;
  actor_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  before?: any;
  after?: any;
  metadata?: any;
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

// Whitelist de tabelas permitidas para operações CRUD no admin
const ALLOWED_TABLES = [
  "profiles", "user_roles", "companies", "members",
  "filiais", "equipes", "vendas_diarias", "metas_individuais", "campanhas",
  "invites", "treinamentos", "treinamentos_concluidos",
  "quick_links", "login_matricula",
  "ai_config", "ai_prompt_versions", "ai_logs",
  "audit_log", "integration_credentials",
];

// Tabelas que permitem criar/editar/excluir (exclui read-only como ai_logs, audit_log)
const MUTABLE_TABLES = [
  "profiles", "user_roles", "companies", "members",
  "filiais", "equipes", "vendas_diarias", "metas_individuais", "campanhas",
  "invites", "treinamentos", "treinamentos_concluidos",
  "quick_links", "login_matricula",
  "ai_config", "ai_prompt_versions",
  "integration_credentials",
];

// Tabelas que permitem exclusão em lote
const BULK_DELETABLE = [
  "profiles", "user_roles", "companies", "members",
  "filiais", "equipes", "vendas_diarias", "metas_individuais", "campanhas",
  "invites", "treinamentos", "treinamentos_concluidos",
  "quick_links", "login_matricula",
];

function validateTable(table: string, mutable: boolean = false) {
  const list = mutable ? MUTABLE_TABLES : ALLOWED_TABLES;
  if (!list.includes(table)) {
    throw new Error(`Tabela '${table}' não permitida no admin CRUD.`);
  }
}

// Schema para listagem paginada
const listSchema = z.object({
  table: z.string(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  searchColumns: z.array(z.string()).optional(),
  orderBy: z.string().optional(),
  orderDesc: z.boolean().default(false),
  filters: z.record(z.any()).optional(),
});

// LISTAR — paginação server-side + busca + ordenação + filtros
export const crudList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => listSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, page, pageSize, search, searchColumns, orderBy, orderDesc, filters } = data;
    validateTable(table, false);
    const offset = (page - 1) * pageSize;

    let query = admin.from(table).select("*", { count: "exact" });

    // Aplicar filtros
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== "") {
          if (typeof value === "string" && value.includes("%")) {
            query = query.ilike(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      }
    }

    // Aplicar busca textual
    if (search && searchColumns && searchColumns.length > 0) {
      const orClause = searchColumns
        .map((col) => `${col}.ilike.%${search}%`)
        .join(",");
      query = query.or(orClause);
    }

    // Aplicar ordenação
    if (orderBy) {
      query = query.order(orderBy, { ascending: !orderDesc });
    }

    // Paginação
    query = query.range(offset, offset + pageSize - 1);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    return {
      rows: rows || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  });

// Schema para criar
const createSchema = z.object({
  table: z.string(),
  data: z.record(z.any()),
});

// CRIAR
export const crudCreate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => createSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, data: record } = data;
    validateTable(table, true);

    const { data: created, error } = await admin
      .from(table)
      .insert(record as any)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    await logAudit(admin, {
      actor_user_id: context.userId,
      actor_email: adminProfile?.email || null,
      action: "create",
      entity: table,
      entity_id: created.id?.toString() || null,
      before: null,
      after: created,
    });

    return { row: created };
  });

// Schema para atualizar
const updateSchema = z.object({
  table: z.string(),
  id: z.string(),
  data: z.record(z.any()),
});

// ATUALIZAR
export const crudUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => updateSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, id, data: updates } = data;
    validateTable(table, true);

    const { data: before } = await admin
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { data: updated, error } = await admin
      .from(table)
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    await logAudit(admin, {
      actor_user_id: context.userId,
      actor_email: adminProfile?.email || null,
      action: "update",
      entity: table,
      entity_id: id,
      before,
      after: updated,
    });

    return { row: updated };
  });

// Schema para excluir
const deleteSchema = z.object({
  table: z.string(),
  id: z.string(),
});

// EXCLUIR
export const crudDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => deleteSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, id } = data;
    validateTable(table, true);

    const { data: before } = await admin
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    await logAudit(admin, {
      actor_user_id: context.userId,
      actor_email: adminProfile?.email || null,
      action: "delete",
      entity: table,
      entity_id: id,
      before,
      after: null,
    });

    return { ok: true };
  });

// Schema para exclusão em lote
const bulkDeleteSchema = z.object({
  table: z.string(),
  ids: z.array(z.string()).min(1).max(100),
});

// EXCLUIR EM LOTE (com rate limit)
export const crudBulkDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => bulkDeleteSchema.parse(v))
  .handler(async ({ data, context }) => {
    await applyRateLimit(
      (context as any)?.request,
      "admin-bulk-delete",
      5,
      60_000,
    );

    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, ids } = data;
    if (!BULK_DELETABLE.includes(table)) {
      throw new Error(`Tabela '${table}' não permite exclusão em lote.`);
    }

    const { data: before } = await admin
      .from(table)
      .select("*")
      .in("id", ids);

    const { error } = await admin.from(table).delete().in("id", ids);
    if (error) throw new Error(error.message);

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    await logAudit(admin, {
      actor_user_id: context.userId,
      actor_email: adminProfile?.email || null,
      action: "bulk_delete",
      entity: table,
      entity_id: ids.join(","),
      before,
      after: null,
      metadata: { count: ids.length },
    });

    return { ok: true, deleted: ids.length };
  });

// ============================================================================
// Dashboard — contadores para a página inicial do admin
// ============================================================================
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const hoje = new Date().toISOString().slice(0, 10);
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().slice(0, 10);

    // Buscar contagens em paralelo
    const [
      profilesRes, rolesRes, filiaisRes, equipesRes,
      vendasHojeRes, vendasMesRes, metasRes, campanhasRes,
      invitesPendentesRes, treinamentosRes, auditHojeRes, aiLogsRes,
    ] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("user_roles").select("role"),
      admin.from("filiais").select("id", { count: "exact", head: true }),
      admin.from("equipes").select("id", { count: "exact", head: true }),
      admin.from("vendas_diarias").select("valor_venda").eq("data", hoje),
      admin.from("vendas_diarias").select("valor_venda").gte("data", inicioMesStr),
      admin.from("metas_individuais").select("id", { count: "exact", head: true }),
      admin.from("campanhas").select("status"),
      admin.from("invites").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      admin.from("treinamentos").select("id", { count: "exact", head: true }),
      admin.from("audit_log").select("id", { count: "exact", head: true }).gte("created_at", hoje),
      admin.from("ai_logs").select("id", { count: "exact", head: true }),
    ]);

    // Processar roles
    const roles = rolesRes.data || [];
    const porPerfil = {
      admin: roles.filter((r: any) => r.role === "admin").length,
      gerente: roles.filter((r: any) => r.role === "gerente").length,
      supervisor: roles.filter((r: any) => r.role === "supervisor").length,
      vendedor: roles.filter((r: any) => r.role === "vendedor").length,
    };

    // Processar vendas
    const vendasHoje = (vendasHojeRes.data || []).reduce(
      (sum: number, v: any) => sum + Number(v.valor_venda || 0), 0
    );
    const vendasMes = (vendasMesRes.data || []).reduce(
      (sum: number, v: any) => sum + Number(v.valor_venda || 0), 0
    );

    // Processar campanhas
    const campanhas = campanhasRes.data || [];
    const campanhasAtivas = campanhas.filter((c: any) => c.status === "ativa").length;
    const campanhasRascunho = campanhas.filter((c: any) => c.status === "rascunho").length;

    return {
      usuarios: {
        total: profilesRes.count || 0,
        porPerfil,
      },
      filiais: filiaisRes.count || 0,
      equipes: equipesRes.count || 0,
      vendas: {
        hoje: vendasHoje,
        mes: vendasMes,
        totalRegistrosMes: vendasMesRes.data?.length || 0,
      },
      metas: metasRes.count || 0,
      campanhas: {
        total: campanhas.length,
        ativas: campanhasAtivas,
        rascunho: campanhasRascunho,
      },
      invitesPendentes: invitesPendentesRes.count || 0,
      treinamentos: treinamentosRes.count || 0,
      auditoriaHoje: auditHojeRes.count || 0,
      aiLogs: aiLogsRes.count || 0,
    };
  });
