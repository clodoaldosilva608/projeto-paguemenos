import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Table2, BarChart3, Link2, Loader2, Check, RefreshCw, ExternalLink, Plus, Trash2, X, Download, Upload, FileSpreadsheet } from "lucide-react";
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
// GOOGLE SHEETS — Planilha unificada multi-aba com dados reais
// =============================================================
function GoogleSheetsCard() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [planilhaUrl, setPlanilhaUrl] = useState("");
  const [dadosPlanilha, setDadosPlanilha] = useState<any>(null);
  const { usuario } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("orion-sheets-unificada");
    if (saved) {
      const data = JSON.parse(saved);
      setPlanilhaUrl(data.url || "");
      setDadosPlanilha(data);
    }
  }, []);

  // Buscar TODOS os dados do banco para popular a planilha
  async function buscarTodosDados() {
    // 1. Buscar todos os vendedores
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, email, cargo, filial_id")
      .eq("ativo", true);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "vendedor");

    const vendedorIds = (roles || []).map((r) => r.user_id);
    const vendedores = (profiles || []).filter((p) => vendedorIds.includes(p.id));

    // 2. Buscar todas as metas mensais
    const { data: metas } = await supabase
      .from("metas_individuais")
      .select("*")
      .eq("periodo", "mensal");

    // 3. Buscar todas as vendas diárias
    const { data: vendas } = await supabase
      .from("vendas_diarias")
      .select("*")
      .order("data", { ascending: false });

    // 4. Montar estrutura por vendedor
    const dadosPorVendedor = vendedores.map((v) => {
      const metasVendedor = (metas || []).filter((m) => m.usuario_id === v.id);
      const vendasVendedor = (vendas || []).filter((vd) => vd.usuario_id === v.id);

      const faturamento = metasVendedor.find((m) => m.categoria === "faturamento");
      const me = metasVendedor.find((m) => m.categoria === "marcas_exclusivas");
      const gen = metasVendedor.find((m) => m.categoria === "genericos");
      const sd = metasVendedor.find((m) => m.categoria === "super_desconto");

      const totalVendas = vendasVendedor.reduce((s, vd) => s + Number(vd.valor_venda || 0), 0);
      const totalClientes = vendasVendedor.reduce((s, vd) => s + Number(vd.qtd_clientes || 0), 0);

      return {
        id: v.id,
        nome: v.nome,
        email: v.email,
        cargo: v.cargo || "Vendedor",
        faturamento: {
          meta: Number(faturamento?.valor_meta || 0),
          realizado: Number(faturamento?.valor_realizado || 0),
          projecao: Number(faturamento?.valor_projecao || 0),
        },
        marcas_exclusivas: {
          meta: Number(me?.valor_meta || 0),
          realizado: Number(me?.valor_realizado || 0),
          projecao: Number(me?.valor_projecao || 0),
        },
        genericos: {
          meta: Number(gen?.valor_meta || 0),
          realizado: Number(gen?.valor_realizado || 0),
          projecao: Number(gen?.valor_projecao || 0),
        },
        super_desconto: {
          meta: Number(sd?.valor_meta || 0),
          realizado: Number(sd?.valor_realizado || 0),
          projecao: Number(sd?.valor_projecao || 0),
        },
        total_vendas_lancadas: totalVendas,
        total_clientes: totalClientes,
        ticket_medio: totalClientes > 0 ? totalVendas / totalClientes : 0,
        vendas_detalhadas: vendasVendedor.map((vd) => ({
          data: vd.data,
          categoria: vd.categoria,
          valor: Number(vd.valor_venda || 0),
          clientes: Number(vd.qtd_clientes || 0),
          observacao: vd.observacao || "",
        })),
      };
    });

    // 5. Calcular totais da loja
    const totaisLoja = {
      meta_faturamento: dadosPorVendedor.reduce((s, v) => s + v.faturamento.meta, 0),
      realizado_faturamento: dadosPorVendedor.reduce((s, v) => s + v.faturamento.realizado, 0),
      projecao_faturamento: dadosPorVendedor.reduce((s, v) => s + v.faturamento.projecao, 0),
      meta_me: dadosPorVendedor.reduce((s, v) => s + v.marcas_exclusivas.meta, 0),
      realizado_me: dadosPorVendedor.reduce((s, v) => s + v.marcas_exclusivas.realizado, 0),
      meta_gen: dadosPorVendedor.reduce((s, v) => s + v.genericos.meta, 0),
      realizado_gen: dadosPorVendedor.reduce((s, v) => s + v.genericos.realizado, 0),
      meta_sd: dadosPorVendedor.reduce((s, v) => s + v.super_desconto.meta, 0),
      realizado_sd: dadosPorVendedor.reduce((s, v) => s + v.super_desconto.realizado, 0),
      total_vendedores: dadosPorVendedor.length,
      total_clientes: dadosPorVendedor.reduce((s, v) => s + v.total_clientes, 0),
      total_vendas: dadosPorVendedor.reduce((s, v) => s + v.total_vendas_lancadas, 0),
    };

    return { vendedores: dadosPorVendedor, totaisLoja };
  }

  // Gerar CSV da aba Panorama Geral
  function gerarCSVPanorama(dados: any): string {
    const t = dados.totaisLoja;
    const linhas = [
      "RELATÓRIO PANORAMA GERAL - FILIAL 7537",
      `Data de geração: ${new Date().toLocaleString("pt-BR")}`,
      "",
      "INDICADOR,META,REALIZADO,PROJEÇÃO,% ATINGIMENTO",
      `Faturamento,R$ ${t.meta_faturamento.toFixed(2)},R$ ${t.realizado_faturamento.toFixed(2)},R$ ${t.projecao_faturamento.toFixed(2)},${t.meta_faturamento > 0 ? ((t.realizado_faturamento / t.meta_faturamento) * 100).toFixed(1) : 0}%`,
      `Marcas Exclusivas,R$ ${t.meta_me.toFixed(2)},R$ ${t.realizado_me.toFixed(2)},R$ ${(t.meta_me * (t.meta_me > 0 ? t.realizado_me / t.meta_me : 0)).toFixed(2)},${t.meta_me > 0 ? ((t.realizado_me / t.meta_me) * 100).toFixed(1) : 0}%`,
      `Genéricos,R$ ${t.meta_gen.toFixed(2)},R$ ${t.realizado_gen.toFixed(2)},R$ ${(t.meta_gen * (t.meta_gen > 0 ? t.realizado_gen / t.meta_gen : 0)).toFixed(2)},${t.meta_gen > 0 ? ((t.realizado_gen / t.meta_gen) * 100).toFixed(1) : 0}%`,
      `Super Desconto,R$ ${t.meta_sd.toFixed(2)},R$ ${t.realizado_sd.toFixed(2)},R$ ${(t.meta_sd * (t.meta_sd > 0 ? t.realizado_sd / t.meta_sd : 0)).toFixed(2)},${t.meta_sd > 0 ? ((t.realizado_sd / t.meta_sd) * 100).toFixed(1) : 0}%`,
      "",
      "Vendedores Ativos,Total Vendas Lançadas,Total Clientes,Ticket Médio Geral",
      `${t.total_vendedores},R$ ${t.total_vendas.toFixed(2)},${t.total_clientes},R$ ${t.total_clientes > 0 ? (t.total_vendas / t.total_clientes).toFixed(2) : 0}`,
      "",
      "RANKING DE VENDEDORES",
      "Posição,Nome,Faturamento Meta,Faturamento Realizado,% Atingimento,Projeção",
    ];

    const ranking = [...dados.vendedores].sort((a, b) => {
      const pctA = a.faturamento.meta > 0 ? a.faturamento.realizado / a.faturamento.meta : 0;
      const pctB = b.faturamento.meta > 0 ? b.faturamento.realizado / b.faturamento.meta : 0;
      return pctB - pctA;
    });

    ranking.forEach((v, i) => {
      const pct = v.faturamento.meta > 0 ? ((v.faturamento.realizado / v.faturamento.meta) * 100).toFixed(1) : "0";
      linhas.push(`${i + 1},${v.nome},R$ ${v.faturamento.meta.toFixed(2)},R$ ${v.faturamento.realizado.toFixed(2)},${pct}%,R$ ${v.faturamento.projecao.toFixed(2)}`);
    });

    return linhas.join("\n");
  }

  // Gerar CSV de um vendedor individual
  function gerarCSVVendedor(v: any): string {
    const linhas = [
      `DADOS INDIVIDUAIS - ${v.nome}`,
      `Email: ${v.email}`,
      `Cargo: ${v.cargo}`,
      "",
      "CATEGORIA,META MENSAL,REALIZADO,PROJEÇÃO,% ATINGIMENTO",
      `Faturamento,R$ ${v.faturamento.meta.toFixed(2)},R$ ${v.faturamento.realizado.toFixed(2)},R$ ${v.faturamento.projecao.toFixed(2)},${v.faturamento.meta > 0 ? ((v.faturamento.realizado / v.faturamento.meta) * 100).toFixed(1) : 0}%`,
      `Marcas Exclusivas,R$ ${v.marcas_exclusivas.meta.toFixed(2)},R$ ${v.marcas_exclusivas.realizado.toFixed(2)},R$ ${v.marcas_exclusivas.projecao.toFixed(2)},${v.marcas_exclusivas.meta > 0 ? ((v.marcas_exclusivas.realizado / v.marcas_exclusivas.meta) * 100).toFixed(1) : 0}%`,
      `Genéricos,R$ ${v.genericos.meta.toFixed(2)},R$ ${v.genericos.realizado.toFixed(2)},R$ ${v.genericos.projecao.toFixed(2)},${v.genericos.meta > 0 ? ((v.genericos.realizado / v.genericos.meta) * 100).toFixed(1) : 0}%`,
      `Super Desconto,R$ ${v.super_desconto.meta.toFixed(2)},R$ ${v.super_desconto.realizado.toFixed(2)},R$ ${v.super_desconto.projecao.toFixed(2)},${v.super_desconto.meta > 0 ? ((v.super_desconto.realizado / v.super_desconto.meta) * 100).toFixed(1) : 0}%`,
      "",
      "VENDAS DIÁRIAS LANÇADAS",
      "Data,Categoria,Valor (R$),Clientes,Ticket Médio,Observação",
    ];

    v.vendas_detalhadas.forEach((vd: any) => {
      const tkm = vd.clientes > 0 ? vd.valor / vd.clientes : 0;
      linhas.push(`${vd.data},${vd.categoria},R$ ${vd.valor.toFixed(2)},${vd.clientes},R$ ${tkm.toFixed(2)},${vd.observacao}`);
    });

    linhas.push("", `TOTAL DE VENDAS: R$ ${v.total_vendas_lancadas.toFixed(2)}`, `TOTAL DE CLIENTES: ${v.total_clientes}`, `TICKET MÉDIO: R$ ${v.ticket_medio.toFixed(2)}`);
    return linhas.join("\n");
  }

  // Criar planilha: baixar CSV multi-aba + abrir Google Sheets
  async function criarPlanilha() {
    setLoading(true);
    try {
      const dados = await buscarTodosDados();
      setDadosPlanilha(dados);

      // Gerar CSV do panorama
      const csvPanorama = gerarCSVPanorama(dados);

      // Gerar CSV de cada vendedor
      const csvsVendedores = dados.vendedores.map((v: any) => ({
        nome: v.nome.split(" ")[0].toLowerCase(),
        csv: gerarCSVVendedor(v),
      }));

      // Combinar tudo em um único CSV com separadores de aba (formato TSV para Excel/Sheets)
      const todasAbas = [
        { nome: "Panorama Geral", csv: csvPanorama },
        ...csvsVendedores,
        { nome: "Faturamento Loja", csv: gerarCSVCategoria(dados, "faturamento") },
        { nome: "Marcas Exclusivas", csv: gerarCSVCategoria(dados, "marcas_exclusivas") },
        { nome: "Genéricos", csv: gerarCSVCategoria(dados, "genericos") },
        { nome: "Super Desconto", csv: gerarCSVCategoria(dados, "super_desconto") },
      ];

      // Criar CSV combinado (cada aba separada por linha em branco + título)
      const csvCombinado = todasAbas.map((aba) => `=== ABA: ${aba.nome} ===\n${aba.csv}`).join("\n\n");

      // Download do CSV
      const blob = new Blob(["\ufeff" + csvCombinado], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orion_Planilha_Unificada_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      // Abrir Google Sheets para importar
      const sheetsUrl = "https://docs.google.com/spreadsheets/create";
      window.open(sheetsUrl, "_blank");

      // Salvar no localStorage
      const dadosSalvos = { url: sheetsUrl, dados, csv: csvCombinado, criado_em: new Date().toISOString() };
      localStorage.setItem("orion-sheets-unificada", JSON.stringify(dadosSalvos));
      setPlanilhaUrl(sheetsUrl);

      toast.success("📋 Planilha unificada gerada! O CSV foi baixado e o Google Sheets foi aberto. Importe o CSV no Google Sheets (Arquivo → Importar → Upload).");
    } catch (e: any) {
      toast.error("Erro ao criar planilha: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // Gerar CSV de uma categoria específica (todos os vendedores)
  function gerarCSVCategoria(dados: any, categoria: string): string {
    const linhas = [
      `INDICADOR: ${categoria.toUpperCase().replace(/_/g, " ")} - TODOS OS VENDEDORES`,
      "",
      "Nome,Meta Mensal,Realizado,Projeção,% Atingimento,Status",
    ];

    dados.vendedores.forEach((v: any) => {
      const cat = v[categoria];
      const pct = cat.meta > 0 ? ((cat.realizado / cat.meta) * 100).toFixed(1) : "0";
      const status = cat.realizado >= cat.meta ? "META ATINGIDA" : cat.realizado >= cat.meta * 0.5 ? "DENTRO DA META" : "FORA DA META";
      linhas.push(`${v.nome},R$ ${cat.meta.toFixed(2)},R$ ${cat.realizado.toFixed(2)},R$ ${cat.projecao.toFixed(2)},${pct}%,${status}`);
    });

    const totalMeta = dados.vendedores.reduce((s: number, v: any) => s + v[categoria].meta, 0);
    const totalRealizado = dados.vendedores.reduce((s: number, v: any) => s + v[categoria].realizado, 0);
    linhas.push(`,R$ ${totalMeta.toFixed(2)},R$ ${totalRealizado.toFixed(2)},,${totalMeta > 0 ? ((totalRealizado / totalMeta) * 100).toFixed(1) : 0}%,TOTAL`);

    return linhas.join("\n");
  }

  // Sincronizar: ler planilha editada e atualizar banco
  async function sincronizar() {
    setSyncing(true);
    try {
      // Na sincronização, buscamos os dados atuais do banco e re-geramos o CSV
      // (o usuário deve editar os dados no app e sincronizar para a planilha)
      const dados = await buscarTodosDados();
      const csvPanorama = gerarCSVPanorama(dados);
      const csvsVendedores = dados.vendedores.map((v: any) => ({ nome: v.nome.split(" ")[0].toLowerCase(), csv: gerarCSVVendedor(v) }));
      const todasAbas = [{ nome: "Panorama Geral", csv: csvPanorama }, ...csvsVendedores];
      const csvCombinado = todasAbas.map((aba) => `=== ABA: ${aba.nome} ===\n${aba.csv}`).join("\n\n");

      const blob = new Blob(["\ufeff" + csvCombinado], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Orion_Sincronizado_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const dadosSalvos = { url: planilhaUrl, dados, csv: csvCombinado, sincronizado_em: new Date().toISOString() };
      localStorage.setItem("orion-sheets-unificada", JSON.stringify(dadosSalvos));

      toast.success("✅ Dados sincronizados! CSV atualizado baixado com os dados mais recentes do banco.");
    } catch (e: any) {
      toast.error("Erro ao sincronizar: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  function desconectar() {
    localStorage.removeItem("orion-sheets-unificada");
    setPlanilhaUrl("");
    setDadosPlanilha(null);
    toast.success("Planilha desconectada");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10"><Table2 className="h-5 w-5 text-emerald-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white">📊 Google Sheets — Planilha Unificada</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Planilha multi-aba com panorama geral, indicadores por categoria e seções individuais de cada vendedor.</p>
        </div>
        {planilhaUrl && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✓ Ativa</span>}
      </div>

      <div className="space-y-3">
        {/* O que será criado */}
        <div className="rounded-xl bg-blue-50 p-4 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
          <p className="font-bold">📋 A planilha unificada contém:</p>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <div className="flex items-center gap-1">📁 <strong>Panorama Geral</strong> — totais da loja + ranking</div>
            <div className="flex items-center gap-1">📁 <strong>Faturamento</strong> — todos vendedores</div>
            <div className="flex items-center gap-1">📁 <strong>Marcas Exclusivas</strong> — todos vendedores</div>
            <div className="flex items-center gap-1">📁 <strong>Genéricos</strong> — todos vendedores</div>
            <div className="flex items-center gap-1">📁 <strong>Super Desconto</strong> — todos vendedores</div>
            {dadosPlanilha?.vendedores?.map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-1">👤 <strong>{v.nome.split(" ")[0]}</strong> — metas + vendas diárias</div>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-wrap gap-2">
          {!planilhaUrl ? (
            <button onClick={criarPlanilha} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {loading ? "Gerando..." : "Criar Planilha Unificada"}
            </button>
          ) : (
            <>
              <button onClick={sincronizar} disabled={syncing} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {syncing ? "Sincronizando..." : "Sincronizar Dados"}
              </button>
              <button onClick={criarPlanilha} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300">
                <Download className="h-4 w-4" /> Re-baixar CSV
              </button>
              <button onClick={desconectar} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">Desconectar</button>
            </>
          )}
        </div>

        {/* Link para Google Sheets */}
        {planilhaUrl && (
          <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm transition hover:bg-slate-50 dark:border-white/10">
            <div className="flex items-center gap-2"><Table2 className="h-4 w-4 text-emerald-600" /><span className="font-medium text-blue-600 underline">Abrir Google Sheets</span></div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        )}

        {/* Como usar */}
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="font-bold">📌 Como usar:</p>
          <ol className="mt-1 list-decimal pl-4 space-y-0.5">
            <li>Clique em <strong>"Criar Planilha Unificada"</strong> — o CSV será baixado</li>
            <li>Abra o <strong>Google Sheets</strong> → <strong>Arquivo → Importar → Upload</strong></li>
            <li>Selecione o CSV baixado → <strong>Importar dados</strong></li>
            <li>A planilha terá múltiplas seções (Panorama, Faturamento, Vendedores...)</li>
            <li>Para atualizar: clique em <strong>"Sincronizar Dados"</strong> para baixar CSV com dados mais recentes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// POWER BI — Dashboard com gráficos automáticos
// =============================================================
function PowerBICard() {
  const [conectado, setConectado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<any>(null);
  const [copiado, setCopiado] = useState(false);

  const apiUrl = "https://projeto-paguemenos.vercel.app/api/public/powerbi/vendas?token=orion-public-demo&format=json";
  const csvUrl = "https://projeto-paguemenos.vercel.app/api/public/powerbi/vendas?token=orion-public-demo&format=csv";

  useEffect(() => {
    const saved = localStorage.getItem("orion-powerbi-ativo");
    if (saved === "true") setConectado(true);
  }, []);

  async function conectar() {
    setLoading(true);
    try {
      const r = await fetch(apiUrl);
      if (r.ok) {
        const data = await r.json();
        setDados(data);
        setConectado(true);
        localStorage.setItem("orion-powerbi-ativo", "true");
        toast.success("Power BI conectado! Dados carregados e gráficos gerados abaixo.");
      } else {
        toast.error("Erro ao carregar dados do endpoint.");
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function atualizarDados() {
    setLoading(true);
    try {
      const r = await fetch(apiUrl);
      if (r.ok) {
        const data = await r.json();
        setDados(data);
        toast.success(`Dados atualizados! ${data.vendas?.length || 0} vendas, ${data.metas?.length || 0} metas.`);
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function copiarUrl() {
    navigator.clipboard.writeText(apiUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function desconectar() {
    localStorage.removeItem("orion-powerbi-ativo");
    setConectado(false);
    setDados(null);
    toast.success("Power BI desconectado");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white">📊 Power BI — Dashboard Automático</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Conecta dados reais do Orion e gera gráficos automaticamente. Dados prontos para importar no Power BI.</p>
        </div>
        {conectado && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✓ Conectado</span>}
      </div>

      {!conectado ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-blue-50 p-4 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            <p className="font-bold">📊 Ao conectar, você terá:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Endpoint JSON com dados reais (vendas + metas + resumo)</li>
              <li>Gráficos pré-estruturados: barras, pizza, linha temporal</li>
              <li>KPIs: total vendas, clientes, % meta, ticket médio</li>
              <li>Instruções para criar dashboard no Power BI em 2 minutos</li>
            </ul>
          </div>
          <button onClick={conectar} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-400 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? "Conectando..." : "Conectar Power BI"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* KPIs */}
          {dados?.resumo && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiBox label="Total Vendas" value={`R$ ${(dados.resumo.total_vendas || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} cor="text-blue-600" />
              <KpiBox label="Clientes" value={`${dados.resumo.total_clientes || 0}`} cor="text-emerald-600" />
              <KpiBox label="% Meta" value={`${(dados.resumo.pct_atingimento || 0).toFixed(1)}%`} cor="text-amber-600" />
              <KpiBox label="TKM" value={`R$ ${(dados.resumo.ticket_medio_geral || 0).toFixed(2)}`} cor="text-indigo-600" />
            </div>
          )}

          {/* Gráfico de barras inline — Vendas por Vendedor */}
          {dados?.grafico_barras?.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">📊 Vendas por Vendedor</p>
              <div className="space-y-1.5">
                {dados.grafico_barras.map((item: any, i: number) => {
                  const max = Math.max(...dados.grafico_barras.map((v: any) => v.valor), 1);
                  const pct = (item.valor / max) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-24 truncate text-[10px] text-slate-600 dark:text-slate-300">{item.vendedor}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                        <div className="flex h-full items-center justify-end rounded bg-gradient-to-r from-blue-500 to-indigo-600 pr-2" style={{ width: `${Math.max(pct, 8)}%` }}>
                          <span className="text-[9px] font-bold text-white">R$ {item.valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gráfico de pizza inline — Vendas por Categoria */}
          {dados?.grafico_pizza?.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">🥧 Vendas por Categoria</p>
              <div className="flex flex-wrap gap-2">
                {dados.grafico_pizza.map((item: any, i: number) => {
                  const total = dados.grafico_pizza.reduce((s: number, v: any) => s + v.valor, 0) || 1;
                  const pct = (item.valor / total) * 100;
                  const cores = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-red-500", "bg-indigo-500"];
                  return (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800">
                      <span className={`h-3 w-3 rounded-full ${cores[i % cores.length]}`} />
                      <span className="text-[10px] capitalize text-slate-600 dark:text-slate-300">{item.categoria.replace(/_/g, " ")}</span>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gráfico de linha inline — Vendas por Dia */}
          {dados?.grafico_linha?.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">📈 Vendas por Dia</p>
              <div className="flex items-end gap-1" style={{ height: "60px" }}>
                {dados.grafico_linha.map((item: any, i: number) => {
                  const max = Math.max(...dados.grafico_linha.map((v: any) => v.valor), 1);
                  const pct = (item.valor / max) * 100;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                      <div className="w-full rounded-t bg-blue-500" style={{ height: `${Math.max(pct, 3)}%` }} title={`R$ ${item.valor.toFixed(2)}`} />
                      <span className="text-[7px] text-slate-400">{item.data.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* URLs para Power BI */}
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <p className="mb-1 text-[10px] font-bold uppercase text-slate-500">🔗 URL para Power BI (Obter Dados &gt; Web)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1.5 text-[10px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">{apiUrl}</code>
              <button onClick={copiarUrl} className="rounded-lg bg-blue-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-blue-500">
                {copiado ? "✅" : "📋"}
              </button>
            </div>
          </div>

          {/* Instruções Power BI */}
          <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
            <p className="font-bold">📌 Criar dashboard no Power BI:</p>
            <ol className="mt-1 list-decimal pl-4 space-y-0.5">
              <li>Abra <a href="https://app.powerbi.com" target="_blank" rel="noreferrer" className="underline font-semibold">Power BI</a> → <strong>Novo Relatório</strong></li>
              <li><strong>Obter Dados</strong> → <strong>Web</strong> → cole a URL JSON acima</li>
              <li>Expanda <strong>grafico_barras</strong> → arraste <strong>vendedor</strong> (Eixo) + <strong>valor</strong> (Valores) → gráfico de barras</li>
              <li>Expanda <strong>grafico_pizza</strong> → <strong>categoria</strong> (Legenda) + <strong>valor</strong> (Valores) → gráfico de pizza</li>
              <li>Expanda <strong>grafico_linha</strong> → <strong>data</strong> (Eixo) + <strong>valor</strong> (Valores) → gráfico de linha</li>
              <li>Expanda <strong>resumo</strong> → arraste KPIs para cartões</li>
            </ol>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <button onClick={atualizarDados} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar
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

function KpiBox({ label, value, cor }: { label: string; value: string; cor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-2.5 text-center dark:border-white/10">
      <p className="text-[9px] font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-bold ${cor}`}>{value}</p>
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
  const [novoIcone, setNovoIcone] = useState("link");
  const [novoCor, setNovoCor] = useState("#25D366");
  const { usuario } = useAuth();

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase.from("quick_links").select("*").order("ordem");
    setLinks(data || []);
  }

  async function adicionar() {
    if (!novoLabel || !novoUrl) return;
    const { data: existing } = await supabase.from("quick_links").select("id");
    const ordem = (existing?.length || 0) + 1;
    await supabase.from("quick_links").insert({ label: novoLabel, url: novoUrl, icone: novoIcone, cor: novoCor, ativo: true, ordem });
    setNovoLabel(""); setNovoUrl("");
    toast.success("Link adicionado!");
    void carregar();
  }

  async function remover(id: string) {
    await supabase.from("quick_links").delete().eq("id", id);
    toast.success("Link removido!");
    void carregar();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10"><Link2 className="h-5 w-5 text-blue-600" /></div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 dark:text-white">Links Rápidos</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Adicione atalhos para sistemas externos (PDV, WhatsApp, Fornecedor, etc.)</p>
        </div>
      </div>

      <div className="mb-4 space-y-2">
        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-white/10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: link.cor + "20" }}>
              <span className="text-xs" style={{ color: link.cor }}>{link.icone?.charAt(0).toUpperCase() || "🔗"}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{link.label}</p>
              <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{link.url}</a>
            </div>
            <button onClick={() => remover(link.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={novoLabel} onChange={(e) => setNovoLabel(e.target.value)} placeholder="Nome do link" className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
        <input value={novoUrl} onChange={(e) => setNovoUrl(e.target.value)} placeholder="https://..." className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
      </div>
      <button onClick={adicionar} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
        <Plus className="h-4 w-4" /> Adicionar Link
      </button>
    </div>
  );
}
