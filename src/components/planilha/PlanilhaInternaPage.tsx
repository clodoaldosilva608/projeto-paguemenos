import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
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
import { TabBar } from "./kit";

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

  // Construir tabs (fixas + vendedores + finais)
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
    <div className="sheet-content min-h-[100dvh] bg-[#0a1f3d]">
      <TabBar
        active={active}
        filtros={filtros}
        tabs={allTabs}
        onTabChange={setActive}
        onFiltroChange={handleFiltroChange}
        vendedores={data.vendedoresList.map(v => ({ id: v.id, nome: v.nome, cargo: v.cargo }))}
      />
      <div className="p-4">{content}</div>
    </div>
  );
}
