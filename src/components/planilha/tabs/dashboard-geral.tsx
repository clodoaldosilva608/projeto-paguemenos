import {
  type DashboardData,
  CATEGORIAS,
  fmtBRL,
  fmtPct,
  fmtData,
  somaPorDia,
  somaPorVendedor,
  indicadoresPorVendedor,
} from "@/lib/planilha/data";
import { LineChart, DonutChart, BarChartV } from "@/components/planilha/charts";
import { Gauge, CalendarHeatmap } from "@/components/planilha/charts-extra";
import { WaterfallChart } from "@/components/planilha/charts-radar";
import { gerarInsights, resumoExecutivo } from "@/lib/planilha/insights";
import { InsightsPanel, ExecutiveBanner } from "@/components/planilha/insights-panel";
import { Podium } from "@/components/planilha/ui/podium";
import { ActivityFeed, montarFeed } from "@/components/planilha/ui/activity-feed";
import {
  KpiCard,
  Panel,
  StatusPill,
  ProgressBar,
  Delta,
  DashFooter,
} from "@/components/planilha/kit";

const CAT_COLORS: Record<string, string> = {
  Faturamento: "#1a56c5",
  "Marcas Exclusivas": "#f59e0b",
  Genéricos: "#16a34a",
  "Super Desconto": "#dc2626",
};

