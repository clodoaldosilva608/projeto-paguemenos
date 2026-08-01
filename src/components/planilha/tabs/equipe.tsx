import { type DashboardData, somaPorDia, CATEGORIAS } from "@/lib/planilha/data";
import { fmtBRL, fmtPct } from "@/lib/planilha/format";
import { EquipeTable, type FuncionarioLinha } from "@/components/planilha/tabs/equipe-table";
import { BarChartH } from "@/components/planilha/charts";
import { StackedBar } from "@/components/planilha/charts-extra";
import { RadarChart } from "@/components/planilha/charts-radar";
import { GoalSimulator } from "@/components/planilha/goal-simulator";
import { ImportCsvButton } from "@/components/planilha/import-csv";

const ABA_POR_ID: Record<number, string> = {
  1: "adelino", 2: "alicia", 3: "clodoaldo", 5: "elielton", 6: "fabio", 7: "mieko",
};
const CAT_COLORS: Record<string, string> = {
  Faturamento: "#1a56c5",
  "Marcas Exclusivas": "#f59e0b",
  Genéricos: "#16a34a",
  "Super Desconto": "#dc2626",
};

export function Equipe({ d, filterQuery }: { d: DashboardData; filterQuery: string }) {
  const linhas: FuncionarioLinha[] = d.vendedoresList.map((v) => {
    const ag = d.porVendedor[v.id];
    const vendasDoVendedor = d.todas.filter(
      (r) => r.vendedorId === v.id && r.data >= d.filtros.inicio && r.data <= d.filtros.fim,
    );
    const serie = somaPorDia(vendasDoVendedor).map((x) => x.valor);
    return {
      id: v.id,
      nome: v.nome,
      cargo: v.cargo,
      matricula: v.matricula,
      email: v.email,
      status: v.status,
      meta: ag?.meta ?? 0,
      realizado: ag?.realizado ?? 0,
      projecao: ag?.projecao ?? 0,
      atingimento: ag?.atingimento ?? 0,
      clientes: ag?.clientes ?? 0,
      vendasValor: ag?.vendasValor ?? 0,
      serie,
      aba: ABA_POR_ID[v.id] ?? null,
    };
  });

  const ativos = linhas.filter((l) => l.status === "Ativo").length;
  const ferias = linhas.filter((l) => l.status === "Férias").length;
  const inativos = linhas.filter((l) => l.status === "Inativo").length;
  const dentroMeta = linhas.filter((l) => l.meta > 0 && l.atingimento >= 70).length;
  const comMeta = linhas.filter((l) => l.meta > 0);
  const mediaAting = comMeta.length > 0 ? comMeta.reduce((s, l) => s + l.atingimento, 0) / comMeta.length : 0;
  const metaTotal = linhas.reduce((s, l) => s + l.meta, 0);
  const realizadoTotal = linhas.reduce((s, l) => s + l.realizado, 0);

  const ranking = [...linhas].filter((l) => l.realizado > 0).sort((a, b) => b.realizado - a.realizado).slice(0, 6);

  // Radar: até 4 vendedores com maior realizado, comparados por atingimento em cada categoria.
  const CORES_RADAR = ["#1a56c5", "#16a34a", "#f59e0b", "#dc2626"];
  const radarSeries = [...linhas]
    .filter((l) => l.meta > 0)
    .sort((a, b) => b.realizado - a.realizado)
    .slice(0, 4)
    .map((l, i) => ({
      nome: l.nome,
      cor: CORES_RADAR[i % CORES_RADAR.length],
      valores: CATEGORIAS.map((c) => {
        const inds = d.indicadoresTodos.filter((r) => r.vendedorId === l.id && r.categoria === c);
        const meta = inds.reduce((s, r) => s + r.meta, 0);
        const real = inds.reduce((s, r) => s + r.realizado, 0);
        return meta > 0 ? (real / meta) * 100 : 0;
      }),
    }));

  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="border-l border-[#28518f] pl-5">
            <h1 className="text-xl font-extrabold uppercase text-white">Gestão de Equipe</h1>
            <p className="text-[11px] text-sky-200">
              Cadastro completo, status e desempenho consolidado de todos os funcionários
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard dark bg="#0d3b66" icon="👥" title="Total de Funcionários" value={String(linhas.length)} subtitle={`${ativos} ativos · ${ferias} em férias · ${inativos} inativos`} />
        <KpiCard dark bg="#0e7a5f" icon="✅" title="Dentro da Meta" value={String(dentroMeta)} subtitle={`de ${comMeta.length} com meta definida`} />
        <KpiCard dark bg="#e08700" icon="📊" title="Atingimento Médio" value={fmtPct(mediaAting)} subtitle="Média entre os vendedores" ring={mediaAting} />
        <KpiCard dark bg="#1a56c5" icon="🎯" title="Meta da Equipe" value={fmtBRL(metaTotal)} subtitle="Soma das metas individuais" />
        <KpiCard dark bg="#6d28d9" icon="💲" title="Realizado da Equipe" value={fmtBRL(realizadoTotal)} subtitle={`${fmtPct(metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0)} da meta`} />
        <KpiCard dark bg="#0891b2" icon="🛒" title="Clientes Atendidos" value={String(linhas.reduce((s, l) => s + l.clientes, 0))} subtitle="No período filtrado" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Ranking de Realizado por Funcionário" className="xl:col-span-2">
          {ranking.length > 0 ? (
            <BarChartH
              bars={ranking.map((r, i) => ({
                label: r.nome.replace(" dos ", " dos\n").replace(" da ", " da\n").replace(" (", "\n("),
                value: r.realizado,
                medal: i < 3 ? `${i + 1}º` : undefined,
              }))}
            />
          ) : (
            <div className="flex h-[190px] items-center justify-center text-[11px] text-slate-400">Nenhum realizado no período</div>
          )}
        </Panel>

        <Panel title="Composição do Realizado por Categoria">
          <div className="flex flex-col gap-3 pt-1">
            <StackedBar
              segments={CATEGORIAS.map((c) => ({ label: c, value: d.porCategoria[c].realizado, color: CAT_COLORS[c] }))}
            />
            <div className="flex flex-col gap-2">
              {CATEGORIAS.map((c) => {
                const val = d.porCategoria[c].realizado;
                const pctv = realizadoTotal > 0 ? (val / realizadoTotal) * 100 : 0;
                return (
                  <div key={c} className="flex items-center justify-between text-[10.5px] text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CAT_COLORS[c] }} />
                      {c}
                    </span>
                    <span className="font-semibold whitespace-nowrap">{fmtBRL(val)} · {fmtPct(pctv, 1)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-1 rounded-lg bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600">
              Clique no <strong>status</strong> de um funcionário na tabela para alternar entre Ativo → Férias → Inativo.
            </div>
          </div>
        </Panel>
      </div>

      {/* Radar comparativo + simulador what-if */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel title="Radar Comparativo — Atingimento por Categoria" icon="🕸">
          {radarSeries.length > 0 ? (
            <RadarChart eixos={[...CATEGORIAS]} series={radarSeries} size={280} />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[11px] text-slate-400">
              Nenhum vendedor com meta definida para comparar
            </div>
          )}
        </Panel>

        <Panel title="Simulador de Metas (What-if)" icon="🔮">
          <GoalSimulator
            categorias={CATEGORIAS.map((c) => ({
              nome: c,
              cor: CAT_COLORS[c],
              meta: d.porCategoria[c].meta,
              realizado: d.porCategoria[c].realizado,
              projecao: d.porCategoria[c].projecao,
            }))}
          />
        </Panel>
      </div>

      <div className="overflow-hidden rounded-lg shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#1c4585] bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white">
          <span>Cadastro de Funcionários ({linhas.length} registros)</span>
          <div className="flex items-center gap-2">
            <ImportCsvButton compact />
            <span className="text-sky-200">Clique em 📊 para abrir o painel individual</span>
          </div>
        </div>
        <EquipeTable rows={linhas} filterQuery={filterQuery} />
      </div>

      <DashFooter />
    </div>
  );
}
