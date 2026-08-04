import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// ============================================================================
// CRUD GENÉRICO — server functions reutilizáveis para o painel /admin
// Cada entidade usa estas funções com parâmetros de tabela
// ============================================================================

async function ensureAdmin(context: any): Promise<void> {
  // Modelo: gerente tem acesso TOTAL (igual admin) — solicitado pelo usuário em 31/07/2026.
  // Reversão do item 5 da auditoria.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["admin", "gerente"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado. Necessário perfil admin ou gerente.");
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
  "audit_log", "integrations",
];

// Tabelas que permitem criar/editar/excluir (exclui read-only como ai_logs, audit_log)
const MUTABLE_TABLES = [
  "profiles", "user_roles", "companies", "members",
  "filiais", "equipes", "vendas_diarias", "metas_individuais", "campanhas",
  "invites", "treinamentos", "treinamentos_concluidos",
  "quick_links", "login_matricula",
  "ai_config", "ai_prompt_versions",
  "integrations",
];

// Tabelas que permitem exclusão em lote
const BULK_DELETABLE = [
  "profiles", "user_roles", "companies", "members",
  "filiais", "equipes", "vendas_diarias", "metas_individuais", "campanhas",
  "invites", "treinamentos", "treinamentos_concluidos",
  "quick_links", "login_matricula",
];

// 🔒 Whitelist de colunas permitidas por tabela (Fase 3 da auditoria, 2026-08-04)
// Previne mass assignment e injeção de coluna via searchColumns/filters/data.
const ALLOWED_COLUMNS: Record<string, string[]> = {
  profiles: ["id", "nome", "email", "filial_id", "equipe_id", "company_id", "aprovado", "aprovado_por", "aprovado_em", "cargo", "telefone", "criado_em", "atualizado_em", "credencial_atualizada", "plano", "trial_expires_at", "onboarding_completo"],
  user_roles: ["id", "user_id", "role", "criado_em"],
  companies: ["id", "slug", "name", "custom_domain", "metadata", "active", "created_at", "updated_at"],
  members: ["id", "company_id", "user_uuid", "role", "created_at", "updated_at"],
  filiais: ["id", "nome", "endereco", "cidade", "estado", "telefone", "ativo", "company_id", "criado_em", "atualizado_em"],
  equipes: ["id", "nome", "filial_id", "company_id", "turno", "lider_id", "ativo", "criado_em", "atualizado_em"],
  vendas_diarias: ["id", "usuario_id", "filial_id", "equipe_id", "data", "categoria", "valor_venda", "qtd_clientes", "ticket_medio", "observacao", "criado_em", "atualizado_em"],
  metas_individuais: ["id", "usuario_id", "filial_id", "equipe_id", "periodo", "categoria", "valor_meta", "valor_realizado", "valor_projecao", "data_inicio", "status", "criado_em", "atualizado_em"],
  campanhas: ["id", "nome", "descricao", "data_inicio", "data_fim", "filial_id", "company_id", "premio", "regras", "status", "criado_em", "atualizado_em"],
  invites: ["id", "email", "token", "perfil", "filial_id", "company_id", "status", "expira_em", "criado_por", "criado_em", "aceito_por", "aceito_em"],
  treinamentos: ["id", "titulo", "descricao", "conteudo", "duracao_minutos", "categoria", "ativo", "ordem", "criado_por", "criado_em", "atualizado_em"],
  treinamentos_concluidos: ["id", "treinamento_id", "usuario_id", "concluido_em", "pontuacao"],
  quick_links: ["id", "titulo", "url", "icone", "descricao", "perfis_visiveis", "ativo", "ordem", "criado_por", "criado_em", "atualizado_em"],
  login_matricula: ["id", "user_id", "primeiro_nome", "matricula", "ativo", "criado_em", "atualizado_em"],
  ai_config: ["id", "provider", "model", "api_key_ciphertext", "base_url", "system_prompt", "temperature", "max_tokens", "ativo", "criado_em", "atualizado_em"],
  ai_prompt_versions: ["id", "config_id", "version", "prompt", "created_at", "created_by"],
  ai_logs: ["id", "user_id", "provider", "model", "input_tokens", "output_tokens", "cost", "created_at"],
  audit_log: ["id", "actor_user_id", "actor_email", "action", "entity", "entity_id", "before", "after", "metadata", "criado_em"],
  integrations: ["id", "name", "provider", "config", "ativo", "criado_em"],
};

