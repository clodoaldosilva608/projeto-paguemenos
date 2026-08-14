// Planilha Interna — dashboard executivo slim e elegante.
// Layout otimizado: paddings reduzidos, gaps menores, sombras sutis, tipografia consistente.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useFilial } from "@/contexts/FilialContext";
import {
  getDashboardData, somaPorDia, somaPorVendedor, indicadoresPorVendedor,
  type DashboardData, type DashboardFilterInput,
} from "@/lib/planilha/data";
import {
  fmtBRL, fmtPct, fmtData, fmtInt, corDe,
  CATEGORIAS, CATEGORIA_CORES, CATEGORIA_ICONES, type Categoria,
} from "@/lib/planilha/format";

const TABS = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "faturamento", label: "Faturamento" },
  { slug: "marcas", label: "Marcas" },
  { slug: "genericos", label: "Genéricos" },
  { slug: "super-desconto", label: "Super Desconto" },
  { slug: "historico", label: "Histórico" },
  { slug: "equipe", label: "Equipe" },
  { slug: "auditoria", label: "Auditoria" },
] as const;

type TabSlug = typeof TABS[number]["slug"] | string;

export default function PlanilhaInternaPage() {
  const { usuario } = useAuth();
  const { filialFiltro } = useFilial();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [active, setActive] = useState<TabSlug>("dashboard");
  const [periodo, setPeriodo] = useState<string>("7d");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [vendedorId, setVendedorId] = useState<string>("");

  useEffect(() => {
    if (!usuario) return;
    void carregar({ periodo: "7d" });
  }, [usuario, filialFiltro]);

  async function carregar(input: DashboardFilterInput) {
    setLoading(true); setErro(null);
    try {
      const d = await getDashboardData(input, { usuario, filialFiltro });
      setData(d);
    } catch (e: any) { setErro(e.message); }
    finally { setLoading(false); }
  }

  function aplicarFiltro(patch: { periodo?: string; inicio?: string; fim?: string; vendedorId?: string }) {
    const p = patch.periodo ?? periodo;
    const i = patch.inicio ?? inicio;
    const f = patch.fim ?? fim;
    const v = patch.vendedorId ?? vendedorId;
    setPeriodo(p); setInicio(i); setFim(f); setVendedorId(v);
    void carregar({
      periodo: p,
      inicio: p === "custom" ? i : undefined,
      fim: p === "custom" ? f : undefined,
      vendedor: v || undefined,
    });
  }

  if (loading && !data) return <LoadingScreen />;
  if (erro) return <ErrorScreen msg={erro} />;
  if (!data) return null;

  return (
    <div className="min-h-[100dvh] bg-[#0a1f3d] text-slate-100">
      {/* TabBar slim */}
      <div className="sticky top-0 z-20 flex items-center gap-0.5 border-b border-white/5 bg-[#0d2640] px-2 py-1.5 overflow-x-auto">
        <button
          onClick={() => navigate({ to: "/" })}
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
              active === t.slug
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtros slim */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-[#0d2640]/50 px-3 py-1.5">
        <select
          value={periodo}
          onChange={(e) => aplicarFiltro({ periodo: e.target.value })}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200"
        >
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
        <select
          value={vendedorId}
          onChange={(e) => aplicarFiltro({ vendedorId: e.target.value })}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-200"
        >
          <option value="" className="bg-slate-800">Todos vendedores</option>
          {data.vendedoresList.map((v) => (
            <option key={v.id} value={v.id} className="bg-slate-800">{v.nome}</option>
          ))}
        </select>
        <span className="ml-auto text-[10px] text-slate-500">
          {fmtData(data.filtros.inicio)} → {fmtData(data.filtros.fim)} · {data.atuais.length} lançamentos
        </span>
      </div>

      {/* Conteúdo */}
      <div className="p-3">
        {active === "dashboard" && <DashboardGeral d={data} />}
        {active === "faturamento" && <CategoriaView d={data} cat="Faturamento" />}
        {active === "marcas" && <CategoriaView d={data} cat="Marcas Exclusivas" />}
        {active === "genericos" && <CategoriaView d={data} cat="Genéricos" />}
        {active === "super-desconto" && <CategoriaView d={data} cat="Super Desconto" />}
        {active === "historico" && <HistoricoView d={data} />}
        {active === "equipe" && <EquipeView d={data} />}
        {active === "auditoria" && <AuditoriaView d={data} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ════════════════════════════════════════════════════════════════════════════

function DashboardGeral({ d }: { d: DashboardData }) {
  const t = d.total;
  const dias = somaPorDia(d.atuais);
  const ranking = somaPorVendedor(d.atuais);
  const inds = indicadoresPorVendedor(d.indicadores);

  return (
    <div className="space-y-3">
      {/* Banner executivo slim */}
      <BannerSlim pct={t.atingimento} meta={t.meta} realizado={t.realizado} projecao={t.projecao} />

      {/* KPIs — grid denso */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Kpi icon="🛒" label="Faturamento" value={fmtBRL(t.realizado)} sub="Realizado" cor="#0d3b66" />
        <Kpi icon="🎯" label="Meta" value={fmtBRL(t.meta)} sub="Loja" cor="#0e7a5f" />
        <Kpi icon="🚀" label="Projeção" value={fmtBRL(t.projecao)} sub="Fechamento" cor="#1a56c5" />
        <Kpi icon="📈" label="Atingimento" value={fmtPct(t.atingimento)} sub="Meta global" cor="#e08700" ring={t.atingimento} />
        <Kpi icon="👥" label="Clientes" value={fmtInt(t.clientes)} sub="Atendidos" cor="#6d28d9" />
        <Kpi icon="🎟️" label="Ticket Médio" value={fmtBRL(t.ticketMedio)} sub="Por cliente" cor="#0891b2" />
        <Kpi icon="🛍️" label="Vendas" value={fmtBRL(t.vendasValor)} sub="Lançamentos" cor="#1e3a8a" />
        <Kpi icon="👤" label="Vendedores" value={fmtInt(new Set(d.atuais.map(r => r.vendedorId)).size)} sub="Ativos" cor="#334155" />
      </div>

      {/* Gráficos — 3 colunas em desktop */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <Panel title="Evolução de Vendas" icon="📈">
          <LineChartSlim points={dias.map(x => ({ label: fmtData(x.data), value: x.valor }))} />
        </Panel>
        <Panel title="Participação por Categoria" icon="🥧">
          <DonutSlim slices={CATEGORIAS.map(c => ({
            label: c, value: d.porCategoria[c].vendasValor, color: CATEGORIA_CORES[c],
          }))} />
        </Panel>
        <Panel title="Ranking de Vendedores" icon="🏆">
          <BarsSlim items={ranking.slice(0, 6).map(r => ({ label: r.nome.split(" ")[0], value: r.valor }))} />
        </Panel>
      </div>

      {/* Cards por categoria — slim */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIAS.map(c => {
          const cat = d.porCategoria[c];
          return (
            <div key={c} className="rounded-lg bg-white/[0.03] p-2.5 border border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-slate-300">{CATEGORIA_ICONES[c]} {c}</span>
                <span className="text-[11px] font-bold" style={{ color: corDe(cat.atingimento) }}>{fmtPct(cat.atingimento)}</span>
              </div>
              <div className="space-y-0.5 text-[10px]">
                <Row label="Meta" value={fmtBRL(cat.meta)} />
                <Row label="Realizado" value={fmtBRL(cat.realizado)} cor="#22c55e" />
                <Row label="Projeção" value={fmtBRL(cat.projecao)} cor="#3b82f6" />
                <Row label="Vendas" value={fmtBRL(cat.vendasValor)} />
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, cat.atingimento)}%`, background: corDe(cat.atingimento) }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights + Tabela */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Panel title="Insights Automáticos" icon="💡">
          <InsightsSlim d={d} />
        </Panel>
        <Panel title="Indicadores por Vendedor" icon="📊">
          <IndicadoresTable inds={inds} />
        </Panel>
      </div>
    </div>
  );
}

function CategoriaView({ d, cat }: { d: DashboardData; cat: Categoria }) {
  const c = d.porCategoria[cat];
  const inds = d.indicadores.filter(i => i.categoria === cat);
  const vendasCat = d.atuais.filter(v => v.categoria === cat);
  const dias = somaPorDia(vendasCat);

  return (
    <div className="space-y-3">
      <div className="rounded-lg p-3" style={{ background: `linear-gradient(135deg, ${CATEGORIA_CORES[cat]}33, ${CATEGORIA_CORES[cat]}11)` }}>
        <h2 className="text-lg font-bold text-white">{CATEGORIA_ICONES[cat]} {cat}</h2>
        <p className="text-[11px] text-slate-300">Análise completa de desempenho</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi icon="🎯" label="Meta" value={fmtBRL(c.meta)} sub="Total" cor={CATEGORIA_CORES[cat]} />
        <Kpi icon="✅" label="Realizado" value={fmtBRL(c.realizado)} sub="Atual" cor="#0e7a5f" />
        <Kpi icon="🚀" label="Projeção" value={fmtBRL(c.projecao)} sub="Fechamento" cor="#1a56c5" />
        <Kpi icon="📈" label="Atingimento" value={fmtPct(c.atingimento)} sub="Meta" cor="#e08700" ring={c.atingimento} />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Panel title="Evolução Diária" icon="📈">
          <LineChartSlim points={dias.map(x => ({ label: fmtData(x.data), value: x.valor }))} color={CATEGORIA_CORES[cat]} />
        </Panel>
        <Panel title="Por Vendedor" icon="📊">
          <BarsSlim items={indicadoresPorVendedor(inds).map(r => ({ label: r.nome.split(" ")[0], value: r.realizado }))} color={CATEGORIA_CORES[cat]} />
        </Panel>
      </div>
    </div>
  );
}

function HistoricoView({ d }: { d: DashboardData }) {
  return (
    <Panel title="Histórico de Vendas" icon="📅">
      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-[#0d2640]">
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="px-2 py-1.5">Data</th>
              <th className="px-2 py-1.5">Vendedor</th>
              <th className="px-2 py-1.5">Categoria</th>
              <th className="px-2 py-1.5 text-right">Valor</th>
              <th className="px-2 py-1.5 text-right">Clientes</th>
            </tr>
          </thead>
          <tbody>
            {d.atuais.slice().sort((a, b) => b.data.localeCompare(a.data)).map(v => (
              <tr key={v.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-2 py-1 text-slate-400">{fmtData(v.data)}</td>
                <td className="px-2 py-1 text-slate-200">{v.vendedorNome.split(" ")[0]}</td>
                <td className="px-2 py-1 text-slate-400">{v.categoria}</td>
                <td className="px-2 py-1 text-right font-semibold text-slate-100">{fmtBRL(v.valor)}</td>
                <td className="px-2 py-1 text-right text-slate-400">{v.clientes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function EquipeView({ d }: { d: DashboardData }) {
  const inds = indicadoresPorVendedor(d.indicadoresTodos);
  return (
    <Panel title="Gestão de Equipe" icon="👥">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
        <Kpi icon="✅" label="Ativos" value={fmtInt(d.vendedoresList.filter(v => v.status === "Ativo").length)} sub="Vendedores" cor="#0e7a5f" />
        <Kpi icon="🎯" label="Meta Total" value={fmtBRL(d.total.meta)} sub="Equipe" cor="#1a56c5" />
        <Kpi icon="💰" label="Realizado" value={fmtBRL(d.total.realizado)} sub="Equipe" cor="#0891b2" />
        <Kpi icon="📈" label="Atingimento" value={fmtPct(d.total.atingimento)} sub="Média" cor="#e08700" ring={d.total.atingimento} />
      </div>
      <IndicadoresTable inds={inds} />
    </Panel>
  );
}

function AuditoriaView({ d }: { d: DashboardData }) {
  return (
    <Panel title="Auditoria & Atividades" icon="📜">
      <div className="max-h-[60vh] overflow-y-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-[#0d2640]">
            <tr className="text-left text-[10px] uppercase text-slate-400">
              <th className="px-2 py-1.5">Quando</th>
              <th className="px-2 py-1.5">Ação</th>
              <th className="px-2 py-1.5">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {d.auditoria.map(a => (
              <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-2 py-1 text-slate-400">{new Date(a.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-2 py-1 text-slate-200">{a.acao}</td>
                <td className="px-2 py-1 text-slate-400">{a.entidade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES SLIM
// ════════════════════════════════════════════════════════════════════════════

function LoadingScreen() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a1f3d]"><Loader2 className="h-6 w-6 animate-spin text-sky-400" /></div>;
}
function ErrorScreen({ msg }: { msg: string }) {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a1f3d]"><AlertCircle className="h-6 w-6 text-red-400" /><p className="ml-2 text-sm text-red-300">{msg}</p></div>;
}

function BannerSlim({ pct, meta, realizado, projecao }: { pct: number; meta: number; realizado: number; projecao: number }) {
  const cor = pct >= 70 ? "#22c55e" : pct >= 30 ? "#f59e0b" : "#dc2626";
  const txt = pct >= 100 ? "Meta superada!" : pct >= 70 ? "Dentro da meta" : pct >= 30 ? "Atenção" : "Crítico";
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: `linear-gradient(90deg, ${cor}22, ${cor}11)` }}>
      <span className="text-base">{pct >= 70 ? "🏆" : pct >= 30 ? "⚡" : "🚨"}</span>
      <div className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{txt}</div>
        <div className="text-[12px] font-semibold text-slate-100">
          {pct >= 100 ? "Meta superada!" : `Faltam ${fmtBRL(Math.max(0, meta - realizado))} para bater a meta. Projeção: ${fmtBRL(projecao)}.`}
        </div>
      </div>
      <span className="text-lg font-bold tabular-nums" style={{ color: cor }}>{fmtPct(pct)}</span>
    </div>
  );
}

function Kpi({ icon, label, value, sub, cor, ring }: { icon: string; label: string; value: string; sub?: string; cor: string; ring?: number }) {
  return (
    <div className="rounded-lg p-2.5 border border-white/5" style={{ background: `linear-gradient(135deg, ${cor}33, ${cor}11)` }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{icon} {label}</span>
        {ring !== undefined && <RingMini pct={ring} />}
      </div>
      <div className="mt-0.5 text-[15px] font-bold leading-tight text-slate-100 tabular-nums">{value}</div>
      {sub && <div className="text-[9px] text-slate-500">{sub}</div>}
    </div>
  );
}

function RingMini({ pct }: { pct: number }) {
  const r = 10, c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const cor = corDe(pct);
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      <circle cx="12" cy="12" r={r} fill="none" stroke={cor} strokeWidth="2" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 12 12)" />
    </svg>
  );
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2.5">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{icon} {title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, cor }: { label: string; value: string; cor?: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-semibold tabular-nums" style={{ color: cor || "#e2e8f0" }}>{value}</span></div>;
}

function LineChartSlim({ points, color = "#1a56c5" }: { points: { label: string; value: number }[]; color?: string }) {
  if (points.length === 0) return <div className="flex h-24 items-center justify-center text-[10px] text-slate-500">Sem dados</div>;
  const w = 280, h = 100, pad = 8;
  const max = Math.max(...points.map(p => p.value), 1);
  const x = (i: number) => pad + (points.length > 1 ? (i * (w - pad * 2)) / (points.length - 1) : 0);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const area = `${path} L ${x(points.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 100 }}>
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#g)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="2" fill={color} />)}
    </svg>
  );
}

function DonutSlim({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="flex h-24 items-center justify-center text-[10px] text-slate-500">Sem dados</div>;
  const r = 45, cx = 55, cy = 50;
  let acc = 0;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 110 100" style={{ width: 110, height: 100 }}>
        {slices.map((s, i) => {
          const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
          acc += s.value;
          const end = (acc / total) * 2 * Math.PI - Math.PI / 2;
          const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
          const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
          const large = end - start > Math.PI ? 1 : 0;
          return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${cx} ${cy} Z`} fill={s.color} />;
        })}
        <circle cx={cx} cy={cy} r={22} fill="#0d2640" />
        <text x={cx} y={cy} textAnchor="middle" dy=".35em" fontSize="9" fill="#94a3b8" fontWeight="bold">Total</text>
      </svg>
      <div className="flex-1 space-y-1">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[10px]">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-slate-400">{s.label}</span>
            <span className="font-semibold text-slate-200">{fmtPct(total > 0 ? (s.value / total) * 100 : 0, 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarsSlim({ items, color = "#1a56c5" }: { items: { label: string; value: number }[]; color?: string }) {
  if (items.length === 0) return <div className="flex h-24 items-center justify-center text-[10px] text-slate-500">Sem dados</div>;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="truncate text-slate-400">{it.label}</span>
            <span className="font-semibold tabular-nums text-slate-200">{fmtBRL(it.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightsSlim({ d }: { d: DashboardData }) {
  const t = d.total;
  const inds = indicadoresPorVendedor(d.indicadores);
  const insights: { icon: string; tone: string; title: string; detail: string }[] = [];
  const gap = t.meta - t.realizado;
  if (gap > 0 && t.meta > 0) insights.push({ icon: "🎯", tone: t.atingimento >= 70 ? "atencao" : "critico", title: `Faltam ${fmtBRL(gap)}`, detail: `${fmtPct(t.atingimento)} da meta · projeção ${fmtBRL(t.projecao)}` });
  if (inds[0]) insights.push({ icon: "⭐", tone: "positivo", title: `${inds[0].nome} lidera`, detail: `${fmtPct(inds[0].atingimento)} · ${fmtBRL(inds[0].realizado)}` });
  const pior = [...inds].sort((a, b) => a.atingimento - b.atingimento)[0];
  if (pior && pior.atingimento < 70 && pior.meta > 0) insights.push({ icon: "🤝", tone: pior.atingimento < 30 ? "critico" : "atencao", title: `${pior.nome} precisa de apoio`, detail: `${fmtPct(pior.atingimento)} · faltam ${fmtBRL(pior.meta - pior.realizado)}` });
  const dias = somaPorDia(d.atuais);
  if (dias.length > 0) {
    const melhor = [...dias].sort((a, b) => b.valor - a.valor)[0];
    insights.push({ icon: "📅", tone: "neutro", title: `Melhor dia: ${fmtData(melhor.data)}`, detail: fmtBRL(melhor.valor) });
  }
  if (t.ticketMedio > 0) insights.push({ icon: "🎟️", tone: "neutro", title: `Ticket médio ${fmtBRL(t.ticketMedio)}`, detail: `${t.clientes} clientes` });
  const cores: Record<string, string> = { positivo: "#22c55e", atencao: "#f59e0b", critico: "#dc2626", neutro: "#3b82f6" };
  return (
    <div className="space-y-1.5">
      {insights.map((i, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md p-1.5" style={{ background: `${cores[i.tone]}11` }}>
          <span className="text-sm">{i.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-slate-200">{i.title}</div>
            <div className="text-[10px] text-slate-400">{i.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function IndicadoresTable({ inds }: { inds: { vendedorId: number; nome: string; meta: number; realizado: number; projecao: number; atingimento: number }[] }) {
  return (
    <div className="max-h-[40vh] overflow-y-auto">
      <table className="w-full text-[11px]">
        <thead className="sticky top-0 bg-[#0d2640]">
          <tr className="text-left text-[9px] uppercase text-slate-400">
            <th className="px-1.5 py-1">#</th>
            <th className="px-1.5 py-1">Vendedor</th>
            <th className="px-1.5 py-1 text-right">Meta</th>
            <th className="px-1.5 py-1 text-right">Real.</th>
            <th className="px-1.5 py-1 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {inds.map((r, i) => (
            <tr key={r.vendedorId} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="px-1.5 py-1 text-slate-500">{i + 1}</td>
              <td className="px-1.5 py-1 text-slate-200 truncate max-w-[100px]">{r.nome.split(" ")[0]}</td>
              <td className="px-1.5 py-1 text-right tabular-nums text-slate-400">{fmtBRL(r.meta)}</td>
              <td className="px-1.5 py-1 text-right tabular-nums font-semibold text-emerald-400">{fmtBRL(r.realizado)}</td>
              <td className="px-1.5 py-1 text-right font-bold tabular-nums" style={{ color: corDe(r.atingimento) }}>{fmtPct(r.atingimento)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
