import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
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

async function logAudit(
  admin: any,
  params: {
    actor_user_id: string;
    actor_email?: string | null;
    action: string;
    entity: string;
    entity_id?: string | null;
    before?: any;
    after?: any;
  },
) {
  try {
    await admin.from("audit_log").insert({
      actor_user_id: params.actor_user_id,
      actor_email: params.actor_email ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
    });
  } catch (e) {
    console.error("[audit] falha ao registrar", e);
  }
}

// Mascarar chave: mostrar só os últimos 4 caracteres
function maskApiKey(key: string | null | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return "•".repeat(8) + key.slice(-4);
}

// Catálogo de provedores (Card 3 + Card 4)
export const PROVIDERS = {
  lovable: {
    label: "Lovable (gateway padrão)",
    panel_url: "https://lovable.dev",
    base_url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    models: [
      "google/gemini-2.5-flash",
      "openai/gpt-4o-mini",
      "openai/gpt-4o",
      "anthropic/claude-3-5-sonnet",
    ],
  },
  openai: {
    label: "OpenAI",
    panel_url: "https://platform.openai.com/api-keys",
    base_url: "https://api.openai.com/v1/chat/completions",
    models: ["gpt-4.1", "gpt-4o", "gpt-4o-mini", "gpt-5", "gpt-5.5", "o1-preview", "o1-mini"],
  },
  google: {
    label: "Google Gemini",
    panel_url: "https://aistudio.google.com/app/apikey",
    base_url: "https://generativelanguage.googleapis.com/v1beta/chat/completions",
    models: [
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ],
  },
  anthropic: {
    label: "Anthropic Claude",
    panel_url: "https://console.anthropic.com/settings/keys",
    base_url: "https://api.anthropic.com/v1/messages",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ],
  },
  azure: {
    label: "Azure OpenAI",
    panel_url:
      "https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI",
    base_url: "",
    models: ["gpt-4", "gpt-4-32k", "gpt-35-turbo", "gpt-4o", "gpt-4o-mini"],
  },
  openrouter: {
    label: "OpenRouter",
    panel_url: "https://openrouter.ai/keys",
    base_url: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.1-70b-instruct",
    ],
  },
} as const;

export type AIProvider = keyof typeof PROVIDERS;

// ------------------------------------------------------------------
// 1) Obter config ativa (Card 1 + Cards 2-7)
// ------------------------------------------------------------------
export const obterIAConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("ai_config")
      .select("*")
      .eq("ativo", true)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Mascarar a chave antes de retornar ao cliente
    const safe = data ? { ...data, api_key_ciphertext: maskApiKey(data.api_key_ciphertext) } : null;

    return { config: safe };
  });

// ------------------------------------------------------------------
// 2) Salvar config (Card 2-7)
// ------------------------------------------------------------------
const configSchema = z.object({
  provider: z.enum(["lovable", "openai", "google", "anthropic", "azure", "openrouter"]),
  model: z.string().min(1).max(120),
  base_url: z.string().max(500).optional(),
  provider_panel_url: z.string().max(500).optional(),
  api_key: z.string().max(500).optional().nullable(),
  system_prompt: z.string().max(10000),
  assistant_prompt: z.string().max(10000),
  tom: z.enum([
    "profissional",
    "farmaceutico",
    "consultivo",
    "empatico",
    "objetivo",
    "comercial",
    "tecnico",
    "humanizado",
  ]),
  nivel_detalhes: z.enum(["baixo", "medio", "alto"]),
  criatividade: z.enum(["baixa", "media", "alta"]),
  temperature: z.number().min(0).max(2),
  idioma: z.string().max(10),
  restaurar_padrao: z.boolean().optional(),
});

