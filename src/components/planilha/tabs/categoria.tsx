import {
  type DashboardData,
  type Categoria,
  CATEGORIAS,
  fmtBRL,
  fmtPct,
  fmtData,
  somaPorDia,
  somaPorVendedor,
  indicadoresPorVendedor,
  statusDe,
} from "@/lib/planilha/data";
import { LineChart, DonutChart, BarChartH } from "@/components/planilha/charts";
import {
  
  KpiCard,
  Panel,
  StatusPill,
  ProgressBar,
  Delta,
  DashFooter,
} from "@/components/planilha/kit";

const DONUT_COLORS = ["#1a56c5", "#f59e0b", "#16a34a", "#6d28d9", "#dc2626", "#0891b2"];

export function CategoriaDashboard({
  d,
  categoria,
  subtitulo,
}: {
  d: DashboardData;
  categoria: Categoria;
  subtitulo: string;
}) {
  const a = d.porCategoria[categoria];
  const rows = d.atuais.filter((r) => r.categoria === categoria);
  const prevRows = d.anteriores.filter((r) => r.categoria === categoria);
  const indRows = d.indicadores.filter((r) => r.categoria === categoria);
  const porVend = indicadoresPorVendedor(indRows);
  const dias = somaPorDia(rows);
  const vendasRanking = somaPorVendedor(rows);
  const anterior = prevRows.reduce((s, r) => s + r.valor, 0);

  // Donut: Faturamento → participação das categorias (realizado sincronizado);
  // demais abas → participação por vendedor (realizado do indicador).
  const donut =
    categoria === "Faturamento"
      ? CATEGORIAS.map((c, i) => ({
          label: c,
          value: d.porCategoria[c].realizado,
          color: DONUT_COLORS[i],
        }))
      : porVend.map((v, i) => ({
          label: v.nome,
          value: v.realizado,
          color: DONUT_COLORS[i % DONUT_COLORS.length],
        }));
  const donutTotal = donut.reduce((s, x) => s + x.value, 0);
  const donutBase = categoria === "Faturamento" ? d.total.realizado : a.realizado;

  // Ranking: Faturamento usa lançamentos de venda; demais usam realizado do indicador.
  const rankingBars =
    categoria === "Faturamento" && vendasRanking.length > 0
      ? vendasRanking.map((r) => ({ nome: r.nome, valor: r.valor }))
      : porVend.filter((v) => v.realizado > 0).map((v) => ({ nome: v.nome, valor: v.realizado }));

  // Faixas de valor
  const faixaFonte =
    categoria === "Faturamento"
      ? vendasRanking.map((r) => r.valor)
      : porVend.map((v) => v.realizado);
  const faixas = [
    { label: `Acima de ${fmtBRL(10000)}`, color: "#1a56c5", valor: 0 },
    { label: `De ${fmtBRL(5000.01)} até ${fmtBRL(10000)}`, color: "#f59e0b", valor: 0 },
    { label: `Até ${fmtBRL(5000)}`, color: "#16a34a", valor: 0 },
  ];
  for (const v of faixaFonte) {
    if (v > 10000) faixas[0].valor += v;
    else if (v > 5000) faixas[1].valor += v;
    else faixas[2].valor += v;
  }
  const faixaTotal = faixas.reduce((s, f) => s + f.valor, 0);

  // Top dias (lançamentos)
  const topDias = [...dias].sort((x, y) => y.valor - x.valor).slice(0, 5);
  const diasDetalhe = topDias.map((dia) => {
    const rr = rows.filter((r) => r.data === dia.data);
    const clientesN = rr.reduce((s, r) => s + r.clientes, 0);
    return { ...dia, clientes: clientesN };
  });
  const topTotais = diasDetalhe.reduce(
    (acc, x) => ({ valor: acc.valor + x.valor, clientes: acc.clientes + x.clientes }),
    { valor: 0, clientes: 0 },
  );

  const varAbs = a.vendasValor - anterior;
  const varPct = anterior > 0 ? (varAbs / anterior) * 100 : null;

  // Tabela de desempenho por vendedor (indicadores + lançamentos)
  const tableRows = porVend.map((v) => {
    const vr = rows.filter((r) => r.vendedorId === v.vendedorId);
    const vendasValor = vr.reduce((s, r) => s + r.valor, 0);
    const clientes = vr.reduce((s, r) => s + r.clientes, 0);
    return {
      ...v,
      status: statusDe(v.atingimento),
      clientes,
      vendasValor,
      ticket: clientes > 0 ? vendasValor / clientes : 0,
    };
  });

  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="border-l border-[#28518f] pl-5">
            <h1 className="text-xl font-extrabold text-white uppercase">{categoria}</h1>
            <p className="text-[11px] text-sky-200">{subtitulo}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        <KpiCard icon="🎯" title="Meta Total" value={fmtBRL(a.meta)} subtitle="100% da meta definida" />
        <KpiCard icon="💲" title="Realizado" value={fmtBRL(a.realizado)} subtitle={`${fmtPct(a.atingimento)} da meta`} />
        <KpiCard icon="📈" title="Projeção" value={fmtBRL(a.projecao)} subtitle={`${fmtPct(a.meta > 0 ? (a.projecao / a.meta) * 100 : 0)} da meta`} />
        <KpiCard icon="🎯" title="% Atingimento" value={fmtPct(a.atingimento)} delta={a.variacao !== null ? `${a.variacao >= 0 ? "↑" : "↓"} ${fmtPct(Math.abs(a.variacao), 1)} vs período anterior` : "— vs período anterior"} deltaGood={a.variacao !== null ? a.variacao >= 0 : null} />
        <KpiCard icon="👥" title="Clientes" value={String(a.clientes)} subtitle="Total de clientes" />
        <KpiCard icon="🎟️" title="Ticket Médio" value={fmtBRL(a.ticketMedio)} subtitle="Por venda" />
        <KpiCard icon="🛒" title="Total Vendas" value={fmtBRL(a.vendasValor)} subtitle="Vendas lançadas no período" />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Panel title={`Evolução ${categoria === "Faturamento" ? "do Faturamento" : `de ${categoria}`}`} icon="📈">
          {dias.length > 0 ? (
            <>
              <LineChart points={dias.map((x) => ({ label: fmtData(x.data), value: x.valor }))} />
              <div className="flex justify-center gap-2 text-[10px] text-slate-600">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#1a56c5] mt-0.5" />
                {categoria}
              </div>
            </>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-[11px] text-slate-400">
              Sem lançamentos de venda no período selecionado
            </div>
          )}
        </Panel>

        <Panel title={categoria === "Faturamento" ? "Faturamento por Categoria" : "Participação por Vendedor"}>
          {donutTotal > 0 ? (
            <div className="flex items-center gap-3">
              <DonutChart
                slices={donut}
                centerTop={fmtBRL(donutBase).replace(",00", "")}
                centerBottom="Total"
                size={180}
              />
              <div className="flex flex-col gap-1.5 min-w-0">
                {donut.map((s) => (
                  <div key={s.label} className="flex items-start gap-2 text-[10px] text-slate-700">
                    <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="min-w-0">
                      <span className="font-semibold">{s.label}</span>
                      <br />
                      {fmtBRL(s.value)} ({fmtPct(donutTotal > 0 ? (s.value / donutTotal) * 100 : 0)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[190px] items-center justify-center text-[11px] text-slate-400">
              Sem dados para exibir
            </div>
          )}
        </Panel>

        <Panel title={`Ranking dos Vendedores (${categoria})`}>
          {rankingBars.length > 0 ? (
            <BarChartH
              bars={rankingBars.map((r, i) => ({
                label: r.nome.replace(" dos ", " dos\n").replace(" da ", " da\n").replace(" (", "\n("),
                value: r.valor,
                medal: `${i + 1}º`,
              }))}
            />
          ) : (
            <div className="flex h-[190px] items-center justify-center text-[11px] text-slate-400">
              Nenhum vendedor com realizado nesta categoria
            </div>
          )}
        </Panel>
      </div>

      {/* Tabela por vendedor */}
      <div className="rounded-lg overflow-hidden shadow-md">
        <div className="bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white border border-[#1c4585]">
          Desempenho de {categoria} por Vendedor
        </div>
        <div className="overflow-x-auto">
          <table className="w-full bg-white text-[11px]">
            <thead>
              <tr className="bg-[#12315e] text-white text-[10px] uppercase">
                <th className="px-3 py-2 text-left w-16">Posição</th>
                <th className="px-3 py-2 text-left">Vendedor</th>
                <th className="px-3 py-2 text-right">Meta (R$)</th>
                <th className="px-3 py-2 text-right">Realizado (R$)</th>
                <th className="px-3 py-2 text-right">Projeção (R$)</th>
                <th className="px-3 py-2 text-center">% Atingimento</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Variação vs Anterior</th>
                <th className="px-3 py-2 text-right">Ticket Médio</th>
                <th className="px-3 py-2 text-right">Clientes</th>
                <th className="px-3 py-2 text-right">Vendas (R$)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={r.vendedorId} className="border-b border-slate-200">
                  <td className="px-3 py-2.5 text-slate-600">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{r.nome}</td>
                  <td className="px-3 py-2.5 text-right">{fmtBRL(r.meta)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtBRL(r.realizado)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtBRL(r.projecao)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-bold">{fmtPct(r.atingimento)}</span>
                      <ProgressBar pct={r.atingimento} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Delta v={null} />
                  </td>
                  <td className="px-3 py-2.5 text-right">{r.ticket > 0 ? fmtBRL(r.ticket) : "—"}</td>
                  <td className="px-3 py-2.5 text-right">{r.clientes}</td>
                  <td className="px-3 py-2.5 text-right">{r.vendasValor > 0 ? fmtBRL(r.vendasValor) : "—"}</td>
                </tr>
              ))}
              <tr className="bg-[#0d2b57] text-white font-extrabold">
                <td className="px-3 py-2.5" colSpan={2}>TOTAL GERAL</td>
                <td className="px-3 py-2.5 text-right">{fmtBRL(a.meta)}</td>
                <td className="px-3 py-2.5 text-right">{fmtBRL(a.realizado)}</td>
                <td className="px-3 py-2.5 text-right">{fmtBRL(a.projecao)}</td>
                <td className="px-3 py-2.5 text-center">{fmtPct(a.atingimento)}</td>
                <td className="px-3 py-2.5 text-center"><StatusPill status={a.status} /></td>
                <td className="px-3 py-2.5 text-center"><Delta v={a.variacao} /></td>
                <td className="px-3 py-2.5 text-right">{a.ticketMedio > 0 ? fmtBRL(a.ticketMedio) : "—"}</td>
                <td className="px-3 py-2.5 text-right">{a.clientes}</td>
                <td className="px-3 py-2.5 text-right">{fmtBRL(a.vendasValor)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Linha inferior */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <Panel title={`Top ${Math.max(topDias.length, 1)} Dias — ${categoria}`}>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="text-left text-slate-500 uppercase text-[9.5px] border-b border-slate-200">
                <th className="py-1.5">Data</th>
                <th className="py-1.5 text-right">Valor (R$)</th>
                <th className="py-1.5 text-right">Clientes</th>
                <th className="py-1.5 text-right">Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              {diasDetalhe.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-slate-400">Sem lançamentos no período</td></tr>
              )}
              {diasDetalhe.map((x) => (
                <tr key={x.data} className="border-b border-slate-100">
                  <td className="py-1.5">{fmtData(x.data)}</td>
                  <td className="py-1.5 text-right font-semibold text-[#1a56c5]">{fmtBRL(x.valor)}</td>
                  <td className="py-1.5 text-right">{x.clientes}</td>
                  <td className="py-1.5 text-right">{fmtBRL(x.clientes > 0 ? x.valor / x.clientes : 0)}</td>
                </tr>
              ))}
              <tr className="font-extrabold">
                <td className="py-1.5">TOTAL</td>
                <td className="py-1.5 text-right">{fmtBRL(topTotais.valor)}</td>
                <td className="py-1.5 text-right">{topTotais.clientes}</td>
                <td className="py-1.5 text-right">{fmtBRL(topTotais.clientes > 0 ? topTotais.valor / topTotais.clientes : 0)}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel title="Análise Comparativa">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex flex-col gap-2 text-[10.5px] text-slate-700">
              <div className="flex justify-between"><span>Vendas Período Anterior</span><span className="font-semibold">{fmtBRL(anterior)}</span></div>
              <div className="flex justify-between"><span>Vendas Período Atual</span><span className="font-semibold">{fmtBRL(a.vendasValor)}</span></div>
              <div className="flex justify-between"><span>Variação Absoluta</span><span className="font-semibold">{fmtBRL(varAbs)}</span></div>
              <div className="flex justify-between items-center">
                <span>Variação Percentual</span>
                <Delta v={varPct} />
              </div>
            </div>
            <svg viewBox="0 0 160 150" className="w-[150px]">
              {(() => {
                const max = Math.max(anterior, a.vendasValor, 1) * 1.15;
                const h = (v: number) => (v / max) * 100;
                return (
                  <>
                    <rect x={25} y={120 - h(anterior)} width={40} height={Math.max(h(anterior), 1)} fill="#94a3b8" rx={2} />
                    <rect x={95} y={120 - h(a.vendasValor)} width={40} height={Math.max(h(a.vendasValor), 1)} fill="#1a56c5" rx={2} />
                    <text x={45} y={112 - h(anterior)} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#334155">{fmtBRL(anterior)}</text>
                    <text x={115} y={112 - h(a.vendasValor)} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="#1a56c5">{fmtBRL(a.vendasValor)}</text>
                    <text x={45} y={135} textAnchor="middle" fontSize={9} fill="#64748b">Anterior</text>
                    <text x={115} y={135} textAnchor="middle" fontSize={9} fill="#64748b">Atual</text>
                  </>
                );
              })()}
            </svg>
          </div>
        </Panel>

        <Panel title={`Distribuição por Faixa de Valor (${categoria})`}>
          {faixaTotal > 0 ? (
            <div className="flex items-center gap-3">
              <DonutChart
                slices={faixas.map((f) => ({ label: f.label, value: f.valor, color: f.color }))}
                size={130}
              />
              <div className="flex flex-col gap-2 flex-1">
                {faixas.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-2 text-[10px] text-slate-700">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />
                      {f.label}
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {fmtBRL(f.valor)} · {fmtPct(faixaTotal > 0 ? (f.valor / faixaTotal) * 100 : 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[130px] items-center justify-center text-[11px] text-slate-400">
              Sem dados para exibir
            </div>
          )}
        </Panel>
      </div>

      <DashFooter />
    </div>
  );
}
