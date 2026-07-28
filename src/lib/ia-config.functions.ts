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

// 🔬 Gerador de resposta demo — simula uma IA real baseada no prompt + pergunta
export function gerarRespostaDemo(pergunta: string, cfg: any): string {
  const p = pergunta.toLowerCase().trim();
  const estilo = `Tom: ${cfg.tom} | Detalhes: ${cfg.nivel_detalhes} | Idioma: ${cfg.idioma}`;

  // Respostas contextuais baseadas em palavras-chave comuns em farmácia
  if (/metas?|vendas?|faturamento/.test(p)) {
    return `[🔬 MODO DEMO — ${estilo}]\n\nPara impulsionar suas metas de vendas, recomendo focar em 3 pilares:\n\n1. **Ticket médio** — Treine a equipe para oferecer produtos complementares (cross-sell). Ex: cliente que compra vitamina → ofereça vitamina C + ômega 3.\n\n2. **Conversão** — A cada 10 clientes que entram, quantos compram? Capacite a equipe com roteiros de atendimento (Atendimento de Coração: Receber → Atender → Fidelizar).\n\n3. **Mix de produtos** — Trabalhe marcas exclusivas e genéricos com maior margem. Análise de curva ABC mensal.\n\n📊 Dica: defina metas diárias individuais (não só mensais) para criar senso de urgência e acompanhamento próximo.\n\n⚠️ Nota: Esta resposta foi gerada pelo modo demonstração. Para respostas com dados reais do seu banco, configure um provedor real (OpenAI, Anthropic, OpenRouter) no Card 3.`;
  }

  if (/treinamento|capacita/.test(p)) {
    return `[🔬 MODO DEMO — ${estilo}]\n\n**Plano de treinamento sugerido para a equipe de farmácia:**\n\n**Semanal (30 min):**\n- Revisão de metas individuais\n- Estudo de 1 categoria farmacêutica (ex: anti-hipertensivos)\n- Role-play de atendimento (Atendimento de Coração)\n\n**Mensal (2h):**\n- Análise de resultados do período\n- Treinamento de novo produto/linha\n- Workshops de vendas consultivas\n\n**Trimestral:**\n- Avaliação 360° entre pares\n- Reciclagem de boas práticas farmacêuticas\n- Atualização sobre regulamentações ANVISA\n\n⚠️ Esta resposta foi gerada pelo modo demonstração.`;
  }

  if (/estoque|inventario/.test(p)) {
    return `[🔬 MODO DEMO — ${estilo}]\n\n**Gestão de estoque em farmácia — melhores práticas:**\n\n1. **Curva ABC** — Classifique produtos por giro financeiro (A = 80% do faturamento, B = 15%, C = 5%)\n2. **Estoque mínimo** — Defina ponto de reposição por produto\n3. **Giro de estoque** — Monitore produtos parados (>90 dias sem venda)\n4. **Validade** - Alerta 90/60/30 dias antes do vencimento\n5. **Inventário rotativo** - 1 categoria por semana em vez de inventário geral anual\n\n⚠️ Modo demonstração ativo.`;
  }

  if (/cliente|atendimento|fideliza/.test(p)) {
    return `[🔬 MODO DEMO — ${estilo}]\n\n**Atendimento de Coração — metodologia Pague Menos:**\n\n**1. RECEBER** 🤝\n- Vá até o cliente (não espere vir até você)\n- Sorria e olhe nos olhos\n- Apresente-se pelo nome\n\n**2. ATENDER** 💊\n- Chame o cliente pelo nome\n- Pergunte sobre a necessidade real\n- Ofereça soluções (não apenas produtos)\n- Explique benefícios (não só features)\n\n**3. FIDELIZAR** ❤️\n- No caixa, pergunte: "Foi tudo bem?"\n- Informe descontos e programas de fidelidade\n- Acompanhe até a saída\n- "Conte sempre com a Pague Menos"\n\n⚠️ Modo demonstração ativo.`;
  }

  if (/oi|olá|ola|bom dia|boa tarde|boa noite|hello/.test(p)) {
    return `[🔬 MODO DEMO — ${estilo}]\n\nOlá! 👋 Sou o assistente IA do Orion, especializado em gestão farmacêutica da Pague Menos.\n\nPosso ajudar com:\n- 📊 Metas e indicadores de vendas\n- 👥 Gestão de equipe e treinamentos\n- 💊 Atendimento ao cliente e fidelização\n- 📦 Gestão de estoque\n- 🏪 Performance por filial\n\n⚠️ Estou rodando em modo demonstração. Configure um provedor real no Card 3 para respostas com IA generativa.`;
  }

  // Resposta padrão
  return `[🔬 MODO DEMO — ${estilo}]\n\nRecebi sua pergunta: "${pergunta}"\n\nComo estou em modo demonstração, não tenho acesso a dados reais nem a um modelo de IA generativa. Mas toda a infraestrutura está funcionando corretamente:\n\n✅ Config carregada do banco\n✅ System prompt aplicado\n✅ Especialização aplicada\n✅ Estilo aplicado (${cfg.tom})\n✅ Log registrado em ai_logs\n✅ Auditoria registrada\n\nPara respostas reais, configure um provedor no Card 3 (OpenAI, Anthropic, OpenRouter, Google Gemini) com uma chave de API válida.`;
}

