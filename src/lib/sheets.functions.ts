import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function ensureGestor(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "gerente"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Acesso restrito a admin/gerente.");
}

const configSchema = z.object({
  csv_url: z.string().url(),
  ativo: z.boolean().default(true),
});

export const obterSheetConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("sheet_sync_config").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    return { config: data };
  });

export const salvarSheetConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => configSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureGestor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const m = /\/d\/(?:e\/)?([A-Za-z0-9-_]+)/.exec(data.csv_url);
    const spreadsheet_id = m ? m[1] : data.csv_url.slice(0, 80);
    await supabaseAdmin.from("sheet_sync_config").update({ ativo: false }).eq("ativo", true);
    const { data: row, error } = await supabaseAdmin.from("sheet_sync_config").insert({
      owner_user_id: context.userId, spreadsheet_id, sheet_name: data.csv_url, range_a1: "csv",
      column_map: { data: "data", vendedor: "vendedor", valor_liquido: "valor_liquido", clientes_liquido: "clientes_liquido" },
      ativo: data.ativo,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { config: row };
  });

export const desativarSheetConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureGestor(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("sheet_sync_config").update({ ativo: false }).eq("ativo", true);
    return { ok: true };
  });

function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let cur: string[] = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
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
  return rows.filter((r) => r.some((v) => v !== ""));
}

export const puxarVendasDoSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: cfg } = await context.supabase.from("sheet_sync_config").select("*").eq("ativo", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!cfg) return { rows: [], linhas: 0, erro: "Nenhuma planilha configurada" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let text: string;
    try {
      const res = await fetch(cfg.sheet_name as string, { headers: { Accept: "text/csv" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      text = await res.text();
    } catch (e: any) {
      await supabaseAdmin.from("sheet_sync_log").insert({ direcao: "pull", linhas: 0, erro: e?.message ?? String(e) });
      return { rows: [], linhas: 0, erro: e?.message ?? "Falha ao baixar CSV" };
    }
    const table = parseCSV(text);
    if (!table.length) return { rows: [], linhas: 0, erro: "CSV vazio" };
    const headers = table[0].map((h) => h.trim().toLowerCase());
    const idx = (k: string) => headers.findIndex((h) => h === k);
    const iD = idx("data"), iV = idx("vendedor"), iL = idx("valor_liquido"), iQ = idx("clientes_liquido");
    if (iD < 0 || iV < 0 || iL < 0) return { rows: [], linhas: 0, erro: `Colunas obrigatórias não encontradas em: ${headers.join(", ")}` };
    const num = (s: string) => { const n = Number(String(s).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "")); return Number.isFinite(n) ? n : 0; };
    const iso = (s: string) => { const t = s.trim(); if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0,10); const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t); return m ? `${m[3]}-${m[2]}-${m[1]}` : t; };
    const rows = table.slice(1).map((r) => ({
      data: iso(r[iD] ?? ""), vendedor: (r[iV] ?? "").trim(),
      valor_liquido: num(r[iL] ?? "0"), clientes_liquido: iQ >= 0 ? Math.trunc(num(r[iQ] ?? "0")) : 0,
    })).filter((r) => r.data && r.vendedor);
    await supabaseAdmin.from("sheet_sync_config").update({ last_pulled_at: new Date().toISOString() }).eq("id", cfg.id);
    await supabaseAdmin.from("sheet_sync_log").insert({ direcao: "pull", linhas: rows.length });
    return { rows, linhas: rows.length, erro: null };
  });
