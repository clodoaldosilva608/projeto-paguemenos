// =============================================================
// ORION · OCR de relatório de vendas via Hugging Face
// =============================================================
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyRateLimit } from "@/lib/rate-limit";

export interface LinhaExtraida {
  data: string;
  valorVendaLiquida: number;
  qtdeClienteVendaLiquida: number;
}

export interface OCRResult {
  linhas: LinhaExtraida[];
  tabela: string[][];
  erro?: string;
}

const ocrInputSchema = z.object({
  imageDataUrl: z
    .string()
    .min(1, "imageDataUrl é obrigatório")
    .max(11_000_000, "Imagem muito grande (máx 11MB)")
    .refine(
      (v) => /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(v),
      "imageDataUrl deve ser uma imagem base64",
    ),
});

export const extractVendasFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => ocrInputSchema.parse(v))
  .handler(async ({ data }): Promise<OCRResult> => {
    await applyRateLimit(getRequest(), "ocr", 10, 60_000);

    // Ler config de IA do banco para obter a API key
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin
      .from("ai_config")
      .select("api_key_ciphertext, base_url, model, provider")
      .eq("ativo", true)
      .maybeSingle();

    if (!cfg?.api_key_ciphertext) {
      throw new Error("Nenhuma API key configurada para IA.");
    }

    const baseUrl = cfg.base_url || "https://router.huggingface.co/v1/chat/completions";
    const model = cfg.model || "Qwen/Qwen2.5-7B-Instruct";

    const { fetchWithRetry } = await import("@/lib/fetch-with-timeout");
    const resp = await fetchWithRetry(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.api_key_ciphertext}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Você é um extrator de dados de imagens de relatórios de vendas. Extraia as linhas da tabela com: data (YYYY-MM-DD), valor venda líquida, qtd clientes. Responda APENAS em JSON: {\"linhas\":[{\"data\":\"\",\"valorVendaLiquida\":0,\"qtdeClienteVendaLiquida\":0}]}",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia os dados de vendas desta imagem:" },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        max_tokens: 4000,
      }),
    }, { retries: 1, timeout: 60_000, backoff: 2000 });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Erro na IA: ${resp.status} ${txt.slice(0, 200)}`);
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || "";

    let linhas: LinhaExtraida[] = [];
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        linhas = parsed.linhas || [];
      }
    } catch {}

    return { linhas, tabela: [] };
  });
