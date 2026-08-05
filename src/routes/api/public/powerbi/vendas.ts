import { createFileRoute } from "@tanstack/react-router";
import { applyRateLimit } from "@/lib/rate-limit";

// 🔒 Segurança: domínios confiáveis para CORS.
// Adicionar aqui domínios de clientes que consomem este endpoint via Power BI Service.
const ALLOWED_ORIGINS = [
  "https://orion-vendas.vercel.app",
  "https://projeto-paguemenos.vercel.app",
  // Power BI Service faz requests server-side (sem Origin header), então
  // não é afetado por CORS. Apenas browsers enviam Origin.
];

function getCorsHeader(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { "Access-Control-Allow-Origin": origin };
  }
  // Sem Origin (request server-side do Power BI) ou origem não autorizada:
  // não incluir header CORS → browser bloqueia, server-side funciona.
  return {};
}

export const Route = (createFileRoute as any)("/api/public/powerbi/vendas")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        // 🔒 Segurança: rate limit para prevenir DoS (60 req/min/IP)
        try {
          await applyRateLimit(request, "powerbi", 60, 60_000);
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
              ...getCorsHeader(request),
            },
          });
        }

        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
        const tipo = (url.searchParams.get("tipo") ?? "vendas").toLowerCase();

        if (!token) return new Response("Missing token", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Validar token na tabela powerbi_tokens.
        // 🔒 CRÍTICO: token público hardcoded "orion-public-demo" foi REMOVIDO
        //    na Fase 1 da auditoria (2026-08-04). Apenas tokens válidos na
        //    tabela powerbi_tokens são aceitos.
        let userId: string | null = null;
        let escopo = "proprio"; // default seguro: apenas próprio usuário

        try {
          const { data: tk } = await supabaseAdmin
            .from("powerbi_tokens")
            .select("id, user_id, escopo, ativo")
            .eq("token", token)
            .eq("ativo", true)
            .maybeSingle();

          if (!tk) {
            return new Response("Invalid or revoked token", { status: 401 });
          }

          // TODO (Fase 6): adicionar coluna expires_at em powerbi_tokens e
          // validar expiração aqui. Por ora, tokens ativos não expiram.
          userId = tk.user_id;
          escopo = tk.escopo || "proprio";
        } catch {
          // Tabela powerbi_tokens não existe ou erro — negar acesso (fail-closed)
          return new Response("Token validation failed", { status: 401 });
        }

        // 2. Buscar dados das vendas_diarias
        let vendasQuery = supabaseAdmin
          .from("vendas_diarias")
          .select("data, usuario_id, categoria, valor_venda, qtd_clientes");

        if (escopo === "proprio" && userId) {
          vendasQuery = vendasQuery.eq("usuario_id", userId);
        }

        const { data: vendas } = await vendasQuery.order("data", { ascending: true });

        // 3. Buscar nomes dos vendedores
        const userIds = [...new Set((vendas || []).map((v) => v.usuario_id))];
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, nome")
          .in("id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

        const nomeMap = new Map((profiles || []).map((p) => [p.id, p.nome]));

        // 4. Buscar metas_individuais
        let metasQuery = supabaseAdmin
          .from("metas_individuais")
          .select("usuario_id, categoria, periodo, valor_meta, valor_realizado, valor_projecao")
          .eq("periodo", "mensal");

        if (escopo === "proprio" && userId) {
          metasQuery = metasQuery.eq("usuario_id", userId);
        }

        const { data: metas } = await metasQuery;

        // 5. Montar rows de vendas
        const vendasRows = (vendas || []).map((v) => ({
          data: v.data,
          vendedor: nomeMap.get(v.usuario_id) || "Vendedor",
          categoria: v.categoria || "faturamento",
          valor_venda: Number(v.valor_venda || 0),
          qtd_clientes: Number(v.qtd_clientes || 0),
          ticket_medio: v.qtd_clientes > 0 ? Number(v.valor_venda) / Number(v.qtd_clientes) : 0,
        }));

        // 6. Montar rows de metas
        const metasRows = (metas || []).map((m) => ({
          vendedor: nomeMap.get(m.usuario_id) || "Vendedor",
          categoria: m.categoria,
          meta: Number(m.valor_meta || 0),
          realizado: Number(m.valor_realizado || 0),
          projecao: Number(m.valor_projecao || 0),
          pct_atingimento: m.valor_meta > 0 ? (Number(m.valor_realizado) / Number(m.valor_meta)) * 100 : 0,
        }));

        // 7. Resumo agregado para gráficos
        const totalVendas = vendasRows.reduce((s, r) => s + r.valor_venda, 0);
        const totalClientes = vendasRows.reduce((s, r) => s + r.qtd_clientes, 0);
        const totalMeta = metasRows.reduce((s, r) => s + r.meta, 0);
        const totalRealizado = metasRows.reduce((s, r) => s + r.realizado, 0);
        const totalProjecao = metasRows.reduce((s, r) => s + r.projecao, 0);

        // Vendas por dia (para gráfico de linha)
        const vendasPorDia: Record<string, number> = {};
        for (const v of vendasRows) {
          vendasPorDia[v.data] = (vendasPorDia[v.data] || 0) + v.valor_venda;
        }

        // Vendas por categoria (para gráfico de pizza)
        const vendasPorCategoria: Record<string, number> = {};
        for (const v of vendasRows) {
          vendasPorCategoria[v.categoria] = (vendasPorCategoria[v.categoria] || 0) + v.valor_venda;
        }

        // Vendas por vendedor (para gráfico de barras)
        const vendasPorVendedor: Record<string, number> = {};
        for (const v of vendasRows) {
          vendasPorVendedor[v.vendedor] = (vendasPorVendedor[v.vendedor] || 0) + v.valor_venda;
        }

        const corsHeaders = getCorsHeader(request);

        // 8. Retornar no formato solicitado
        if (format === "json") {
          const jsonData = {
            resumo: {
              total_vendas: totalVendas,
              total_clientes: totalClientes,
              total_meta: totalMeta,
              total_realizado: totalRealizado,
              total_projecao: totalProjecao,
              pct_atingimento: totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0,
              ticket_medio_geral: totalClientes > 0 ? totalVendas / totalClientes : 0,
            },
            grafico_linha: Object.entries(vendasPorDia).map(([data, valor]) => ({ data, valor })),
            grafico_pizza: Object.entries(vendasPorCategoria).map(([categoria, valor]) => ({ categoria, valor })),
            grafico_barras: Object.entries(vendasPorVendedor).map(([vendedor, valor]) => ({ vendedor, valor })),
            metas: metasRows,
            vendas: vendasRows,
            generated_at: new Date().toISOString(),
          };
          return new Response(JSON.stringify(jsonData, null, 2), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              ...corsHeaders,
            },
          });
        }

        // CSV default (vendas detalhadas)
        const header = "data,vendedor,categoria,valor_venda,qtd_clientes,ticket_medio\n";
        const csv = header + vendasRows.map((r) =>
          [r.data, csvEscape(r.vendedor), r.categoria, r.valor_venda.toFixed(2), r.qtd_clientes, r.ticket_medio.toFixed(2)].join(",")
        ).join("\n");

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="vendas-powerbi.csv"`,
            "Cache-Control": "no-store",
            ...corsHeaders,
          },
        });
      },
    },
  },
});

function csvEscape(s: string): string {
  if (s == null) return "";
  const str = String(s);
  if (/[,"\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}
