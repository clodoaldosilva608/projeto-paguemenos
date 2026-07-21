// =============================================================
// ORION · OCR de relatório de vendas via Lovable AI Gateway
// =============================================================
import { createServerFn } from "@tanstack/react-start";

export interface LinhaExtraida {
  data: string; // YYYY-MM-DD
  valorVendaLiquida: number;
  qtdeClienteVendaLiquida: number;
  valorVendaRecepto: number;
  qtdeClienteRecepto: number;
}

export interface OCRResult {
  vendedorCodigo?: string;
  matricula?: string;
  vendedorNome?: string;
  linhas: LinhaExtraida[];
  aviso?: string;
}

const SYSTEM_PROMPT = `Você é um extrator de dados de relatórios de vendas por vendedor da rede Pague Menos.
Analise a imagem, que contém uma tabela "RELATÓRIO ONLINE: Venda por vendedor" com colunas:
DATA, VENDEDOR, VENDEDOR NOME, MATRICULA, VALOR VENDA LIQUIDA, QTDE CLIENTE VENDA LIQUIDA, TKM VENDA,
VALOR VENDA RECEBTO, QTDE CLIENTE RECEBTO, TKM RECEBTO, VALOR VENDA TOTAL, QTDE CLIENTE TOTAL, TKM TOTAL.

Retorne SOMENTE JSON válido (sem markdown, sem comentários) no formato:
{
  "vendedorCodigo": "00070214306",
  "matricula": "070214306",
  "vendedorNome": "CLODOALDO CONCEICAO SILVA",
  "linhas": [
    { "data": "2026-07-16", "valorVendaLiquida": 1908.96, "qtdeClienteVendaLiquida": 55, "valorVendaRecepto": 2550.38, "qtdeClienteRecepto": 3 }
  ]
}

Regras:
- Datas em formato YYYY-MM-DD (ex.: 16/07/2026 -> 2026-07-16).
- Números em ponto decimal (converter vírgula brasileira "1.908,96" -> 1908.96).
- Ignore a linha "TOTAL".
- Se um campo não existir na linha, use 0.
- Preserve a ordem visual das linhas.`;

export const extractVendasFromImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = input as { imageDataUrl?: string };
    if (!d?.imageDataUrl || typeof d.imageDataUrl !== "string") {
      throw new Error("imageDataUrl é obrigatório");
    }
    return { imageDataUrl: d.imageDataUrl };
  })
  .handler(async ({ data }): Promise<OCRResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada.");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia todas as linhas de venda desta imagem." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
      throw new Error(`Falha na IA [${resp.status}]: ${body.slice(0, 200)}`);
    }

    const json = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "";
    // Remove eventual cerca de markdown
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: OCRResult;
    try {
      parsed = JSON.parse(cleaned) as OCRResult;
    } catch {
      // Tenta encontrar bloco JSON
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("A IA não retornou JSON válido.");
      parsed = JSON.parse(m[0]) as OCRResult;
    }

    if (!Array.isArray(parsed.linhas)) parsed.linhas = [];
    parsed.linhas = parsed.linhas
      .filter((l) => l && typeof l.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.data))
      .map((l) => ({
        data: l.data,
        valorVendaLiquida: Number(l.valorVendaLiquida) || 0,
        qtdeClienteVendaLiquida: Number(l.qtdeClienteVendaLiquida) || 0,
        valorVendaRecepto: Number(l.valorVendaRecepto) || 0,
        qtdeClienteRecepto: Number(l.qtdeClienteRecepto) || 0,
      }));

    return parsed;
  });
