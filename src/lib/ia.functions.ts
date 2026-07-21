import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MsgSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const chatIA = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) =>
    z.object({
      messages: z.array(MsgSchema).min(1).max(20),
      contexto: z.string().max(2000).optional(),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente no servidor.");

    const system = {
      role: "system" as const,
      content: `Você é o assistente IA do Orion — plataforma de gestão de metas e vendas para redes de farmácia (Extrafarma / Pague Menos). Responda em português do Brasil, seja direto, útil e amigável. Ofereça sugestões práticas para: aumentar ticket médio, atingir metas mensais, motivar equipes, organizar rotina do vendedor, analisar performance por filial e trabalhar campanhas.${data.contexto ? `\n\nContexto do usuário:\n${data.contexto}` : ""}`,
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [system, ...data.messages],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao workspace.");
      throw new Error(t || `Falha na IA (${resp.status})`);
    }
    const j = await resp.json();
    const text: string = j?.choices?.[0]?.message?.content ?? "Não consegui gerar uma resposta agora.";
    return { text };
  });
