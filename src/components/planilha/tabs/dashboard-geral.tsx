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
  OrionnLogo,
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
  const barColors = ["#0e7a5f", "#1a56c5", "#1a56c5"];
  const insights = gerarInsights(d);
  const resumo = resumoExecutivo(d);
  const rankingIndicadores = indicadoresPorVendedor(d.indicadores);
  const feed = montarFeed(d.atuais, d.auditoria);

  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <OrionnLogo />
      </div>

      {/* Resumo executivo + filtros ativos */}
      <div className="flex flex-col gap-2">
        <ExecutiveBanner texto={resumo.texto} tone={resumo.tone} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <KpiCard dark bg="#0d3b66" icon="🛒" title="Faturamento Total" value={fmtBRL(t.realizado)} subtitle="Realizado" delta={t.variacao !== null ? `${t.variacao >= 0 ? "↑" : "↓"} ${fmtPct(Math.abs(t.variacao), 1)} vs período anterior` : "— vs período anterior"} deltaGood={t.variacao !== null ? t.variacao >= 0 : null} animateValue={t.realizado} animateFormat="brl" />
        <KpiCard dark bg="#0e7a5f" icon="🎯" title="Meta Total" value={fmtBRL(t.meta)} subtitle="Meta da Loja" delta="— vs período anterior" deltaGood={null} animateValue={t.meta} animateFormat="brl" />
        <KpiCard dark bg="#1a56c5" icon="🚀" title="Projeção" value={fmtBRL(t.projecao)} subtitle="Projeção de Fechamento" delta={`↑ ${fmtPct((t.projecao / Math.max(t.realizado, 1) - 1) * 100, 1)} vs realizado`} deltaGood animateValue={t.projecao} animateFormat="brl" />
        <KpiCard dark bg="#e08700" icon="📈" title="% Atingimento" value={fmtPct(t.atingimento)} subtitle="Meta Global" delta="— vs período anterior" deltaGood={null} ring={t.atingimento} animateValue={t.atingimento} animateFormat="pct" />
        <KpiCard dark bg="#6d28d9" icon="👥" title="Clientes" value={String(t.clientes)} subtitle="Total de Clientes" delta="— vs período anterior" deltaGood={null} animateValue={t.clientes} animateFormat="int" />
        <KpiCard dark bg="#0891b2" icon="🎟️" title="Ticket Médio" value={fmtBRL(t.ticketMedio)} subtitle="Ticket Médio Geral" delta="— vs período anterior" deltaGood={null} animateValue={t.ticketMedio} animateFormat="brl" />
        <KpiCard dark bg="#1e3a8a" icon="🛍️" title="Vendas" value={fmtBRL(t.vendasValor)} subtitle="Total de Vendas" delta="— vs período anterior" deltaGood={null} animateValue={t.vendasValor} animateFormat="brl" />
        <KpiCard dark bg="#334155" icon="👤" title="Vendedores" value={String(new Set(d.atuais.map((r) => r.vendedorId)).size)} subtitle="Ativos no Período" delta="— vs período anterior" deltaGood={null} animateValue={new Set(d.atuais.map((r) => r.vendedorId)).size} animateFormat="int" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Panel title="Evolução de Vendas (Faturamento)" icon="📈" delay={0}>
          <LineChart
            points={dias.map((x) => ({ label: fmtData(x.data), value: x.valor }))}
          />
          <div className="flex justify-center gap-2 text-[10px] text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#1a56c5] mt-0.5" />
            Faturamento
          </div>
        </Panel>

        <Panel title="Participação por Categoria" delay={90}>
          <div className="flex items-center gap-4">
            <DonutChart
              inner={0}
              size={175}
              slices={CATEGORIAS.map((c) => ({
                label: c,
                value: d.porCategoria[c].vendasValor,
                color: CAT_COLORS[c],
              }))}
            />
            <div className="flex flex-col gap-2">
              <div className="text-[10px] font-bold uppercase text-[#1a56c5] rise-in" style={{ animationDelay: "220ms" }}>
                Faturamento
              </div>
              <div className="text-lg font-extrabold text-slate-900 rise-in" style={{ animationDelay: "280ms" }}>
                {fmtBRL(t.realizado)}
              </div>
              <div className="text-sm font-bold text-[#1a56c5] rise-in" style={{ animationDelay: "340ms" }}>100%</div>
              {CATEGORIAS.map((c, idx) => (
                <div
                  key={c}
                  className="group flex cursor-default items-center gap-2 rounded px-1 py-0.5 text-[10.5px] text-slate-700 rise-left transition-all duration-200 hover:translate-x-1 hover:bg-slate-50 hover:font-semibold"
                  style={{ animationDelay: `${400 + idx * 80}ms` }}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm transition-transform duration-200 group-hover:scale-150"
                    style={{ background: CAT_COLORS[c] }}
                  />
                  {c}
                  <span className="ml-auto text-[9.5px] font-bold text-slate-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {fmtBRL(d.porCategoria[c].vendasValor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Ranking dos Vendedores (Faturamento)" icon="📊" delay={180}>
          <BarChartV
            bars={ranking.map((r, i) => ({
              label: r.nome.replace(" dos ", " dos\n").replace(" da ", " da\n").replace(" (", "\n("),
              value: r.valor,
              color: barColors[i] ?? "#1a56c5",
              medal: `${i + 1}º`,
            }))}
          />
        </Panel>
      </div>

      {/* Pódio + Feed de atividade */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Panel title="Pódio dos Vendedores" icon="🏆" delay={0}>
          <Podium
            items={rankingIndicadores.slice(0, 3).map((r) => ({
              nome: r.nome,
              valor: r.realizado,
              atingimento: r.atingimento,
            }))}
          />
        </Panel>
        <Panel title="Atividade Recente" icon="⚡" delay={110}>
          <ActivityFeed items={feed} />
        </Panel>
      </div>

      {/* Velocímetro + calendário + waterfall + mix */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Velocímetro de Atingimento" icon="🚀" delay={0}>
          <div className="flex flex-col items-center pt-1">
            <Gauge pct={t.atingimento} label={fmtPct(t.atingimento)} sublabel="da meta global" size={230} />
            <div className="mt-1 grid w-full grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Meta</div>
                <div className="text-[11px] font-extrabold text-slate-800">{fmtBRL(t.meta)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Realizado</div>
                <div className="text-[11px] font-extrabold text-[#1a56c5]">{fmtBRL(t.realizado)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Gap</div>
                <div className={`text-[11px] font-extrabold ${t.meta - t.realizado > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {fmtBRL(Math.abs(t.meta - t.realizado))}
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Calendário de Vendas (Intensidade Diária)" icon="📅" delay={90}>
          <CalendarHeatmap dias={dias} />
        </Panel>

        <Panel title="Decomposição Meta × Realizado" icon="🧱" delay={180}>
          <WaterfallChart
            meta={t.meta}
            parcelas={CATEGORIAS.filter((c) => d.porCategoria[c].realizado > 0).map((c) => ({
              label: c,
              valor: d.porCategoria[c].realizado,
              cor: CAT_COLORS[c],
            }))}
          />
        </Panel>

        <Panel title="Atingimento por Categoria" icon="🎯" delay={270}>
          <div className="flex flex-col gap-3 pt-1">
            {CATEGORIAS.map((c, idx) => {
              const a = d.porCategoria[c];
              const cor = a.atingimento >= 70 ? "#16a34a" : a.atingimento >= 30 ? "#f59e0b" : "#dc2626";
              return (
                <div
                  key={c}
                  className="group cursor-default rounded-lg p-1 transition-colors duration-200 hover:bg-slate-50 rise-in"
                  style={{ animationDelay: `${idx * 115}ms` }}
                >
                  <div className="mb-1 flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm transition-transform duration-200 group-hover:scale-125"
                        style={{ background: CAT_COLORS[c] }}
                      />
                      {c}
                    </span>
                    <span className="font-bold text-slate-800 transition-transform duration-200 group-hover:scale-105" style={{ color: cor }}>
                      {fmtPct(a.atingimento)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="relative h-full overflow-hidden rounded-full bar-fill transition-all duration-300 group-hover:brightness-110"
                      style={{
                        width: `${Math.min(a.atingimento, 100)}%`,
                        background: cor,
                        animationDelay: `${idx * 115 + 170}ms`,
                      }}
                    >
                      <span className="absolute inset-0 shimmer-bar" style={{ animationDelay: `${idx * 115 + 700}ms` }} />
                    </div>
                  </div>
                  <div className="mt-0.5 flex justify-between text-[9px] text-slate-400">
                    <span>{fmtBRL(a.realizado)}</span>
                    <span>meta {fmtBRL(a.meta)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Insights automáticos */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-sky-200 rise-left">
          <span className="text-sm animate-pulse-soft">💡</span> Insights Automáticos do Período
        </h3>
        <InsightsPanel insights={insights} />
      </div>

      {/* Tabela de desempenho */}
      <div className="rounded-lg overflow-hidden shadow-md animate-slide-up">
        <div className="relative overflow-hidden border border-[#1c4585] bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white">
          <span className="absolute inset-0 shimmer-bar opacity-40" aria-hidden />
          <span className="relative">Desempenho Geral por Indicador</span>
        </div>
        <table className="w-full bg-white text-[11px]">
          <thead>
            <tr className="bg-[#12315e] text-white text-[10px] uppercase">
              <th className="px-3 py-2 text-left w-20">Posição</th>
              <th className="px-3 py-2 text-left">Indicador</th>
              <th className="px-3 py-2 text-right">Meta (R$)</th>
              <th className="px-3 py-2 text-right">Realizado (R$)</th>
              <th className="px-3 py-2 text-right">Projeção (R$)</th>
              <th className="px-3 py-2 text-center">% Atingimento</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">Δ vs Período Anterior</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS.map((c, i) => {
              const a = d.porCategoria[c];
              return (
                <tr
                  key={c}
                  className="group border-b border-slate-200 row-in transition-colors duration-200 hover:bg-blue-50/60"
                  style={{ animationDelay: `${i * 95}ms` }}
                >
                  <td className="px-3 py-2.5 text-slate-600">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9.5px] font-bold text-slate-500 transition-all duration-200 group-hover:bg-[#1a56c5] group-hover:text-white">
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 transition-transform duration-200 group-hover:translate-x-1">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm transition-transform duration-200 group-hover:scale-125" style={{ background: CAT_COLORS[c] }} />
                      {c}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">{fmtBRL(a.meta)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtBRL(a.realizado)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtBRL(a.projecao)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <ProgressBar pct={a.atingimento} delay={i * 90 + 200} />
                      <span className="font-bold">{fmtPct(a.atingimento)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Delta v={a.variacao} />
                  </td>
                </tr>
              );
            })}
            <tr
              className="relative bg-[#0d2b57] font-extrabold text-white row-in transition-colors duration-200 hover:bg-[#123a70]"
              style={{ animationDelay: `${CATEGORIAS.length * 95}ms` }}
            >
              <td className="px-3 py-2.5" colSpan={2}>
                TOTAL GERAL
              </td>
              <td className="px-3 py-2.5 text-right">{fmtBRL(t.meta)}</td>
              <td className="px-3 py-2.5 text-right">{fmtBRL(t.realizado)}</td>
              <td className="px-3 py-2.5 text-right">{fmtBRL(t.projecao)}</td>
              <td className="px-3 py-2.5 text-center">{fmtPct(t.atingimento)}</td>
              <td className="px-3 py-2.5 text-center">
                <StatusPill status={t.status} />
              </td>
              <td className="px-3 py-2.5 text-center">
                <Delta v={t.variacao} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <DashFooter fonte={false} />
    </div>
  );
}
