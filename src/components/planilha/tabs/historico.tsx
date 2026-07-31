import {
  type DashboardData,
  CATEGORIAS,
  fmtBRL,
  fmtPct,
  fmtData,
  somaPorDia,
  statusDe,
} from "@/lib/planilha/data";
import { LineChart, DonutChart } from "@/components/planilha/charts";
import { GoalsManager, SalesEntry, EmployeeEntry } from "@/components/planilha/data-manager";
import { VendasTable, IndicadoresTable } from "@/components/planilha/tabs/historico-tables";
import {
  OrionnLogo,
  KpiCard,
  Panel,
  StatusPill,
  ProgressBar,
  Delta,
  DashFooter,
} from "@/components/planilha/kit";

// ── 06 - Histórico de Vendas (lançamentos) + Indicadores sincronizados ───────
export function Historico({ d }: { d: DashboardData }) {
  const total = d.atuais.reduce((s, r) => s + r.valor, 0);
  const metasAtuais = [...d.metaMap.entries()].flatMap(([chave, valor]) => {
    const [categoria, vendedor] = chave.split("|");
    if (vendedor === "loja") return [];
    return [{ categoria, vendedorId: Number(vendedor), valor }];
  });

  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <OrionnLogo />
          <div className="border-l border-[#28518f] pl-5">
            <h1 className="text-xl font-extrabold text-white uppercase">Histórico de Vendas</h1>
            <p className="text-[11px] text-sky-200">
              Lançamentos diários + indicadores sincronizados — fonte de todas as fórmulas da planilha
            </p>
          </div>
        </div>
      </div>

      {/* Lançamentos de venda com edição/exclusão e busca */}
      <div className="rounded-lg overflow-hidden shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white border border-[#1c4585]">
          <div className="flex items-center gap-3">
            <span>Lançamentos no filtro ({d.atuais.length})</span>
            <span className="text-sky-200">Total: {fmtBRL(total)}</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/export/csv" className="rounded-md border border-emerald-300 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100 transition hover:bg-white/20" title="Baixar histórico em CSV">⬇ CSV</a>
            <EmployeeEntry />
            <GoalsManager vendedores={d.vendedoresList} metas={metasAtuais} />
            <SalesEntry vendedores={d.vendedoresList} defaultDate={d.filtros.fim} />
          </div>
        </div>
        <VendasTable
          rows={d.atuais.map((r) => ({
            id: r.id, data: r.data, vendedorId: r.vendedorId, vendedorNome: r.vendedorNome,
            categoria: r.categoria, valor: r.valor, clientes: r.clientes, ticketMedio: r.ticketMedio,
          }))}
          vendedores={d.vendedoresList}
        />
      </div>

      {/* Indicadores sincronizados */}
      <div className="rounded-lg overflow-hidden shadow-md">
        <div className="bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white border border-[#1c4585]">
          Indicadores Sincronizados — Metas por Vendedor e Categoria ({d.indicadores.length} registros)
        </div>
        <IndicadoresTable
          rows={d.indicadores.map((r) => ({
            id: r.id, vendedorNome: r.vendedorNome, categoria: r.categoria,
            meta: r.meta, realizado: r.realizado, projecao: r.projecao, atingimento: r.atingimento,
          }))}
        />
      </div>
      <DashFooter />
    </div>
  );
}

// ── 07/08/09 - Abas individuais por vendedor ─────────────────────────────────
const DONUT_COLORS = ["#1a56c5", "#f59e0b", "#16a34a", "#dc2626"];

