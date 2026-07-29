import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { gerarRespostaDemo } from "./ia-config.functions";

// Schema que aceita content como string OU array (para imagens)
const MsgSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.union([
    z.string().min(1).max(4000),
    z.array(z.union([
      z.object({
        type: z.literal("text"),
        text: z.string().min(1).max(4000),
      }),
      z.object({
        type: z.literal("image_url"),
        image_url: z.object({
          url: z.string().min(1).max(500000),
        }),
      }),
    ])).min(1).max(5),
  ]),
});

const SYSTEM_PROMPT_FALLBACK =
  "Você é o assistente IA do Orion — plataforma de gestão de metas e vendas para redes de farmácia (Pague Menos). Responda em português do Brasil, seja direto, útil e amigável.";
const ASSISTANT_PROMPT_FALLBACK =
  "Você é um assistente inteligente especializado em farmácias, gestão farmacêutica, indicadores comerciais, atendimento ao cliente, medicamentos, produtos de saúde, vendas consultivas, metas, estoque, treinamentos, liderança de equipes, gestão operacional e suporte aos colaboradores. Sempre responda de forma profissional, clara, objetiva e humanizada. Utilize exclusivamente dados reais existentes no banco de dados da aplicação. Nunca invente números. Nunca gere indicadores fictícios. Caso não existam dados suficientes, informe isso claramente. Quando receber uma imagem (foto de cupom fiscal, nota, comprovante), analise os dados visíveis e extraia: valor total, quantidade de itens/clientes, data, e categorize se possível. Formate a resposta como comando de venda se detectar valores.";

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

    // 1) Carregar configuração ativa do banco
    let cfg: any = null;
    try {
      const { data: c } = await supabaseAdmin
        .from("ai_config")
        .select("*")
        .eq("ativo", true)
        .maybeSingle();
      cfg = c;
    } catch {}

    // 2) MODO DEMO — sem API externa
    if (cfg?.provider === "demo" || cfg?.model?.startsWith("demo-")) {
      const t0 = Date.now();
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
      const tempo_ms = Date.now() - t0;
      const ultimaMsg = data.messages[data.messages.length - 1];
      // Para demo, extrair texto da mensagem (mesmo se for array com imagem)
      const textoPergunta = typeof ultimaMsg?.content === "string"
        ? ultimaMsg.content
        : Array.isArray(ultimaMsg?.content)
          ? ((ultimaMsg.content as any[]).find((c: any) => c.type === "text")?.text || "") + " [imagem]"
          : "";
      const resposta = gerarRespostaDemo(textoPergunta, cfg);
      try {
        await supabaseAdmin.from("ai_logs").insert({
          user_id: context.userId,
          user_email: context.claims?.email,
          pergunta: textoPergunta.slice(0, 2000),
          resposta: resposta.slice(0, 5000),
          tempo_ms,
          modelo: cfg.model,
          provedor: cfg.provider,
          status: "ok",
        });
      } catch {}
      return { text: resposta };
    }

    // 3) Chave do banco
    const apiKey = cfg?.api_key_ciphertext;
    if (!apiKey) {
      throw new Error(
        "Nenhuma API key configurada. Acesse Configuração da IA no painel admin e informe uma chave válida.",
      );
    }

    // 4) Endpoint, modelo e prompts
    const baseUrl = cfg?.base_url || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const model = cfg?.model || "gemini-flash-latest";
    const systemPrompt = cfg?.system_prompt || SYSTEM_PROMPT_FALLBACK;
    const assistantPrompt = cfg?.assistant_prompt || ASSISTANT_PROMPT_FALLBACK;

    // 5) Montar system prompt
    const estilo = cfg
      ? `Tom: ${cfg.tom}. Nível de detalhes: ${cfg.nivel_detalhes}. Criatividade: ${cfg.criatividade}. Idioma: ${cfg.idioma}.`
      : "";
    const contexto = data.contexto ? `\n\nContexto do usuário:\n${data.contexto}` : "";

    const system = {
      role: "system" as const,
      content: `${systemPrompt}\n\n${assistantPrompt}\n\n${estilo}${contexto}`,
    };

    // 6) Headers
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

    // 7) Extrair texto da última mensagem para log
    const ultimaMsg = data.messages[data.messages.length - 1];
    const textoPerguntaLog = typeof ultimaMsg?.content === "string"
      ? ultimaMsg.content
      : Array.isArray(ultimaMsg?.content)
        ? ultimaMsg.content.map((c: any) => c.type === "text" ? c.text : "[imagem]").join(" ")
        : "";

    try {
      const resp = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [system, ...data.messages],
          temperature: cfg?.temperature != null ? Number(cfg.temperature) : 0.7,
          // max_tokens para respostas mais longas com análise de imagem
          max_tokens: 2000,
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
      const tempo_ms = Date.now() - t0;
      try {
        await supabaseAdmin.from("ai_logs").insert({
          user_id: context.userId,
          user_email: context.claims?.email,
          pergunta: textoPerguntaLog.slice(0, 2000),
          resposta: resposta?.slice(0, 5000) || null,
          tempo_ms,
          modelo: model,
          provedor: cfg?.provider || "google",
          status,
          erro: errorMsg,
        });
      } catch {}
    }
  });
