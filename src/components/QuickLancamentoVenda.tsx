import { useState } from "react";
import { motion } from "framer-motion";
import { listaVendedores } from "../data/vendasDiarias";
import { vendasStore } from "../data/vendasStore";

interface Props {
  aberto: boolean;
  onClose: () => void;
  vendedorPreSelecionado?: string; // id
  dataPreSelecionada?: string;     // ISO
}

export default function QuickLancamentoVenda({ aberto, onClose, vendedorPreSelecionado, dataPreSelecionada }: Props) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState(dataPreSelecionada || hoje);
  const [vendedorId, setVendedorId] = useState(vendedorPreSelecionado && vendedorPreSelecionado !== "todos" ? vendedorPreSelecionado : listaVendedores[0].id);
  const [valorLiq, setValorLiq] = useState("");
  const [qtdeLiq, setQtdeLiq] = useState("");
  const [valorRec, setValorRec] = useState("");
  const [qtdeRec, setQtdeRec] = useState("");
  const [erro, setErro] = useState("");

  if (!aberto) return null;

  function salvar() {
    setErro("");
    const v = listaVendedores.find((x) => x.id === vendedorId);
    if (!v) return setErro("Selecione um vendedor.");
    const liq = Number(valorLiq.replace(",", "."));
    const qLiq = Number(qtdeLiq);
    if (!Number.isFinite(liq) || liq < 0) return setErro("Valor líquido inválido.");
    if (!Number.isFinite(qLiq) || qLiq < 0) return setErro("Qtd. clientes inválida.");
    const rec = Number((valorRec || "0").replace(",", "."));
    const qRec = Number(qtdeRec || "0");

    if (vendasStore.existe(data, vendedorId)) {
      if (!confirm(`Já existe lançamento para ${v.nome} em ${data}. Sobrescrever?`)) return;
    }

    vendasStore.upsert({
      data,
      vendedorId: v.id,
      vendedorCodigo: v.codigo,
      vendedorNome: v.nome,
      matricula: v.matricula,
      valorVendaLiquida: liq,
      qtdeClienteVendaLiquida: qLiq,
      tkmVenda: 0,
      valorVendaRecepto: rec,
      qtdeClienteRecepto: qRec,
      tkmRecepto: 0,
      valorVendaTotal: 0,
      qtdeClienteTotal: 0,
      tkmTotal: 0,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Lançamento Rápido</p>
            <h3 className="font-display text-xl text-[var(--pm-navy)] dark:text-blue-300">⚡ Nova Venda</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <label className="col-span-2 block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Vendedor</span>
            <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {listaVendedores.map((v) => (
                <option key={v.id} value={v.id}>{v.nome} · {v.matricula}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Valor Líquida (R$)</span>
            <input inputMode="decimal" value={valorLiq} onChange={(e) => setValorLiq(e.target.value)} placeholder="1908.96" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Qtd. Clientes</span>
            <input inputMode="numeric" value={qtdeLiq} onChange={(e) => setQtdeLiq(e.target.value)} placeholder="55" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Recepto (R$)</span>
            <input inputMode="decimal" value={valorRec} onChange={(e) => setValorRec(e.target.value)} placeholder="0,00" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Qtd. Recepto</span>
            <input inputMode="numeric" value={qtdeRec} onChange={(e) => setQtdeRec(e.target.value)} placeholder="0" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
        </div>

        {erro && <p className="mt-3 text-xs font-semibold text-red-600">{erro}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
          <button onClick={salvar} className="rounded-lg bg-[var(--pm-navy)] px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-800 dark:bg-blue-600">Lançar venda</button>
        </div>
      </motion.div>
    </div>
  );
}