// Tabelas que apenas admin (não gerente) pode mutar
const ADMIN_ONLY_TABLES = ["user_roles", "members", "companies", "ai_config", "ai_prompt_versions"];

function validateTable(table: string, mutable: boolean = false) {
  const list = mutable ? MUTABLE_TABLES : ALLOWED_TABLES;
  if (!list.includes(table)) {
    throw new Error(`Tabela '${table}' não permitida no admin CRUD.`);
  }
}

// 🔒 Validar que colunas informadas pelo client estão na whitelist
function validateColumns(table: string, columns: string[]) {
  const allowed = ALLOWED_COLUMNS[table];
  if (!allowed) {
    throw new Error(`Tabela '${table}' não tem whitelist de colunas definida`);
  }
  for (const col of columns) {
    if (!allowed.includes(col)) {
      throw new Error(`Coluna '${col}' não é permitida na tabela '${table}'`);
    }
  }
}

// 🔒 Verificar se o caller é admin strict (não gerente) para tabelas críticas
async function ensureAdminOnlyForTable(supabase: any, userId: string, table: string) {
  if (!ADMIN_ONLY_TABLES.includes(table)) return;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Acesso negado. Tabela '${table}' requer perfil admin (não gerente).`);
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
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, page, pageSize, search, searchColumns, orderBy, orderDesc, filters } = data;
    validateTable(table, false);

    // 🔒 Validar colunas de search e filters contra whitelist
    if (searchColumns && searchColumns.length > 0) {
      validateColumns(table, searchColumns);
    }
    if (filters) {
      validateColumns(table, Object.keys(filters));
    }
    if (orderBy) {
      validateColumns(table, [orderBy]);
    }

    const offset = (page - 1) * pageSize;

    let query = admin.from(table).select("*");

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

    // Paginação — usar limit/offset em vez de range
    query = query.limit(pageSize);
    if (offset > 0) {
      query = query.offset(offset);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Contar total separadamente
    let total = 0;
    try {
      let countQuery = admin.from(table).select("*", { count: "exact", head: true });
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (value !== null && value !== undefined && value !== "") {
            countQuery = countQuery.eq(key, value);
          }
        }
      }
      const { count } = await countQuery;
      total = count || 0;
    } catch (e) {
      total = (rows || []).length;
    }

    // Serializar manualmente para evitar erro do Seroval
    // Converter datas e valores especiais para strings
    const serializedRows = (rows || []).map((row: any) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v instanceof Date) out[k] = v.toISOString();
        else if (typeof v === "bigint") out[k] = Number(v);
        else if (v === undefined) out[k] = null;
        else out[k] = v;
      }
      return out;
    });

    return {
      rows: serializedRows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
    await ensureAdmin(context);
    // 🔒 Tabelas críticas (user_roles, members, companies, ai_config) exigem admin strict
    await ensureAdminOnlyForTable(context.supabase, context.userId, data.table);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, data: record } = data;
    validateTable(table, true);
    // 🔒 Validar colunas do payload contra whitelist
    validateColumns(table, Object.keys(record || {}));

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

    return { row: JSON.parse(JSON.stringify(created)) };
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
    await ensureAdmin(context);
    // 🔒 Tabelas críticas exigem admin strict
    await ensureAdminOnlyForTable(context.supabase, context.userId, data.table);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { table, id, data: updates } = data;
    validateTable(table, true);
    // 🔒 Validar colunas do payload contra whitelist
    validateColumns(table, Object.keys(updates || {}));

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

    return { row: JSON.parse(JSON.stringify(updated)) };
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
    await ensureAdmin(context);
    // 🔒 Tabelas críticas exigem admin strict
    await ensureAdminOnlyForTable(context.supabase, context.userId, data.table);
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

    await ensureAdmin(context);
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
    await ensureAdmin(context);
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
