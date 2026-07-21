import { createFileRoute } from "@tanstack/react-router";

export const Route = (createFileRoute as any)("/api/public/powerbi/vendas")({

  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {


        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
        if (!token) return new Response("Missing token", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Valida token
        const { data: tk, error: tkErr } = await supabaseAdmin
          .from("powerbi_tokens")
          .select("id, user_id, escopo, ativo")
          .eq("token", token)
          .maybeSingle();
        if (tkErr || !tk || !tk.ativo) {
          return new Response("Invalid or revoked token", { status: 401 });
        }
        await supabaseAdmin.from("powerbi_tokens").update({ ultimo_uso_em: new Date().toISOString() }).eq("id", tk.id);

        // 2. Resolve dono e escopo
        const { data: dono } = await supabaseAdmin
          .from("profiles").select("id, nome, filial_id, equipe_id").eq("id", tk.user_id).maybeSingle();

        // 3. Carrega vendas do backend (Sheet configurado). Se não houver, retorna vazio com cabeçalhos.
        //    Como o app usa vendasStore local, o endpoint reflete a última sync persistida em sheet_sync_config.
        //    Buscamos o CSV mais recente diretamente do Google Sheets configurado.
        let rows: Array<{ data: string; vendedor: string; filial: string; valor_liquido: number; clientes_liquido: number; ticket_medio: number }> = [];
        const { data: cfg } = await supabaseAdmin
          .from("sheet_sync_config").select("*").eq("ativo", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (cfg?.sheet_name) {
          try {
            const res = await fetch(cfg.sheet_name as string, { headers: { Accept: "text/csv" } });
            if (res.ok) {
              const text = await res.text();
              rows = parseSheetCSV(text, dono?.nome ?? "");
            }
          } catch { /* segue vazio */ }
        }

        // Filtra por escopo
        if (tk.escopo === "proprio" && dono?.nome) {
          const nome = dono.nome.toLowerCase().split(" ")[0];
          rows = rows.filter((r) => r.vendedor.toLowerCase().includes(nome));
        }

        if (format === "json") {
          return new Response(JSON.stringify({ rows, count: rows.length, generated_at: new Date().toISOString() }), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }

        // CSV default
        const header = "data,vendedor,filial,valor_liquido,clientes_liquido,ticket_medio\n";
        const csv = header + rows.map((r) =>
          [r.data, csvEscape(r.vendedor), csvEscape(r.filial), r.valor_liquido.toFixed(2), r.clientes_liquido, r.ticket_medio.toFixed(2)].join(",")
        ).join("\n");

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="vendas.csv"`,
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
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

function parseSheetCSV(text: string, _dono: string) {
  const rows: string[][] = []; let cur: string[] = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c !== "\r") field += c;
    }
  }
  if (field || cur.length) { cur.push(field); rows.push(cur); }
  const filtered = rows.filter((r) => r.some((v) => v !== ""));
  if (filtered.length === 0) return [];
  const headers = filtered[0].map((h) => h.trim().toLowerCase());
  const idx = (k: string) => headers.findIndex((h) => h === k);
  const iD = idx("data"), iV = idx("vendedor"), iF = idx("filial"), iL = idx("valor_liquido"), iQ = idx("clientes_liquido");
  const num = (s: string) => { const n = Number(String(s ?? "").replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "")); return Number.isFinite(n) ? n : 0; };
  const iso = (s: string) => { const t = (s ?? "").trim(); if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10); const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t); return m ? `${m[3]}-${m[2]}-${m[1]}` : t; };
  return filtered.slice(1).map((r) => {
    const valor = num(r[iL] ?? "0");
    const qtd = iQ >= 0 ? Math.trunc(num(r[iQ] ?? "0")) : 0;
    return {
      data: iso(r[iD] ?? ""),
      vendedor: (r[iV] ?? "").trim(),
      filial: iF >= 0 ? (r[iF] ?? "").trim() : "",
      valor_liquido: valor,
      clientes_liquido: qtd,
      ticket_medio: qtd > 0 ? valor / qtd : 0,
    };
  }).filter((r) => r.data && r.vendedor);
}
