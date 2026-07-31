import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Menu, X } from "lucide-react";
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
import { FilterControls } from "./interactive-controls";

const TABS_FIXAS = [
  { slug: "dashboard", label: "01 - Dashboard" },
  { slug: "faturamento", label: "02 - Faturamento" },
  { slug: "marcas", label: "03 - Marcas Exclusivas" },
  { slug: "genericos", label: "04 - Genéricos" },
  { slug: "super-desconto", label: "05 - Super Desconto" },
  { slug: "historico", label: "06 - Histórico" },
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
  else if (active.startsWith("vendedor-")) content = <VendedorSheet d={data} vendedorId={Number(active.replace("vendedor-", ""))} />;
  else if (active === "equipe") content = <Equipe d={data} filterQuery="" />;
  else if (active === "auditoria") content = <Auditoria d={data} />;
  else if (active === "formulas") content = <Formulas />;
  else if (active === "manual") content = <Manual />;
  else content = <DashboardGeral d={data} />;

  return (
    <div className="sheet-content min-h-[100dvh] bg-[#0a1f3d] text-slate-100">
      {/* Header sticky com TabBar responsiva */}
      <div className="sticky top-0 z-30 bg-[#0d2640] border-b border-white/5">
        {/* Linha 1: aba ativa + botões */}
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => setMenuTabsAberto(!menuTabsAberto)}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-white/10"
          >
            {menuTabsAberto ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
            <span className="truncate max-w-[120px] sm:max-w-none">{activeTab?.label || "Dashboard"}</span>
          </button>
          <button
            onClick={() => setMenuFiltrosAberto(!menuFiltrosAberto)}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/10"
          >
            <span>🗂️</span>
            <span className="hidden sm:inline">Filtros</span>
          </button>
          <span className="ml-auto text-[10px] text-slate-500">
            {data.atuais.length} lançamentos
          </span>
        </div>

        {/* Linha 2: tabs scrolláveis (mobile) / todas visíveis (desktop) */}
        <div className={`px-2 pb-2 ${menuTabsAberto ? "block" : "hidden lg:block"}`}>
          <div className="flex flex-wrap gap-0.5 max-h-[200px] overflow-y-auto">
            {allTabs.map((t) => (
              <button
                key={t.slug}
                onClick={() => { setActive(t.slug); setMenuTabsAberto(false); }}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                  active === t.slug
                    ? "bg-sky-500/20 text-sky-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 3: filtros */}
        <div className={`px-3 pb-2 ${menuFiltrosAberto ? "block" : "hidden lg:block"}`}>
          <FilterControls
            filtros={filtros}
            vendedores={data.vendedoresList.map(v => ({ id: v.id, nome: v.nome, cargo: v.cargo }))}
            onChange={handleFiltroChange}
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-2 sm:p-3 lg:p-4">
        {content}
      </div>
    </div>
  );
}