export const salvarIAConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => configSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Buscar config atual (para before + id)
    const { data: current } = await supabaseAdmin
      .from("ai_config")
      .select("*")
      .eq("ativo", true)
      .maybeSingle();

    const before = current
      ? { ...current, api_key_ciphertext: maskApiKey(current.api_key_ciphertext) }
      : null;

    // Restaurar padrão
    const systemPromptPadrao =
      "Você é o assistente IA do Orion — plataforma de gestão de metas e vendas para redes de farmácia (Pague Menos). Responda em português do Brasil, seja direto, útil e amigável. Ofereça sugestões práticas para: aumentar ticket médio, atingir metas mensais, motivar equipes, organizar rotina do vendedor, analisar performance por filial e trabalhar campanhas.";

    const assistantPromptPadrao = `Você é um assistente inteligente especializado em farmácias, gestão farmacêutica, indicadores comerciais, atendimento ao cliente, medicamentos, produtos de saúde, vendas consultivas, metas, estoque, treinamentos, liderança de equipes, gestão operacional e suporte aos colaboradores.

Sempre responda de forma profissional, clara, objetiva e humanizada.

Utilize exclusivamente dados reais existentes no banco de dados da aplicação.

Nunca invente números.

Nunca gere indicadores fictícios.

Nunca apresente exemplos simulados em ambiente de produção.

Caso não existam dados suficientes, informe isso claramente.

Sempre priorize boas práticas farmacêuticas, excelência no atendimento, melhoria contínua e apoio à tomada de decisão.`;

    // Determinar provider base + panel_url automaticamente
    const prov = PROVIDERS[data.provider as AIProvider];
    const base_url = data.base_url || prov.base_url;
    const panel_url = data.provider_panel_url || prov.panel_url;

    const payload: any = {
      provider: data.provider,
      model: data.model,
      base_url,
      provider_panel_url: panel_url,
      system_prompt: data.restaurar_padrao ? systemPromptPadrao : data.system_prompt,
      assistant_prompt: data.restaurar_padrao ? assistantPromptPadrao : data.assistant_prompt,
      tom: data.tom,
      nivel_detalhes: data.nivel_detalhes,
      criatividade: data.criatividade,
      temperature: data.temperature,
      idioma: data.idioma,
      atualizado_por: context.userId,
      atualizado_em: new Date().toISOString(),
    };

    // Só atualizar chave se vier uma chave nova (não mascarada)
    if (data.api_key && !data.api_key.startsWith("•")) {
      payload.api_key_ciphertext = data.api_key;
    }

    let result;
    if (current?.id) {
      // UPDATE
      const { data: updated, error } = await supabaseAdmin
        .from("ai_config")
        .update(payload)
        .eq("id", current.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      result = updated;

      // Versionar prompt (Card 5 — Histórico)
      await supabaseAdmin.from("ai_prompt_versions").insert({
        config_id: current.id,
        system_prompt: payload.system_prompt,
        assistant_prompt: payload.assistant_prompt,
        criado_por: context.userId,
        observacao: data.restaurar_padrao ? "Restaurado para padrão" : "Atualização manual",
      });
    } else {
      // INSERT (primeira vez)
      payload.criado_por = context.userId;
      const { data: created, error } = await supabaseAdmin
        .from("ai_config")
        .insert({ ...payload, ativo: true })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      result = created;

      await supabaseAdmin.from("ai_prompt_versions").insert({
        config_id: created.id,
        system_prompt: payload.system_prompt,
        assistant_prompt: payload.assistant_prompt,
        criado_por: context.userId,
        observacao: "Configuração inicial",
      });
    }

    await logAudit(supabaseAdmin, {
      actor_user_id: context.userId,
      actor_email: context.claims?.email,
      action: "ia_config.atualizar",
      entity: "ai_config",
      entity_id: result.id,
      before,
      after: { ...result, api_key_ciphertext: maskApiKey(result.api_key_ciphertext) },
    });

    return {
      ok: true,
      config: { ...result, api_key_ciphertext: maskApiKey(result.api_key_ciphertext) },
    };
  });

