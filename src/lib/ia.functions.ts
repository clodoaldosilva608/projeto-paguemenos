import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { gerarRespostaDemo } from "./ia-config.functions";

const MsgSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(4000),
});

// Prompt padrão de fallback (usado somente se não houver config no banco)
const SYSTEM_PROMPT_FALLBACK =
  "Você é o assistente IA do Orion — plataforma de gestão de metas e vendas para redes de farmácia (Pague Menos). Responda em português do Brasil, seja direto, útil e amigável.";
const ASSISTANT_PROMPT_FALLBACK =
  "Você é um assistente inteligente especializado em farmácias, gestão farmacêutica, indicadores comerciais, atendimento ao cliente, medicamentos, produtos de saúde, vendas consultivas, metas, estoque, treinamentos, liderança de equipes, gestão operacional e suporte aos colaboradores. Sempre responda de forma profissional, clara, objetiva e humanizada. Utilize exclusivamente dados reais existentes no banco de dados da aplicação. Nunca invente números. Nunca gere indicadores fictícios. Caso não existam dados suficientes, informe isso claramente.";

export const chatIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) =>
    z
      .object({
        messages: z.array(MsgSchema).min(1).max(20),
        contexto: z.string().max(2000).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Carregar configuração ativa do banco (admin pode ter alterado)
    let cfg: any = null;
    try {
      const { data: c } = await supabaseAdmin
        .from("ai_config")
        .select("*")
        .eq("ativo", true)
        .maybeSingle();
      cfg = c;
    } catch {
      // Tabela pode não existir ainda (antes da migration) — usa fallback
    }

    // 2) 🔬 MODO DEMO — sem API externa
    if (cfg?.provider === "demo" || cfg?.model?.startsWith("demo-")) {
      const t0 = Date.now();
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
      const tempo_ms = Date.now() - t0;
      const ultimaMsg = data.messages[data.messages.length - 1];
      const resposta = gerarRespostaDemo(ultimaMsg?.content || "", cfg);
      // Log de uso
      try {
        await supabaseAdmin.from("ai_logs").insert({
          user_id: context.userId,
          user_email: context.claims?.email,
          pergunta: (ultimaMsg?.content || "").slice(0, 2000),
          resposta: resposta.slice(0, 5000),
          tempo_ms,
          modelo: cfg.model,
          provedor: cfg.provider,
          status: "ok",
        });
      } catch {
        // tabela pode não existir — ignora
      }
      return { text: resposta };
    }

    // 3) Determinar chave: exclusivamente do banco (sem fallback para LOVABLE_API_KEY).
    // 🔒 Segurança: antes havia fallback para `process.env.LOVABLE_API_KEY`, o que
    // permitia que a IA funcionasse "magicamente" sem config no banco — mascarando
    // configurações faltantes e dependendo de segredo em ambiente (propenso a
    // vazamento e a erros 429/400 silenciosos). Agora, se não há chave no banco e
    // não é modo demo, lançamos um erro claro que direciona o admin para a tela
    // de Configuração da IA.
    const apiKey = cfg?.api_key_ciphertext;
    if (!apiKey) {
      throw new Error(
        "Nenhuma API key configurada. Acesse Configuração da IA no painel admin e informe uma chave válida.",
      );
    }

    // 3) Determinar endpoint, modelo e prompts
    const baseUrl = cfg?.base_url || "https://ai.gateway.lovable.dev/v1/chat/completions";
    const model = cfg?.model || "google/gemini-2.5-flash";
    const systemPrompt = cfg?.system_prompt || SYSTEM_PROMPT_FALLBACK;
    const assistantPrompt = cfg?.assistant_prompt || ASSISTANT_PROMPT_FALLBACK;

    // 4) Montar system prompt completo (system + especialização + estilo + contexto)
    const estilo = cfg
      ? `Tom: ${cfg.tom}. Nível de detalhes: ${cfg.nivel_detalhes}. Criatividade: ${cfg.criatividade}. Idioma: ${cfg.idioma}.`
      : "";
    const contexto = data.contexto ? `\n\nContexto do usuário:\n${data.contexto}` : "";

    const system = {
      role: "system" as const,
      content: `${systemPrompt}\n\n${assistantPrompt}\n\n${estilo}${contexto}`,
    };

    // 5) Headers (Anthropic usa x-api-key, demais usam Bearer)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (cfg?.provider === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    }

    const t0 = Date.now();
    let status: "ok" | "erro" = "ok";
    let errorMsg: string | null = null;
    let resposta = "";

    try {
      const resp = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [system, ...data.messages],
          temperature: cfg?.temperature != null ? Number(cfg.temperature) : 0.7,
        }),
      });

      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        status = "erro";
        errorMsg = `${resp.status}: ${t.slice(0, 200)}`;
        if (resp.status === 429)
          throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
        if (resp.status === 402)
          throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
        throw new Error(t || `Falha na IA (${resp.status})`);
      }

      const j = await resp.json();
      resposta =
        j?.choices?.[0]?.message?.content ??
        j?.content?.[0]?.text ??
        "Não consegui gerar uma resposta agora.";
      return { text: resposta };
    } catch (e: any) {
      status = "erro";
      errorMsg = e.message;
      throw e;
    } finally {
      // 6) Log de uso (apenas se a tabela existir)
      const tempo_ms = Date.now() - t0;
      try {
        const ultimaMsg = data.messages[data.messages.length - 1];
        await supabaseAdmin.from("ai_logs").insert({
          user_id: context.userId,
          user_email: context.claims?.email,
          pergunta: ultimaMsg?.content?.slice(0, 2000) || "",
          resposta: resposta?.slice(0, 5000) || null,
          tempo_ms,
          modelo: model,
          provedor: cfg?.provider || "lovable",
          status,
          erro: errorMsg,
        });
      } catch {
        // tabela pode não existir — ignora
      }
    }
  });