export function DashboardGeral({ d }: { d: DashboardData }) {
  const t = d.total;
  const dias = somaPorDia(d.atuais);
  const ranking = somaPorVendedor(d.atuais);
  const insights = gerarInsights(d);
  const resumo = resumoExecutivo(d);
  const rankingIndicadores = indicadoresPorVendedor(d.indicadores);
  const feed = montarFeed(d.atuais, d.auditoria);

  return (
    <div className="flex flex-col gap-3">
      {/* Resumo executivo */}
      <ExecutiveBanner texto={resumo.texto} tone={resumo.tone} />

      {/* KPIs — grid responsivo: 2 col mobile, 4 tablet, 8 desktop */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:grid-cols-4 xl:grid-cols-8">
        <KpiCard dark bg="#0d3b66" icon="🛒" title="Faturamento" value={fmtBRL(t.realizado)} subtitle="Realizado" delta={t.variacao !== null ? `${t.variacao >= 0 ? "↑" : "↓"} ${fmtPct(Math.abs(t.variacao), 1)}` : "—"} deltaGood={t.variacao !== null ? t.variacao >= 0 : null} animateValue={t.realizado} animateFormat="brl" />
        <KpiCard dark bg="#0e7a5f" icon="🎯" title="Meta" value={fmtBRL(t.meta)} subtitle="Loja" delta="—" deltaGood={null} animateValue={t.meta} animateFormat="brl" />
        <KpiCard dark bg="#1a56c5" icon="🚀" title="Projeção" value={fmtBRL(t.projecao)} subtitle="Fechamento" delta={`↑ ${fmtPct((t.projecao / Math.max(t.realizado, 1) - 1) * 100, 1)}`} deltaGood animateValue={t.projecao} animateFormat="brl" />
        <KpiCard dark bg="#e08700" icon="📈" title="Atingimento" value={fmtPct(t.atingimento)} subtitle="Meta" delta="—" deltaGood={null} ring={t.atingimento} animateValue={t.atingimento} animateFormat="pct" />
        <KpiCard dark bg="#6d28d9" icon="👥" title="Clientes" value={String(t.clientes)} subtitle="Atendidos" delta="—" deltaGood={null} animateValue={t.clientes} animateFormat="int" />
        <KpiCard dark bg="#0891b2" icon="🎟️" title="Ticket Médio" value={fmtBRL(t.ticketMedio)} subtitle="Por cliente" delta="—" deltaGood={null} animateValue={t.ticketMedio} animateFormat="brl" />
        <KpiCard dark bg="#1e3a8a" icon="🛍️" title="Vendas" value={fmtBRL(t.vendasValor)} subtitle="Lançamentos" delta="—" deltaGood={null} animateValue={t.vendasValor} animateFormat="brl" />
        <KpiCard dark bg="#334155" icon="👤" title="Vendedores" value={String(new Set(d.atuais.map((r) => r.vendedorId)).size)} subtitle="Ativos" delta="—" deltaGood={null} animateValue={new Set(d.atuais.map((r) => r.vendedorId)).size} animateFormat="int" />
      </div>

      {/* Gráficos — 1 coluna mobile, 3 colunas desktop */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        {/* Evolução */}
        <Panel title="Evolução de Vendas" icon="📈" delay={0}>
          <div className="w-full overflow-hidden">
            <LineChart points={dias.map((x) => ({ label: fmtData(x.data), value: x.valor }))} />
          </div>
        </Panel>

        {/* Donut */}
        <Panel title="Participação por Categoria" delay={90}>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <div className="flex-shrink-0">
              <DonutChart
                inner={0}
                size={140}
                slices={CATEGORIAS.map((c) => ({
                  label: c,
                  value: d.porCategoria[c].vendasValor,
                  color: CAT_COLORS[c],
                }))}
              />
            </div>
            <div className="flex w-full flex-col gap-1">
              {CATEGORIAS.map((c) => (
                <div key={c} className="flex items-center gap-1.5 text-[10px]">
                  <span className="inline-block h-2 w-2 flex-shrink-0 rounded-sm" style={{ background: CAT_COLORS[c] }} />
                  <span className="flex-1 truncate text-slate-600">{c}</span>
                  <span className="font-bold text-slate-700">{fmtBRL(d.porCategoria[c].vendasValor)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Ranking */}
        <Panel title="Ranking de Vendedores" icon="📊" delay={180}>
          <BarChartV
            bars={ranking.slice(0, 10).map((r, i) => ({
              label: r.nome.split(" ")[0],
              value: r.valor,
              color: i === 0 ? "#0e7a5f" : "#1a56c5",
              medal: `${i + 1}º`,
            }))}
          />
        </Panel>
      </div>

      {/* Pódio + Feed */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Panel title="Pódio" icon="🏆" delay={0}>
          <Podium
            items={rankingIndicadores.slice(0, 3).map((r) => ({
              nome: r.nome.split(" ")[0],
              valor: r.realizado,
              atingimento: r.atingimento,
            }))}
          />
        </Panel>
        <Panel title="Atividade Recente" icon="⚡" delay={110}>
          <ActivityFeed items={feed.slice(0, 5)} />
        </Panel>
      </div>

      {/* Velocímetro + Calendário + Decomposição */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Panel title="Velocímetro" icon="🚀" delay={0}>
          <div className="flex flex-col items-center">
            <Gauge pct={t.atingimento} label={fmtPct(t.atingimento)} sublabel="da meta" size={180} />
            <div className="mt-1 grid w-full grid-cols-3 gap-1 text-center">
              <div className="rounded bg-slate-50 p-1.5">
                <div className="text-[8px] font-bold uppercase text-slate-400">Meta</div>
                <div className="text-[9px] font-bold text-slate-700 truncate">{fmtBRL(t.meta)}</div>
              </div>
              <div className="rounded bg-slate-50 p-1.5">
                <div className="text-[8px] font-bold uppercase text-slate-400">Realizado</div>
                <div className="text-[9px] font-bold text-[#1a56c5] truncate">{fmtBRL(t.realizado)}</div>
              </div>
              <div className="rounded bg-slate-50 p-1.5">
                <div className="text-[8px] font-bold uppercase text-slate-400">Gap</div>
                <div className="text-[9px] font-bold text-rose-600 truncate">{fmtBRL(Math.abs(t.meta - t.realizado))}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Calendário de Vendas" icon="📅" delay={90}>
          <CalendarHeatmap dias={dias} />
        </Panel>

        <Panel title="Decomposição Meta × Realizado" icon="🧱" delay={180}>
          <WaterfallChart
            meta={t.meta}
            parcelas={CATEGORIAS.map((c) => ({
              label: c.split(" ")[0],
              valor: d.porCategoria[c].realizado,
              cor: CAT_COLORS[c],
            }))}
          />
        </Panel>
      </div>

      {/* Atingimento por categoria */}
      <Panel title="Atingimento por Categoria" icon="📊" delay={0}>
        <div className="space-y-1.5">
          {CATEGORIAS.map((c) => {
            const cat = d.porCategoria[c];
            const cor = cat.atingimento >= 100 ? "#16a34a" : cat.atingimento >= 70 ? "#22c55e" : cat.atingimento >= 50 ? "#f59e0b" : "#dc2626";
            return (
              <div key={c} className="flex items-center gap-2">
                <span className="w-28 flex-shrink-0 text-[10px] font-medium text-slate-600 truncate">{c}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, cat.atingimento)}%`, background: cor }} />
                </div>
                <span className="w-12 flex-shrink-0 text-right text-[10px] font-bold" style={{ color: cor }}>{fmtPct(cat.atingimento)}</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Insights */}
      <Panel title="Insights Automáticos" icon="💡" delay={0}>
        <InsightsPanel insights={insights} />
      </Panel>

      {/* Tabela de indicadores */}
      <Panel title="Indicadores por Vendedor" icon="📋" delay={0}>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[9px] uppercase text-slate-400">
                <th className="px-1.5 py-1">#</th>
                <th className="px-1.5 py-1">Vendedor</th>
                <th className="px-1.5 py-1 text-right">Meta</th>
                <th className="px-1.5 py-1 text-right">Realizado</th>
                <th className="px-1.5 py-1 text-right">Projeção</th>
                <th className="px-1.5 py-1 text-right">%</th>
                <th className="px-1.5 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {rankingIndicadores.map((r, i) => (
                <tr key={r.vendedorId} className="border-b border-slate-50">
                  <td className="px-1.5 py-1 text-slate-400">{i + 1}</td>
                  <td className="px-1.5 py-1 truncate max-w-[80px] font-medium text-slate-700">{r.nome.split(" ")[0]}</td>
                  <td className="px-1.5 py-1 text-right text-slate-500">{fmtBRL(r.meta)}</td>
                  <td className="px-1.5 py-1 text-right font-semibold text-emerald-600">{fmtBRL(r.realizado)}</td>
                  <td className="px-1.5 py-1 text-right text-blue-600">{fmtBRL(r.projecao)}</td>
                  <td className="px-1.5 py-1 text-right font-bold" style={{ color: r.atingimento >= 70 ? "#16a34a" : r.atingimento >= 50 ? "#f59e0b" : "#dc2626" }}>{fmtPct(r.atingimento)}</td>
                  <td className="px-1.5 py-1"><StatusPill status={r.atingimento >= 70 ? "Dentro da Meta" : r.atingimento >= 30 ? "Atenção" : "Fora da Meta"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <DashFooter />
    </div>
  );
}