// ------------------------------------------------------------------
// 3) Testar conexão (Card 1 — botão Testar Conexão)
// ------------------------------------------------------------------
export const testarConexaoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cfg } = await supabaseAdmin
      .from("ai_config")
      .select("*")
      .eq("ativo", true)
      .maybeSingle();

    if (!cfg) {
      return { ok: false, erro: "Nenhuma configuração ativa encontrada." };
    }

    const apiKey = cfg.api_key_ciphertext || process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, erro: "Nenhuma API key configurada nem LOVABLE_API_KEY no ambiente." };
    }

    const t0 = Date.now();
    try {
      const resp = await fetch(cfg.base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(cfg.provider === "anthropic"
            ? { "anthropic-version": "2023-06-01", "x-api-key": apiKey }
            : {}),
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: "system", content: cfg.system_prompt },
            { role: "user", content: "ping — responda apenas 'pong'" },
          ],
          max_tokens: 20,
        }),
      });

      const tempo_ms = Date.now() - t0;
      const txt = await resp.text();

      if (!resp.ok) {
        // Atualizar status para erro
        await supabaseAdmin
          .from("ai_config")
          .update({
            status: "erro",
            last_error: `${resp.status}: ${txt.slice(0, 200)}`,
            last_validation: new Date().toISOString(),
            last_tested_by: context.userId,
          })
          .eq("id", cfg.id);

        return { ok: false, erro: `${resp.status}: ${txt.slice(0, 300)}`, tempo_ms };
      }

      // Sucesso
      await supabaseAdmin
        .from("ai_config")
        .update({
          status: "conectado",
          last_error: null,
          last_validation: new Date().toISOString(),
          last_tested_by: context.userId,
        })
        .eq("id", cfg.id);

      await logAudit(supabaseAdmin, {
        actor_user_id: context.userId,
        actor_email: context.claims?.email,
        action: "ia_config.testar_conexao",
        entity: "ai_config",
        entity_id: cfg.id,
        after: { status: "conectado", tempo_ms },
      });

      return { ok: true, tempo_ms, response_preview: txt.slice(0, 200) };
    } catch (e: any) {
      const tempo_ms = Date.now() - t0;
      await supabaseAdmin
        .from("ai_config")
        .update({
          status: "erro",
          last_error: e.message,
          last_validation: new Date().toISOString(),
          last_tested_by: context.userId,
        })
        .eq("id", cfg.id);

      return { ok: false, erro: e.message, tempo_ms };
    }
  });

// ------------------------------------------------------------------
// 4) Validar chave (Card 2 — botão Validar)
// ------------------------------------------------------------------
const validarChaveSchema = z.object({
  provider: z.enum(["lovable", "openai", "google", "anthropic", "azure", "openrouter"]),
  api_key: z.string().min(10).max(500),
  base_url: z.string().optional(),
  model: z.string().optional(),
});