// Catálogo de provedores (Card 3 + Card 4)
export const PROVIDERS = {
  demo: {
    label: "🔬 Modo Demonstração (sem API externa)",
    panel_url: "#",
    base_url: "internal://demo",
    models: ["demo-local-v1"],
  },
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
    // Endpoint OpenAI-compatível: aceita o mesmo formato de request da OpenAI
    // (POST /chat/completions com Bearer auth) e funciona globalmente, inclusive
    // de datacenters da Vercel — diferentemente do endpoint nativo Gemini que
    // retorna 400 (user location not supported) em algumas regiões.
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
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
  provider: z.enum(["demo", "lovable", "openai", "google", "anthropic", "azure", "openrouter"]),
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

    // 🔬 MODO DEMO — responde localmente sem chamar API externa
    // Detecta pelo provider=demo OU model com prefixo "demo-"
    if (cfg.provider === "demo" || cfg.model?.startsWith("demo-")) {
      const t0 = Date.now();
      await new Promise((r) => setTimeout(r, 200)); // simular latência
      const tempo_ms = Date.now() - t0;
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
        after: { status: "conectado", tempo_ms, modo: "demo" },
      });
      return {
        ok: true,
        tempo_ms,
        response_preview: "pong (modo demonstração)",
      };
    }

    // 🔒 Segurança: chave exclusivamente do banco — sem fallback para LOVABLE_API_KEY.
    // Antes, o fallback mascarava configurações faltantes e dependia de segredo em
    // ambiente (propenso a vazamento). Agora, erro claro direciona o admin.
    const apiKey = cfg.api_key_ciphertext;
    if (!apiKey) {
      return {
        ok: false,
        erro: "Nenhuma API key configurada. Acesse Configuração da IA no painel admin e informe uma chave válida.",
      };
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
  provider: z.enum(["demo", "lovable", "openai", "google", "anthropic", "azure", "openrouter"]),
  api_key: z.string().min(1).max(500),
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

    // 🔬 MODO DEMO — sempre válido sem chamar API externa
    if (data.provider === "demo" || (data.model && data.model.startsWith("demo-"))) {
      return {
        ok: true,
        mensagem: "✅ Modo demonstração ativado — nenhuma chave necessária.",
      };
    }

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

    // 🔬 MODO DEMO — gera resposta local baseada no prompt + pergunta
    if (cfg.provider === "demo" || cfg.model?.startsWith("demo-")) {
      const t0 = Date.now();
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700)); // simular latência realista
      const tempo_ms = Date.now() - t0;

      const resposta = gerarRespostaDemo(data.pergunta, cfg);

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
    }

    // 🔒 Segurança: chave exclusivamente do banco — sem fallback para LOVABLE_API_KEY.
    const apiKey = cfg.api_key_ciphertext;
    if (!apiKey) {
      return {
        ok: false,
        erro: "Nenhuma API key configurada. Acesse Configuração da IA no painel admin e informe uma chave válida.",
      };
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
