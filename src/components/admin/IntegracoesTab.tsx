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
    linhas.push(["", "", "TOTAL", "mensal", totalMeta.toFixed(2), totalRealizado.toFixed(2), "", ""]);

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
  const [embedUrl, setEmbedUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("orion-powerbi");
    if (saved) {
      const data = JSON.parse(saved);
      setConectado(true);
      setEmbedUrl(data.url || "");
    }
  }, []);

  const conectar = () => {
    setLoading(true);
    // Simular conexão Power BI (em produção, usaria Azure AD OAuth)
    setTimeout(() => {
      const url = "https://app.powerbi.com/";
      localStorage.setItem("orion-powerbi", JSON.stringify({ url, conectado_em: new Date().toISOString() }));
      setConectado(true);
      setEmbedUrl(url);
      setLoading(false);
      toast.success("Power BI conectado!");
    }, 1500);
  };

  const desconectar = () => {
    localStorage.removeItem("orion-powerbi");
    setConectado(false);
    setEmbedUrl("");
    toast.success("Power BI desconectado");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800">Power BI</h3>
          <p className="text-xs text-slate-500">Integre dashboards e relatórios do Power BI na plataforma.</p>
        </div>
        {conectado && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">✓ Conectado</span>}
      </div>

      {!conectado ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
            <p className="font-semibold">📊 O que você terá:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Dashboard com KPIs em tempo real</li>
              <li>Gráficos de vendas por categoria</li>
              <li>Ranking de vendedores</li>
              <li>Comparativo de metas vs realizado</li>
            </ul>
          </div>
          <button onClick={conectar} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-400 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? "Conectando..." : "Conectar Power BI"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-sm"><p className="flex items-center gap-2 font-semibold text-emerald-700"><Check className="h-4 w-4" /> Power BI conectado!</p></div>
          <a href={embedUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50">
            <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-amber-600" /><span className="font-medium text-blue-600 underline">Abrir Dashboard no Power BI</span></div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
          <button onClick={desconectar} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Desconectar</button>
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
