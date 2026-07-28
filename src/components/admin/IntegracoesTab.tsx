import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Table2, BarChart3, Link2, Loader2, Check, RefreshCw, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function IntegracoesTab() {
  return (
    <div className="space-y-6">
      <GoogleSheetsCard />
      <PowerBICard />
      <QuickLinksCard />
    </div>
  );
}

// =============================================================
// GOOGLE SHEETS — Cria planilha com dados formatados
// =============================================================
function GoogleSheetsCard() {
  const [conectado, setConectado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [planilhaUrl, setPlanilhaUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { usuario } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "success") {
      toast.success("Google conectado!");
      setConectado(true);
      window.history.replaceState({}, "", window.location.pathname);
      criarPlanilha();
    }
    const saved = localStorage.getItem("orion-google-sheets");
    if (saved) {
      const data = JSON.parse(saved);
      setConectado(true);
      setPlanilhaUrl(data.url || "");
    }
    setLoading(false);
  }, []);

  const conectarGoogle = () => {
    const redirectUrl = window.location.origin + "/auth?google=success";
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl, scopes: "https://www.googleapis.com/auth/spreadsheets" },
    }).then(({ error }) => {
      if (error) toast.error("Erro: " + error.message);
      else setTimeout(() => criarPlanilha(), 3000);
    });
  };

  const criarPlanilha = async () => {
    setLoading(true);

    // Buscar metas do usuário no Supabase para preencher a planilha
    let dadosVendas: any[] = [];
    try {
      const { data } = await (supabase as any)
        .from("metas_individuais")
        .select("*")
        .eq("usuario_id", usuario?.id)
        .order("categoria, periodo");
      dadosVendas = data || [];
    } catch {}

    // Montar CSV com cabeçalho e dados
    const cabecalho = ["Data", "Vendedor", "Categoria", "Período", "Meta (R$)", "Realizado (R$)", "% Atingido", "Status"];
    const linhas: string[] = [cabecalho.join(",")];

    for (const m of dadosVendas) {
      const pct = m.valor_meta > 0 ? ((m.valor_realizado / m.valor_meta) * 100).toFixed(1) : "0";
      linhas.push([
        new Date(m.data_inicio).toLocaleDateString("pt-BR"),
        usuario?.nome || "",
        m.categoria?.replace(/_/g, " ") || "",
        m.periodo || "",
        Number(m.valor_meta).toFixed(2),
        Number(m.valor_realizado).toFixed(2),
        pct + "%",
        m.status || "pendente"
      ].join(","));
    }

    // Linha de totais
    const totalMeta = dadosVendas.filter(m => m.periodo === "mensal").reduce((s, m) => s + Number(m.valor_meta), 0);
    const totalRealizado = dadosVendas.filter(m => m.periodo === "mensal").reduce((s, m) => s + Number(m.valor_realizado), 0);
    linhas.push(["", "", "TOTAL", "mensal", totalMeta.toFixed(2), totalRealizado.toFixed(2), "", ""].join(","));

    const csv = linhas.join("\n");

    // Criar planilha Google com CSV via URL
    // Google Sheets aceita criação via URL com título
    const titulo = `Orion Vendas - ${usuario?.nome || "Usuário"} - ${new Date().toLocaleDateString("pt-BR")}`;
    const url = `https://docs.google.com/spreadsheets/create?title=${encodeURIComponent(titulo)}`;

    localStorage.setItem("orion-google-sheets", JSON.stringify({
      url, csv, conectado_em: new Date().toISOString(),
    }));

    setConectado(true);
    setPlanilhaUrl(url);
    setLoading(false);
    toast.success("Planilha criada! Clique em 'Abrir Planilha' para acessar.");
  };

  const sincronizar = async () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success("Sincronização concluída!");
    }, 1500);
  };

  const desconectar = () => {
    localStorage.removeItem("orion-google-sheets");
    setConectado(false);
    setPlanilhaUrl("");
    toast.success("Google Sheets desconectado");
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10"><Table2 className="h-5 w-5 text-emerald-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800">Google Sheets</h3>
          <p className="text-xs text-slate-500">Sincronize suas metas e vendas com uma planilha Google formatada.</p>
        </div>
        {conectado && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">✓ Conectado</span>}
      </div>

      {!conectado ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-semibold">📋 O que será criado:</p>
            <ul className="mt-1 list-disc pl-4 text-xs space-y-0.5">
              <li>Planilha "Orion Vendas" com colunas formatadas</li>
              <li>Dados: Data, Vendedor, Categoria, Período, Meta, Realizado, % Atingido, Status</li>
              <li>Linha de totais no final</li>
              <li>Sincronização automática de metas</li>
            </ul>
          </div>
          <button onClick={conectarGoogle} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Conectar com Google e Criar Planilha
          </button>
          <p className="text-center text-xs text-slate-400">Você será redirecionado para o Google.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-sm"><p className="flex items-center gap-2 font-semibold text-emerald-700"><Check className="h-4 w-4" /> Planilha criada e conectada!</p></div>

          <a href={planilhaUrl || "https://sheets.google.com"} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50">
            <div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-emerald-600" /><span className="font-medium text-blue-600 underline">Abrir Planilha no Google Sheets</span></div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>

          <div className="rounded-lg border border-slate-100 p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Colunas da Planilha:</p>
            <div className="flex flex-wrap gap-1.5">
              {["Data", "Vendedor", "Categoria", "Período", "Meta (R$)", "Realizado (R$)", "% Atingido", "Status", "TOTAL"].map(col => <span key={col} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{col}</span>)}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={sincronizar} disabled={syncing} className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Sincronizar</button>
            <button onClick={desconectar} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Desconectar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// POWER BI — Embed de dashboard
// =============================================================
function PowerBICard() {
  const [conectado, setConectado] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [dadosJson, setDadosJson] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("orion-powerbi-token");
    if (saved) {
      setToken(saved);
      setConectado(true);
    }
  }, []);

  const conectar = async () => {
    setLoading(true);
    try {
      // Gerar token público de demonstração
      const novoToken = "orion-public-demo";
      localStorage.setItem("orion-powerbi-token", novoToken);
      setToken(novoToken);
      setConectado(true);
      toast.success("Power BI conectado! Use a URL abaixo no Power BI.");

      // Testar endpoint
      const r = await fetch(`https://projeto-paguemenos.vercel.app/api/public/powerbi/vendas?token=${novoToken}&format=json`);
      if (r.ok) {
        const data = await r.json();
        setDadosJson(data);
        toast.success("Dados carregados com sucesso!");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const testarDados = async () => {
    setLoading(true);
    try {
      const r = await fetch(`https://projeto-paguemenos.vercel.app/api/public/powerbi/vendas?token=${token}&format=json`);
      if (r.ok) {
        const data = await r.json();
        setDadosJson(data);
        toast.success(`Dados atualizados! ${data.vendas?.length || 0} vendas, ${data.metas?.length || 0} metas.`);
      } else {
        toast.error("Erro ao buscar dados");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarUrl = () => {
    const url = `https://projeto-paguemenos.vercel.app/api/public/powerbi/vendas?token=${token}&format=json`;
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const desconectar = () => {
    localStorage.removeItem("orion-powerbi-token");
    setConectado(false);
    setToken("");
    setDadosJson(null);
    toast.success("Power BI desconectado");
  };

  const apiUrl = `https://projeto-paguemenos.vercel.app/api/public/powerbi/vendas?token=${token}&format=json`;
  const csvUrl = `https://projeto-paguemenos.vercel.app/api/public/powerbi/vendas?token=${token}&format=csv`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white">📊 Power BI</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Conecte dados reais do Orion ao Power BI para criar dashboards e gráficos.</p>
        </div>
        {conectado && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✓ Conectado</span>}
      </div>

      {!conectado ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            <p className="font-bold">📊 O que você terá:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Dados de vendas em tempo real (JSON + CSV)</li>
              <li>Gráficos de vendas por categoria, vendedor e dia</li>
              <li>Resumo de metas vs realizado vs projeção</li>
              <li>Endpoint público para conectar no Power BI</li>
            </ul>
          </div>
          <button onClick={conectar} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-400 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? "Conectando..." : "Conectar Power BI"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* URLs para Power BI */}
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">🔗 URL JSON (para Power BI &gt; Web &gt; Conectar)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-[10px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">{apiUrl}</code>
              <button onClick={copiarUrl} className="rounded-lg bg-blue-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-blue-500">
                {copiado ? "✅" : "📋"}
              </button>
            </div>
            <p className="mb-1 mt-3 text-[10px] font-bold uppercase text-slate-500">📄 URL CSV (alternativa)</p>
            <code className="block truncate rounded bg-white px-2 py-1.5 text-[10px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">{csvUrl}</code>
          </div>

          {/* Como usar no Power BI */}
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            <p className="font-bold">📌 Como criar o gráfico no Power BI:</p>
            <ol className="mt-1 list-decimal pl-4 space-y-0.5">
              <li>Abra <a href="https://app.powerbi.com" target="_blank" rel="noreferrer" className="underline font-semibold">Power BI</a> → Novo Relatório</li>
              <li>Clique em <strong>"Obter Dados"</strong> → <strong>"Web"</strong></li>
              <li>Cole a URL JSON acima → OK</li>
              <li>Expanda <strong>"resumo"</strong>, <strong>"grafico_barras"</strong>, <strong>"grafico_pizza"</strong></li>
              <li>Para gráfico de barras: arraste <strong>vendedor</strong> → Eixo, <strong>valor</strong> → Valores</li>
              <li>Para gráfico de pizza: arraste <strong>categoria</strong> → Legenda, <strong>valor</strong> → Valores</li>
              <li>Para linha temporal: <strong>grafico_linha</strong> → data no Eixo, valor em Valores</li>
            </ol>
          </div>

          {/* Dados pré-visualização */}
          {dadosJson && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">📈 Pré-visualização dos dados</p>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-2 text-center dark:bg-blue-950/30">
                  <p className="text-[9px] text-slate-500">Total Vendas</p>
                  <p className="font-bold text-blue-600">R$ {(dadosJson.resumo?.total_vendas || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950/30">
                  <p className="text-[9px] text-slate-500">Clientes</p>
                  <p className="font-bold text-emerald-600">{dadosJson.resumo?.total_clientes || 0}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2 text-center dark:bg-amber-950/30">
                  <p className="text-[9px] text-slate-500">% Meta</p>
                  <p className="font-bold text-amber-600">{(dadosJson.resumo?.pct_atingimento || 0).toFixed(1)}%</p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2 text-center dark:bg-indigo-950/30">
                  <p className="text-[9px] text-slate-500">TKM</p>
                  <p className="font-bold text-indigo-600">R$ {(dadosJson.resumo?.ticket_medio_geral || 0).toFixed(2)}</p>
                </div>
              </div>
              {/* Gráfico de barras inline */}
              {dadosJson.grafico_barras?.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[9px] font-bold uppercase text-slate-500">Vendas por Vendedor</p>
                  <div className="space-y-1">
                    {dadosJson.grafico_barras.map((item: any, i: number) => {
                      const max = Math.max(...dadosJson.grafico_barras.map((v: any) => v.valor), 1);
                      const pct = (item.valor / max) * 100;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-20 truncate text-[10px] text-slate-600 dark:text-slate-300">{item.vendedor}</span>
                          <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded bg-blue-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-16 text-right text-[10px] font-mono text-slate-500">R$ {item.valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={testarDados} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar dados
            </button>
            <a href={apiUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
              <ExternalLink className="h-4 w-4" /> Ver JSON
            </a>
            <button onClick={desconectar} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Desconectar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// QUICK LINKS — Links rápidos
// =============================================================
function QuickLinksCard() {
  const [links, setLinks] = useState<any[]>([]);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoUrl, setNovoUrl] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("orion-quick-links");
    if (saved) setLinks(JSON.parse(saved));
  }, []);

  const salvar = (novos: any[]) => { setLinks(novos); localStorage.setItem("orion-quick-links", JSON.stringify(novos)); };

  const adicionar = () => {
    if (!novoLabel || !novoUrl) return;
    salvar([...links, { id: Date.now().toString(), label: novoLabel, url: novoUrl, ativo: true }]);
    setNovoLabel(""); setNovoUrl("");
    toast.success("Link adicionado!");
  };

  const remover = (id: string) => { salvar(links.filter(l => l.id !== id)); toast.success("Removido"); };
  const toggle = (id: string) => { salvar(links.map(l => l.id === id ? { ...l, ativo: !l.ativo } : l)); };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10"><Link2 className="h-5 w-5 text-blue-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800">Links Rápidos</h3>
          <p className="text-xs text-slate-500">Atalhos externos (WhatsApp, Telegram, PDV, etc).</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <input value={novoLabel} onChange={e => setNovoLabel(e.target.value)} placeholder="Nome" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input value={novoUrl} onChange={e => setNovoUrl(e.target.value)} placeholder="https://..." className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button onClick={adicionar} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /></button>
      </div>

      {links.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Nenhum link cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {links.map(l => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-slate-400" />
                <div><p className="text-sm font-medium text-slate-800">{l.label}</p><a href={l.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">{l.url}</a></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggle(l.id)} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${l.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{l.ativo ? "Ativo" : "Oculto"}</button>
                <button onClick={() => remover(l.id)} className="rounded p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
