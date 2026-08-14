import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useFilial } from "@/contexts/FilialContext";
import { getDashboardData, type DashboardData } from "@/lib/planilha/data";
import type { DashboardFilters, DashboardFilterInput } from "@/lib/planilha/filters";
import { DashboardGeral } from "./tabs/dashboard-geral";
import { CategoriaDashboard } from "./tabs/categoria";
import { Historico, VendedorSheet } from "./tabs/historico";
import { Equipe } from "./tabs/equipe";
import { Auditoria } from "./tabs/auditoria";
import { Formulas, Manual } from "./tabs/documentacao";
import { GestaoMetas } from "./tabs/gestao-metas";
import { FilterControls } from "./interactive-controls";

const TABS_FIXAS = [
  { slug: "dashboard", label: "01 - Dashboard" },
  { slug: "faturamento", label: "02 - Faturamento" },
  { slug: "marcas", label: "03 - Marcas Exclusivas" },
  { slug: "genericos", label: "04 - Genéricos" },
  { slug: "super-desconto", label: "05 - Super Desconto" },
  { slug: "historico", label: "06 - Histórico" },
  { slug: "gestao-metas", label: "07 - Gestão de Metas" },
] as const;

const TABS = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "faturamento", label: "Faturamento" },
  { slug: "marcas", label: "Marcas" },
  { slug: "genericos", label: "Genéricos" },
  { slug: "super-desconto", label: "Super Desconto" },
  { slug: "historico", label: "Histórico" },
] as const;
const TABS_FINAIS = [
  { slug: "equipe", label: "Gestão de Equipe" },
  { slug: "auditoria", label: "Auditoria" },
  { slug: "formulas", label: "Fórmulas" },
  { slug: "manual", label: "Manual" },
] as const;

type TabSlug = string;