export const validarChaveIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => validarChaveSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);

    const prov = PROVIDERS[data.provider as AIProvider];
    const base_url = data.base_url || prov.base_url;
    const model = data.model || prov.models[0];

    if (!base_url) {
      return { ok: false, erro: "URL base não configurada para este provedor." };
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.api_key}`,
      };
      if (data.provider === "anthropic") {
        headers["x-api-key"] = data.api_key;
        headers["anthropic-version"] = "2023-06-01";
      }

      const resp = await fetch(base_url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 10,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        return { ok: false, erro: `${resp.status}: ${txt.slice(0, 300)}` };
      }

      return { ok: true, mensagem: "Chave válida — conexão estabelecida com sucesso." };
    } catch (e: any) {
      return { ok: false, erro: e.message };
    }
  });

// ------------------------------------------------------------------
// 5) Chat de teste (Card 8)
// ------------------------------------------------------------------
const testeSchema = z.object({
  pergunta: z.string().min(1).max(2000),
});

export const testarChatIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => testeSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cfg } = await supabaseAdmin
      .from("ai_config")
      .select("*")
      .eq("ativo", true)
      .maybeSingle();

    if (!cfg) {
      return { ok: false, erro: "Nenhuma configuração ativa encontrada." };
    }

    const apiKey = cfg.api_key_ciphertext || process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, erro: "Nenhuma API key configurada." };
    }

    const t0 = Date.now();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      if (cfg.provider === "anthropic") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      }

      // Montar prompt completo (system + especialização + estilo)
      const estilo = `Tom: ${cfg.tom}. Nível de detalhes: ${cfg.nivel_detalhes}. Criatividade: ${cfg.criatividade}. Idioma: ${cfg.idioma}.`;

      const resp = await fetch(cfg.base_url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            {
              role: "system",
              content: `${cfg.system_prompt}\n\n${cfg.assistant_prompt}\n\n${estilo}`,
            },
            { role: "user", content: data.pergunta },
          ],
          temperature: Number(cfg.temperature),
        }),
      });

      const tempo_ms = Date.now() - t0;
      const txt = await resp.text();

      if (!resp.ok) {
        // Log de erro
        await supabaseAdmin.from("ai_logs").insert({
          user_id: context.userId,
          user_email: context.claims?.email,
          pergunta: data.pergunta,
          resposta: null,
          tempo_ms,
          modelo: cfg.model,
          provedor: cfg.provider,
          status: "erro",
          erro: `${resp.status}: ${txt.slice(0, 200)}`,
        });

        return { ok: false, erro: `${resp.status}: ${txt.slice(0, 300)}`, tempo_ms };
      }

      const j = JSON.parse(txt);
      const resposta = j?.choices?.[0]?.message?.content ?? j?.content?.[0]?.text ?? "Sem resposta";

      await supabaseAdmin.from("ai_logs").insert({
        user_id: context.userId,
        user_email: context.claims?.email,
        pergunta: data.pergunta,
        resposta,
        tempo_ms,
        modelo: cfg.model,
        provedor: cfg.provider,
        status: "ok",
      });

      return {
        ok: true,
        resposta,
        tempo_ms,
        modelo: cfg.model,
        provedor: cfg.provider,
      };
    } catch (e: any) {
      const tempo_ms = Date.now() - t0;
      await supabaseAdmin.from("ai_logs").insert({
        user_id: context.userId,
        user_email: context.claims?.email,
        pergunta: data.pergunta,
        resposta: null,
        tempo_ms,
        modelo: cfg?.model ?? null,
        provedor: cfg?.provider ?? null,
        status: "erro",
        erro: e.message,
      });
      return { ok: false, erro: e.message, tempo_ms };
    }
  });

// ------------------------------------------------------------------
// 6) Listar logs (Card 9)
// ------------------------------------------------------------------
const logsSchema = z.object({
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
  busca: z.string().optional(),
  status: z.enum(["ok", "erro", "timeout", "rate_limit"]).optional(),
});

export const listarIALogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => logsSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("ai_logs")
      .select("*", { count: "exact" })
      .order("criado_em", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.busca) {
      q = q.or(
        `pergunta.ilike.%${data.busca}%,resposta.ilike.%${data.busca}%,user_email.ilike.%${data.busca}%`,
      );
    }
    if (data.status) {
      q = q.eq("status", data.status);
    }

    const { data: logs, error, count } = await q;
    if (error) throw new Error(error.message);

    return { logs: logs ?? [], total: count ?? 0 };
  });

// ------------------------------------------------------------------
// 7) Exportar logs (Card 9 — Exportação)
// ------------------------------------------------------------------
export const exportarIALogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: logs, error } = await supabaseAdmin
      .from("ai_logs")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(5000);

    if (error) throw new Error(error.message);

    // CSV
    const headers = [
      "data",
      "usuario",
      "pergunta",
      "resposta",
      "tempo_ms",
      "modelo",
      "provedor",
      "status",
      "erro",
    ];
    const rows = (logs ?? []).map((l: any) => [
      l.criado_em,
      l.user_email || "",
      (l.pergunta || "").replace(/"/g, '""'),
      (l.resposta || "").replace(/"/g, '""'),
      l.tempo_ms ?? "",
      l.modelo || "",
      l.provedor || "",
      l.status || "",
      (l.erro || "").replace(/"/g, '""'),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

    return { csv };
  });

// ------------------------------------------------------------------
// 8) Histórico de versões de prompt (Card 5 — Histórico)
// ------------------------------------------------------------------
export const listarPromptHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: versoes, error } = await supabaseAdmin
      .from("ai_prompt_versions")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return { versoes: versoes ?? [] };
  });

// ------------------------------------------------------------------
// 9) Permissões — quem pode editar/visualizar (Card 10)
// ------------------------------------------------------------------
const permSchema = z.object({
  perfis_editores: z.array(z.string()).default(["admin"]),
  perfis_visualizadores: z.array(z.string()).default(["admin", "gerente"]),
});

export const obterIAPermissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Permissões fixas — só admin edita, admin+gerente visualizam
    // Em futuro pode virar tabela dedicada
    return {
      perfis_editores: ["admin"],
      perfis_visualizadores: ["admin", "gerente"],
      pode_editar_quem: ["admin"],
      auditoria_habilitada: true,
    };
  });