export function VendedorSheet({ d, vendedorId }: { d: DashboardData; vendedorId: number }) {
  const v = d.vendedoresList.find((x) => x.id === vendedorId)!;
  const a = d.porVendedor[vendedorId];
  const indRows = d.indicadoresTodos.filter((r) => r.vendedorId === vendedorId);
  const rows = d.todas.filter(
    (r) => r.vendedorId === vendedorId && r.data >= d.filtros.inicio && r.data <= d.filtros.fim,
  );
  const dias = somaPorDia(rows);

  const porCategoria = CATEGORIAS.map((c) => {
    const cr = indRows.filter((r) => r.categoria === c);
    const meta = cr.reduce((s, r) => s + r.meta, 0);
    const realizado = cr.reduce((s, r) => s + r.realizado, 0);
    const projecao = cr.reduce((s, r) => s + r.projecao, 0);
    const pct = meta > 0 ? (realizado / meta) * 100 : 0;
    return { categoria: c, meta, realizado, projecao, pct };
  });

  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <OrionnLogo />
          <div className="border-l border-[#28518f] pl-5">
            <h1 className="text-xl font-extrabold text-white">{v.nome}</h1>
            <p className="text-[11px] text-sky-200">
              Painel individual — {v.cargo} · desempenho por categoria no período
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#28518f] bg-[#12315e] px-4 py-3 text-[11px] text-white shadow-md">
        <div><span className="block text-[9px] font-bold uppercase tracking-wider text-sky-200">Matrícula</span><strong>{v.matricula || "Não informada"}</strong></div>
        <div><span className="block text-[9px] font-bold uppercase tracking-wider text-sky-200">E-mail</span><strong>{v.email || "Não informado"}</strong></div>
        <div><span className="block text-[9px] font-bold uppercase tracking-wider text-sky-200">Status</span><span className="inline-flex rounded-full bg-emerald-400/20 px-2 py-0.5 font-bold text-emerald-200">{v.status}</span></div>
        {v.email && <a href={`mailto:${v.email}`} className="ml-auto rounded-md bg-[#1a56c5] px-3 py-1.5 font-bold text-white hover:bg-[#1d63e0]">✉ Enviar e-mail</a>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <KpiCard icon="🎯" title="Meta Total" value={fmtBRL(a.meta)} subtitle="Soma das metas por categoria" />
        <KpiCard icon="💲" title="Realizado" value={fmtBRL(a.realizado)} subtitle={`${fmtPct(a.atingimento)} da meta`} />
        <KpiCard icon="📈" title="Projeção" value={fmtBRL(a.projecao)} subtitle="Projeção de fechamento" />
        <KpiCard icon="🎯" title="% Atingimento" value={fmtPct(a.atingimento)} delta="— vs período anterior" deltaGood={null} />
        <KpiCard icon="👥" title="Clientes" value={String(a.clientes)} subtitle="Atendidos no período" />
        <KpiCard icon="🛒" title="Vendas Lançadas" value={fmtBRL(a.vendasValor)} subtitle={`Ticket médio ${a.ticketMedio > 0 ? fmtBRL(a.ticketMedio) : "—"}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Panel title="Evolução Diária (Lançamentos de Venda)" icon="📈">
          {dias.length > 0 ? (
            <LineChart points={dias.map((x) => ({ label: fmtData(x.data), value: x.valor }))} />
          ) : (
            <div className="flex h-[220px] items-center justify-center text-[11px] text-slate-400">Sem lançamentos no período</div>
          )}
        </Panel>
        <Panel title="Participação por Categoria (Realizado)">
          {a.realizado > 0 ? (
            <div className="flex items-center gap-4">
              <DonutChart
                slices={porCategoria.map((c, i) => ({
                  label: c.categoria,
                  value: c.realizado,
                  color: DONUT_COLORS[i],
                }))}
                centerTop={fmtBRL(a.realizado).replace(",00", "")}
                centerBottom="Total"
                size={180}
              />
              <div className="flex flex-col gap-2">
                {porCategoria.map((c, i) => (
                  <div key={c.categoria} className="flex items-center gap-2 text-[10.5px] text-slate-700">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLORS[i] }} />
                    <span className="font-semibold">{c.categoria}:</span> {fmtBRL(c.realizado)}{" "}
                    ({fmtPct(a.realizado > 0 ? (c.realizado / a.realizado) * 100 : 0)})
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[190px] items-center justify-center text-[11px] text-slate-400">Sem realizado no período</div>
          )}
        </Panel>
      </div>

      <div className="rounded-lg overflow-hidden shadow-md">
        <div className="bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white border border-[#1c4585]">
          Desempenho por Categoria — {v.nome}
        </div>
        <table className="w-full bg-white text-[11px]">
          <thead>
            <tr className="bg-[#12315e] text-white text-[10px] uppercase">
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-right">Meta (R$)</th>
              <th className="px-3 py-2 text-right">Realizado (R$)</th>
              <th className="px-3 py-2 text-right">Projeção (R$)</th>
              <th className="px-3 py-2 text-center">% Atingimento</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-center">Δ vs Anterior</th>
            </tr>
          </thead>
          <tbody>
            {porCategoria.map((c) => (
              <tr key={c.categoria} className="border-b border-slate-200">
                <td className="px-3 py-2.5 font-semibold text-slate-800">{c.categoria}</td>
                <td className="px-3 py-2.5 text-right">{fmtBRL(c.meta)}</td>
                <td className="px-3 py-2.5 text-right">{fmtBRL(c.realizado)}</td>
                <td className="px-3 py-2.5 text-right">{fmtBRL(c.projecao)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-2">
                    <ProgressBar pct={c.pct} />
                    <span className="font-bold">{fmtPct(c.pct)}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center"><StatusPill status={statusDe(c.pct)} /></td>
                <td className="px-3 py-2.5 text-center"><Delta v={null} /></td>
              </tr>
            ))}
            <tr className="bg-[#0d2b57] text-white font-extrabold">
              <td className="px-3 py-2.5">TOTAL</td>
              <td className="px-3 py-2.5 text-right">{fmtBRL(a.meta)}</td>
              <td className="px-3 py-2.5 text-right">{fmtBRL(a.realizado)}</td>
              <td className="px-3 py-2.5 text-right">{fmtBRL(a.projecao)}</td>
              <td className="px-3 py-2.5 text-center">{fmtPct(a.atingimento)}</td>
              <td className="px-3 py-2.5 text-center"><StatusPill status={a.status} /></td>
              <td className="px-3 py-2.5 text-center"><Delta v={a.variacao} /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <DashFooter />
    </div>
  );
}
