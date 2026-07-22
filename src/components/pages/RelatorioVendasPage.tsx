import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { listaVendedores, type VendaDiaria } from "../../data/vendasDiarias";
import { useVendasStore } from "../../hooks/useVendasStore";
import { brlMoeda, numero } from "../../utils/format";
import { cn } from "../../utils/cn";
import QuickLancamentoVenda from "../QuickLancamentoVenda";
import CaptureVendaModal from "../CaptureVendaModal";

type Periodo = "dia" | "semana" | "mes" | "ano";
type Vendedor = "todos" | string;

function fmtData(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function getWeekKey(d: string) {
  const dt = new Date(d + "T12:00:00");
  const jan1 = new Date(dt.getFullYear(), 0, 1);
  const diff = dt.getTime() - jan1.getTime();
  const weekNum = Math.ceil((diff / 86400000 + jan1.getDay() + 1) / 7);
  return `${dt.getFullYear()}-S${String(weekNum).padStart(2, "0")}`;
}
const getMonthKey = (d: string) => d.slice(0, 7);
const getYearKey = (d: string) => d.slice(0, 4);

function agruparPorPeriodo(rows: VendaDiaria[], periodo: Periodo): VendaDiaria[] {
  if (periodo === "dia") return rows;
  const keyFn = periodo === "semana" ? getWeekKey : periodo === "mes" ? getMonthKey : getYearKey;
  const map = new Map<string, VendaDiaria>();
  for (const r of rows) {
    const k = `${keyFn(r.data)}|${r.vendedorId}`;
    const ex = map.get(k);
    if (!ex) map.set(k, { ...r, data: keyFn(r.data) });
    else {
      ex.valorVendaLiquida += r.valorVendaLiquida;
      ex.qtdeClienteVendaLiquida += r.qtdeClienteVendaLiquida;
      ex.valorVendaRecepto += r.valorVendaRecepto;
      ex.qtdeClienteRecepto += r.qtdeClienteRecepto;
      ex.valorVendaTotal += r.valorVendaTotal;
      ex.qtdeClienteTotal += r.qtdeClienteTotal;
    }
  }
  const result: VendaDiaria[] = [];
  map.forEach((v) => {
    v.valorVendaLiquida = Number(v.valorVendaLiquida.toFixed(2));
    v.valorVendaRecepto = Number(v.valorVendaRecepto.toFixed(2));
    v.valorVendaTotal = Number(v.valorVendaTotal.toFixed(2));
    v.tkmVenda = v.qtdeClienteVendaLiquida > 0 ? Number((v.valorVendaLiquida / v.qtdeClienteVendaLiquida).toFixed(2)) : 0;
    v.tkmRecepto = v.qtdeClienteRecepto > 0 ? Number((v.valorVendaRecepto / v.qtdeClienteRecepto).toFixed(2)) : 0;
    v.tkmTotal = v.qtdeClienteTotal > 0 ? Number((v.valorVendaTotal / v.qtdeClienteTotal).toFixed(2)) : 0;
    result.push(v);
  });
  return result.sort((a, b) => b.data.localeCompare(a.data));
}

function calcTotais(rows: VendaDiaria[]) {
  const t = { valorVendaLiquida: 0, qtdeClienteVendaLiquida: 0, tkmVenda: 0, valorVendaRecepto: 0, qtdeClienteRecepto: 0, tkmRecepto: 0, valorVendaTotal: 0, qtdeClienteTotal: 0, tkmTotal: 0 };
  for (const r of rows) {
    t.valorVendaLiquida += r.valorVendaLiquida;
    t.qtdeClienteVendaLiquida += r.qtdeClienteVendaLiquida;
    t.valorVendaRecepto += r.valorVendaRecepto;
    t.qtdeClienteRecepto += r.qtdeClienteRecepto;
    t.valorVendaTotal += r.valorVendaTotal;
    t.qtdeClienteTotal += r.qtdeClienteTotal;
  }
  t.tkmVenda = t.qtdeClienteVendaLiquida > 0 ? Number((t.valorVendaLiquida / t.qtdeClienteVendaLiquida).toFixed(2)) : 0;
  t.tkmRecepto = t.qtdeClienteRecepto > 0 ? Number((t.valorVendaRecepto / t.qtdeClienteRecepto).toFixed(2)) : 0;
  t.tkmTotal = t.qtdeClienteTotal > 0 ? Number((t.valorVendaTotal / t.qtdeClienteTotal).toFixed(2)) : 0;
  t.valorVendaLiquida = Number(t.valorVendaLiquida.toFixed(2));
  t.valorVendaRecepto = Number(t.valorVendaRecepto.toFixed(2));
  t.valorVendaTotal = Number(t.valorVendaTotal.toFixed(2));
  return t;
}

const LABEL_PERIODO: Record<Periodo, string> = { dia: "Dia", semana: "Semana", mes: "Mês", ano: "Ano" };
const TH_CLS = "px-2.5 py-2.5 text-center font-cond text-[10px] uppercase tracking-wider whitespace-nowrap sm:text-[11px]";
const TD_CLS = "px-2.5 py-2 text-center font-num text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap";
const TD_BOLD = `${TD_CLS} font-bold`;

interface EditState {
  data: string;
  vendedorId: string;
  valorVendaLiquida: string;
  qtdeClienteVendaLiquida: string;
  valorVendaRecepto: string;
  qtdeClienteRecepto: string;
}

export default function RelatorioVendasPage() {
  if (!listaVendedores?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <p className="font-medium text-slate-600">Nenhuma venda registrada</p>
        <p className="mt-1 text-sm text-slate-500">As vendas aparecerão aqui quando forem lançadas.</p>
      </div>
    );
  }
  const { store } = useVendasStore();
  const [dataInicial, setDataInicial] = useState("2026-07-01");
  const [dataFinal, setDataFinal] = useState("2026-07-16");
  const [periodo, setPeriodo] = useState<Periodo>("dia");
  const [vendedorSelecionado, setVendedorSelecionado] = useState<Vendedor>("todos");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);

  const dadosFiltrados = useMemo(() => {
    let rows = store.listar().filter((r) => r.data >= dataInicial && r.data <= dataFinal);
    if (vendedorSelecionado !== "todos") rows = rows.filter((r) => r.vendedorId === vendedorSelecionado);
    return agruparPorPeriodo(rows, periodo);
  }, [dataInicial, dataFinal, periodo, vendedorSelecionado, store]);

  const totais = useMemo(() => calcTotais(dadosFiltrados), [dadosFiltrados]);
  const vendedorNome = vendedorSelecionado === "todos" ? "Todos os vendedores" : listaVendedores.find((v) => v.id === vendedorSelecionado)?.nome || "";
  const editavel = periodo === "dia";

  function iniciarEdicao(r: VendaDiaria) {
    setEdit({
      data: r.data,
      vendedorId: r.vendedorId,
      valorVendaLiquida: String(r.valorVendaLiquida),
      qtdeClienteVendaLiquida: String(r.qtdeClienteVendaLiquida),
      valorVendaRecepto: String(r.valorVendaRecepto),
      qtdeClienteRecepto: String(r.qtdeClienteRecepto),
    });
  }

  function salvarEdicao() {
    if (!edit) return;
    store.atualizar(edit.data, edit.vendedorId, {
      valorVendaLiquida: Number(edit.valorVendaLiquida.replace(",", ".")) || 0,
      qtdeClienteVendaLiquida: Number(edit.qtdeClienteVendaLiquida) || 0,
      valorVendaRecepto: Number(edit.valorVendaRecepto.replace(",", ".")) || 0,
      qtdeClienteRecepto: Number(edit.qtdeClienteRecepto) || 0,
    });
    setEdit(null);
  }

  function excluir(r: VendaDiaria) {
    if (!confirm(`Excluir venda de ${r.vendedorNome} em ${fmtData(r.data)}?`)) return;
    store.remover(r.data, r.vendedorId);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b-2 border-[var(--pm-navy)] pb-4 dark:border-blue-500 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--pm-red)] shadow-lg">
            <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6"><path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" /></svg>
          </div>
          <div>
            <h1 className="font-display text-xl uppercase leading-tight text-[var(--pm-navy)] dark:text-blue-300 sm:text-2xl">Relatório de Vendas</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Venda por vendedor · Filial 7537</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCaptureOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--pm-red)] px-3 py-2 text-xs font-bold text-white shadow hover:opacity-90"
          >
            📸 Capturar imagem
          </button>
          <button
            onClick={() => setQuickOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--pm-navy)] px-3 py-2 text-xs font-bold text-white shadow hover:bg-blue-800 dark:bg-blue-600"
          >
            ⚡ Lançamento rápido
          </button>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">{dadosFiltrados.length} regs</span>
          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{vendedorNome}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Inicial</label>
          <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Final</label>
          <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Período</label>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            {(["dia", "semana", "mes", "ano"] as Periodo[]).map((p) => (
              <button key={p} onClick={() => setPeriodo(p)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", periodo === p ? "bg-[var(--pm-navy)] text-white shadow dark:bg-blue-600" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700")}>
                {LABEL_PERIODO[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Vendedor</label>
          <select value={vendedorSelecionado} onChange={(e) => setVendedorSelecionado(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="todos">👥 Todos os Vendedores</option>
            {listaVendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome} ({v.matricula})</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setDataInicial("2026-07-01"); setDataFinal("2026-07-16"); setPeriodo("dia"); setVendedorSelecionado("todos"); }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >Limpar filtros</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Venda Líquida", value: brlMoeda(totais.valorVendaLiquida) },
          { label: "Clientes Venda", value: numero(totais.qtdeClienteVendaLiquida) },
          { label: "TKM Venda", value: brlMoeda(totais.tkmVenda) },
          { label: "Venda Recepto", value: brlMoeda(totais.valorVendaRecepto) },
          { label: "Venda Total", value: brlMoeda(totais.valorVendaTotal), highlight: true },
          { label: "TKM Total", value: brlMoeda(totais.tkmTotal), highlight: true },
        ].map((k) => (
          <div key={k.label} className={cn("rounded-lg border p-3 shadow-sm", k.highlight ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900")}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.label}</p>
            <p className={cn("font-num mt-1 text-base font-bold sm:text-lg", k.highlight ? "text-[var(--pm-navy)] dark:text-blue-300" : "text-slate-800 dark:text-white")}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {dadosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl">📋</span>
            <p className="mt-2 text-sm">Nenhum registro encontrado para o filtro aplicado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="bg-[var(--pm-navy)] text-white dark:bg-blue-900">
                  <th className={cn(TH_CLS, "text-left")}>{periodo === "dia" ? "Data" : LABEL_PERIODO[periodo]}</th>
                  {vendedorSelecionado === "todos" && (<>
                    <th className={cn(TH_CLS, "text-left")}>Vendedor</th>
                    <th className={cn(TH_CLS, "text-left")}>Nome</th>
                  </>)}
                  <th className={TH_CLS}>Matrícula</th>
                  <th className={TH_CLS}>Valor Venda Líquida</th>
                  <th className={TH_CLS}>Qtde Cliente</th>
                  <th className={TH_CLS}>TKM Venda</th>
                  <th className={TH_CLS}>Valor Recepto</th>
                  <th className={TH_CLS}>Qtde Recepto</th>
                  <th className={TH_CLS}>TKM Recepto</th>
                  <th className={cn(TH_CLS, "bg-blue-800 dark:bg-blue-800")}>Venda Total</th>
                  <th className={cn(TH_CLS, "bg-blue-800 dark:bg-blue-800")}>Qtde Total</th>
                  <th className={cn(TH_CLS, "bg-blue-800 dark:bg-blue-800")}>TKM Total</th>
                  {editavel && <th className={TH_CLS}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((r, i) => {
                  const isEditing = editavel && edit && edit.data === r.data && edit.vendedorId === r.vendedorId;
                  return (
                    <tr key={`${r.data}-${r.vendedorId}-${i}`} className={cn("border-t border-slate-100 transition dark:border-slate-800", i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/70 dark:bg-slate-800/40", "hover:bg-blue-50/60 dark:hover:bg-blue-900/20", isEditing && "bg-amber-50 dark:bg-amber-900/20")}>
                      <td className={cn(TD_CLS, "text-left font-semibold text-slate-900 dark:text-white")}>{periodo === "dia" ? fmtData(r.data) : r.data}</td>
                      {vendedorSelecionado === "todos" && (<>
                        <td className={cn(TD_CLS, "text-left")}>{r.vendedorCodigo}</td>
                        <td className={cn(TD_CLS, "text-left font-semibold text-slate-800 dark:text-slate-100")}>{r.vendedorNome}</td>
                      </>)}
                      <td className={TD_CLS}>{r.matricula}</td>

                      {isEditing && edit ? (
                        <>
                          <td className={TD_CLS}><input inputMode="decimal" value={edit.valorVendaLiquida} onChange={(e) => setEdit({ ...edit, valorVendaLiquida: e.target.value })} className="w-24 rounded border border-amber-300 bg-white px-1 py-0.5 text-right text-xs dark:bg-slate-900" /></td>
                          <td className={TD_CLS}><input inputMode="numeric" value={edit.qtdeClienteVendaLiquida} onChange={(e) => setEdit({ ...edit, qtdeClienteVendaLiquida: e.target.value })} className="w-14 rounded border border-amber-300 bg-white px-1 py-0.5 text-right text-xs dark:bg-slate-900" /></td>
                          <td className={TD_CLS}>—</td>
                          <td className={TD_CLS}><input inputMode="decimal" value={edit.valorVendaRecepto} onChange={(e) => setEdit({ ...edit, valorVendaRecepto: e.target.value })} className="w-24 rounded border border-amber-300 bg-white px-1 py-0.5 text-right text-xs dark:bg-slate-900" /></td>
                          <td className={TD_CLS}><input inputMode="numeric" value={edit.qtdeClienteRecepto} onChange={(e) => setEdit({ ...edit, qtdeClienteRecepto: e.target.value })} className="w-14 rounded border border-amber-300 bg-white px-1 py-0.5 text-right text-xs dark:bg-slate-900" /></td>
                          <td className={TD_CLS}>—</td>
                          <td className={cn(TD_CLS, "bg-blue-50/50 dark:bg-blue-900/10")}>—</td>
                          <td className={cn(TD_CLS, "bg-blue-50/50 dark:bg-blue-900/10")}>—</td>
                          <td className={cn(TD_CLS, "bg-blue-50/50 dark:bg-blue-900/10")}>—</td>
                          <td className={TD_CLS}>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={salvarEdicao} className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700">Salvar</button>
                              <button onClick={() => setEdit(null)} className="rounded bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">✕</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={TD_BOLD}>{brlMoeda(r.valorVendaLiquida)}</td>
                          <td className={TD_CLS}>{numero(r.qtdeClienteVendaLiquida)}</td>
                          <td className={TD_CLS}>{brlMoeda(r.tkmVenda)}</td>
                          <td className={TD_CLS}>{brlMoeda(r.valorVendaRecepto)}</td>
                          <td className={TD_CLS}>{numero(r.qtdeClienteRecepto)}</td>
                          <td className={TD_CLS}>{brlMoeda(r.tkmRecepto)}</td>
                          <td className={cn(TD_BOLD, "bg-blue-50/50 dark:bg-blue-900/10")}>{brlMoeda(r.valorVendaTotal)}</td>
                          <td className={cn(TD_CLS, "bg-blue-50/50 dark:bg-blue-900/10")}>{numero(r.qtdeClienteTotal)}</td>
                          <td className={cn(TD_BOLD, "bg-blue-50/50 dark:bg-blue-900/10")}>{brlMoeda(r.tkmTotal)}</td>
                          {editavel && (
                            <td className={TD_CLS}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => iniciarEdicao(r)} title="Editar" className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300">✏️</button>
                                <button onClick={() => excluir(r)} title="Excluir" className="rounded bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">🗑️</button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })}

                {/* TOTAL */}
                <tr className="border-t-2 border-[var(--pm-navy)] bg-[#eef2fb] dark:border-blue-400 dark:bg-slate-800">
                  <td className={cn(TD_BOLD, "text-left text-[var(--pm-navy)] dark:text-blue-300")}>TOTAL</td>
                  {vendedorSelecionado === "todos" && (<><td className={TD_CLS} /><td className={TD_CLS} /></>)}
                  <td className={TD_CLS} />
                  <td className={cn(TD_BOLD, "text-[var(--pm-navy)] dark:text-blue-300")}>{brlMoeda(totais.valorVendaLiquida)}</td>
                  <td className={cn(TD_BOLD, "text-[var(--pm-navy)] dark:text-blue-300")}>{numero(totais.qtdeClienteVendaLiquida)}</td>
                  <td className={cn(TD_BOLD, "text-[var(--pm-navy)] dark:text-blue-300")}>{brlMoeda(totais.tkmVenda)}</td>
                  <td className={cn(TD_BOLD, "text-[var(--pm-navy)] dark:text-blue-300")}>{brlMoeda(totais.valorVendaRecepto)}</td>
                  <td className={cn(TD_BOLD, "text-[var(--pm-navy)] dark:text-blue-300")}>{numero(totais.qtdeClienteRecepto)}</td>
                  <td className={cn(TD_BOLD, "text-[var(--pm-navy)] dark:text-blue-300")}>{brlMoeda(totais.tkmRecepto)}</td>
                  <td className={cn(TD_BOLD, "bg-blue-100/80 text-[var(--pm-navy)] dark:bg-blue-900/30 dark:text-blue-200")}>{brlMoeda(totais.valorVendaTotal)}</td>
                  <td className={cn(TD_BOLD, "bg-blue-100/80 text-[var(--pm-navy)] dark:bg-blue-900/30 dark:text-blue-200")}>{numero(totais.qtdeClienteTotal)}</td>
                  <td className={cn(TD_BOLD, "bg-blue-100/80 text-[var(--pm-navy)] dark:bg-blue-900/30 dark:text-blue-200")}>{brlMoeda(totais.tkmTotal)}</td>
                  {editavel && <td className={TD_CLS} />}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-slate-400">
        ORION · Relatório Online · Venda por Vendedor · Filial 7537 · {fmtData(dataInicial)} a {fmtData(dataFinal)}
      </p>

      <QuickLancamentoVenda
        aberto={quickOpen}
        onClose={() => setQuickOpen(false)}
        vendedorPreSelecionado={vendedorSelecionado}
        dataPreSelecionada={dataFinal}
      />
      <CaptureVendaModal aberto={captureOpen} onClose={() => setCaptureOpen(false)} />
    </motion.div>
  );
}