export default function PlanilhaInternaPage() {
  const { usuario } = useAuth();
  const { filialFiltro } = useFilial();
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<string>("7d");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [vendedorId, setVendedorId] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [active, setActive] = useState<TabSlug>("dashboard");
  const [filtros, setFiltros] = useState<DashboardFilters | null>(null);
  const [menuTabsAberto, setMenuTabsAberto] = useState(false);
  const [menuFiltrosAberto, setMenuFiltrosAberto] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    void carregar({ periodo: "7d" });
  }, [usuario, filialFiltro]);

  function aplicarFiltro(patch: any) {
    const p = patch.periodo ?? periodo;
    setPeriodo(p);
    void carregar({ periodo: p });
  }

  async function carregar(input: DashboardFilterInput) {
    setLoading(true); setErro(null);
    try {
      const d = await getDashboardData(input, { usuario, filialFiltro });
      setData(d); setFiltros(d.filtros);
    } catch (e: any) { setErro(e.message); }
    finally { setLoading(false); }
  }

  function handleFiltroChange(patch: Partial<DashboardFilters>) {
    if (!filtros) return;
    void carregar({
      periodo: patch.periodo ?? filtros.periodo,
      inicio: (patch.periodo === "custom" || filtros.periodo === "custom") ? (patch.inicio ?? filtros.inicio) : undefined,
      fim: (patch.periodo === "custom" || filtros.periodo === "custom") ? (patch.fim ?? filtros.fim) : undefined,
      vendedor: patch.vendedorId !== undefined ? (patch.vendedorId ? String(patch.vendedorId) : undefined) : (filtros.vendedorId ? String(filtros.vendedorId) : undefined),
    });
  }

  if (loading && !data) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a1f3d]"><Loader2 className="h-8 w-8 animate-spin text-sky-400" /></div>;
  if (erro) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a1f3d]"><AlertCircle className="h-8 w-8 text-red-400" /><p className="ml-2 text-red-300">{erro}</p></div>;
  if (!data || !filtros) return null;

  // Construir tabs
  const vendedorTabs = data.vendedoresList.slice(0, 6).map((v, i) => ({
    slug: `vendedor-${v.id}` as string,
    label: `${String(TABS_FIXAS.length + 1 + i).padStart(2, "0")} - ${v.nome.split(" ")[0]}`,
  }));
  const allTabs = [
    ...TABS_FIXAS.map(t => ({ slug: t.slug as string, label: t.label })),
    ...vendedorTabs,
    ...TABS_FINAIS.map((t, i) => ({
      slug: t.slug as string,
      label: `${String(TABS_FIXAS.length + vendedorTabs.length + 1 + i).padStart(2, "0")} - ${t.label}`,
    })),
  ];

  // Tab ativa label
  const activeTab = allTabs.find(t => t.slug === active);

  let content: React.ReactNode;
  if (active === "dashboard") content = <DashboardGeral d={data} />;
  else if (active === "faturamento") content = <CategoriaDashboard d={data} categoria="Faturamento" subtitulo="Análise completa de faturamento" />;
  else if (active === "marcas") content = <CategoriaDashboard d={data} categoria="Marcas Exclusivas" subtitulo="Análise de Marcas Exclusivas" />;
  else if (active === "genericos") content = <CategoriaDashboard d={data} categoria="Genéricos" subtitulo="Análise de Genéricos" />;
  else if (active === "super-desconto") content = <CategoriaDashboard d={data} categoria="Super Desconto" subtitulo="Análise de Super Desconto" />;
  else if (active === "historico") content = <Historico d={data} />;
  else if (active === "gestao-metas") content = <GestaoMetas d={data} />;
  else if (active.startsWith("vendedor-")) content = <VendedorSheet d={data} vendedorId={Number(active.replace("vendedor-", ""))} />;
  else if (active === "equipe") content = <Equipe d={data} filterQuery="" />;
  else if (active === "auditoria") content = <Auditoria d={data} />;
  else if (active === "formulas") content = <Formulas />;
  else if (active === "manual") content = <Manual />;
  else content = <DashboardGeral d={data} />;

  return (
    <div className="min-h-[100dvh] bg-[#0a1f3d] text-slate-100">
      {/* TabBar slim */}
      <div className="sticky top-0 z-20 flex items-center gap-0.5 border-b border-white/5 bg-[#0d2640] px-2 py-1.5 overflow-x-auto">
        <button
          onClick={() => { window.location.href = "/"; }}
          className="flex items-center gap-1 whitespace-nowrap rounded-md bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          title="Voltar para Dashboard"
        >
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </button>
        <div className="mx-1 h-4 w-px bg-white/10" />
        {TABS.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActive(t.slug)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              active === t.slug ? "bg-sky-500/20 text-sky-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros slim */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-[#0d2640]/50 px-3 py-1.5">
        <select value={periodo} onChange={(e) => aplicarFiltro({ periodo: e.target.value })} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
          <option value="3d" className="bg-slate-800">3 dias</option>
          <option value="7d" className="bg-slate-800">7 dias</option>
          <option value="mes" className="bg-slate-800">Mês</option>
          <option value="custom" className="bg-slate-800">Personalizado</option>
        </select>
        {periodo === "custom" && (
          <>
            <input type="date" value={inicio} onChange={(e) => aplicarFiltro({ inicio: e.target.value })} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-200" />
            <input type="date" value={fim} onChange={(e) => aplicarFiltro({ fim: e.target.value })} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-slate-200" />
          </>
        )}
        <select value={vendedorId} onChange={(e) => aplicarFiltro({ vendedorId: e.target.value })} className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200">
          <option value="" className="bg-slate-800">Todos vendedores</option>
          {data.vendedoresList.map((v) => (
            <option key={v.id} value={v.id} className="bg-slate-800">{v.nome}</option>
          ))}
        </select>
      </div>

      {/* Conteúdo */}
      <div className="p-2 sm:p-3 lg:p-4">
        {content}
      </div>
    </div>
  );
}
