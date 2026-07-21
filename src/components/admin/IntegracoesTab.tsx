import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Plus, Trash2, RefreshCw, ExternalLink, Table2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listarPowerbiTokens, criarPowerbiToken, revogarPowerbiToken } from "@/lib/powerbi.functions";
import { obterSheetConfig, salvarSheetConfig, desativarSheetConfig, puxarVendasDoSheet } from "@/lib/sheets.functions";

interface PowerbiToken { id: string; token: string; escopo: string; ativo: boolean; ultimo_uso_em: string | null; criado_em: string; }
interface SheetConfig { id: string; sheet_name: string; ativo: boolean; last_pulled_at: string | null; }
interface SheetLog { id: string; direcao: string; linhas: number; erro: string | null; criado_em: string; }

export function IntegracoesTab() {
  return (
    <div className="space-y-6">
      <SheetsCard />
      <PowerBICard />
    </div>
  );
}

// ---------- Google Sheets ----------
function SheetsCard() {
  const [cfg, setCfg] = useState<SheetConfig | null>(null);
  const [logs, setLogs] = useState<SheetLog[]>([]);
  const [csvUrl, setCsvUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const salvar = useServerFn(salvarSheetConfig);
  const desativar = useServerFn(desativarSheetConfig);
  const puxar = useServerFn(puxarVendasDoSheet);
  const obter = useServerFn(obterSheetConfig);

  const reload = async () => {
    try {
      const r = await obter();
      setCfg((r.config as any) ?? null);
      const { data } = await supabase.from("sheet_sync_log").select("*").order("criado_em", { ascending: false }).limit(10);
      setLogs((data ?? []) as SheetLog[]);
    } catch (e: any) { /* ignora — pode não haver config */ }
  };

  useEffect(() => { void reload(); }, []);

  const conectar = async () => {
    setBusy(true);
    try {
      await salvar({ data: { csv_url: csvUrl, ativo: true } as any });
      toast.success("Planilha conectada!");
      setCsvUrl("");
      await reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const sincronizar = async () => {
    setBusy(true);
    try {
      const r = await puxar();
      if (r.erro) toast.error(r.erro);
      else toast.success(`${r.linhas} linhas sincronizadas!`);
      await reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const desconectar = async () => {
    if (!confirm("Desconectar planilha atual?")) return;
    await desativar();
    toast.success("Planilha desconectada");
    setCfg(null);
    await reload();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Table2 className="h-5 w-5" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white">Google Sheets</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sincronize vendas a partir de uma planilha publicada como CSV.</p>
        </div>
        {cfg?.ativo && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Conectado</span>}
      </div>

      {!cfg?.ativo ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
            <p className="font-semibold">Como conectar:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>Abra sua planilha no Google Sheets</li>
              <li>Arquivo → Compartilhar → Publicar na Web</li>
              <li>Escolha a aba, formato "Valores separados por vírgula (.csv)"</li>
              <li>Copie a URL e cole abaixo</li>
            </ol>
            <p className="mt-2">Colunas esperadas: <code className="rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">data, vendedor, valor_liquido, clientes_liquido</code></p>
          </div>
          <div className="flex gap-2">
            <input value={csvUrl} onChange={(e) => setCsvUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                   className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
            <button onClick={conectar} disabled={busy || !csvUrl} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Conectar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5">
            <p className="break-all font-mono text-slate-600 dark:text-slate-300">{cfg.sheet_name}</p>
            {cfg.last_pulled_at && <p className="mt-1 text-slate-500">Última sincronização: {new Date(cfg.last_pulled_at).toLocaleString("pt-BR")}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={sincronizar} disabled={busy} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Sincronizar agora
            </button>
            <button onClick={desconectar} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10">Desconectar</button>
          </div>
          {logs.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-100 text-xs dark:border-white/5">
              <table className="w-full">
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="px-2 py-1.5 text-slate-500">{new Date(l.criado_em).toLocaleString("pt-BR")}</td>
                      <td className="px-2 py-1.5 font-semibold">{l.direcao}</td>
                      <td className="px-2 py-1.5">{l.erro ? <span className="text-red-500">{l.erro}</span> : <span className="text-emerald-600">{l.linhas} linhas</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Power BI ----------
function PowerBICard() {
  const [tokens, setTokens] = useState<PowerbiToken[]>([]);
  const listar = useServerFn(listarPowerbiTokens);
  const criar = useServerFn(criarPowerbiToken);
  const revogar = useServerFn(revogarPowerbiToken);

  const reload = async () => {
    try { const r = await listar(); setTokens(r.tokens as PowerbiToken[]); }
    catch (e: any) { console.error(e); }
  };
  useEffect(() => { void reload(); }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urlDe = (t: string) => `${origin}/api/public/powerbi/vendas?token=${t}&format=csv`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600"><BarChart3 className="h-5 w-5" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white">Power BI / BI externo</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Gere um token para consumir os dados de vendas em CSV/JSON diretamente do Power BI Desktop ou qualquer ferramenta de BI.</p>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        <p className="font-semibold">Como usar no Power BI Desktop:</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Página inicial → Obter Dados → Web</li>
          <li>Cole a URL do token abaixo</li>
          <li>Escolha "Anônimo" como método de autenticação</li>
          <li>Carregar e atualizar quando quiser</li>
        </ol>
      </div>

      <button onClick={async () => { try { await criar({ data: { escopo: "todos" } as any }); toast.success("Token gerado!"); await reload(); } catch (e: any) { toast.error(e.message); } }}
              className="mb-3 flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500">
        <Plus className="h-4 w-4" /> Gerar novo token
      </button>

      <div className="space-y-2">
        {tokens.filter((t) => t.ativo).map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] text-slate-600 dark:text-slate-300">{urlDe(t.token)}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">Escopo: {t.escopo} · Criado: {new Date(t.criado_em).toLocaleDateString("pt-BR")} {t.ultimo_uso_em && `· Último uso: ${new Date(t.ultimo_uso_em).toLocaleString("pt-BR")}`}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(urlDe(t.token)); toast.success("URL copiada!"); }} className="rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10"><Copy className="h-4 w-4" /></button>
            <a href={urlDe(t.token)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10"><ExternalLink className="h-4 w-4" /></a>
            <button onClick={async () => { if (!confirm("Revogar este token?")) return; await revogar({ data: { id: t.id } }); toast.success("Revogado"); await reload(); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {tokens.filter((t) => t.ativo).length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-white/10">Nenhum token gerado ainda.</p>
        )}
      </div>
    </div>
  );
}
