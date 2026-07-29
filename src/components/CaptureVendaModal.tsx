import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { extractVendasFromImage, type LinhaExtraida } from "../lib/vendas-ocr.functions";
import { listaVendedores } from "../data/vendasDiarias";
import { vendasStore } from "../data/vendasStore";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

type LinhaEdit = LinhaExtraida & { marcada: boolean };

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function CaptureVendaModal({ aberto, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = useState<string>("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [linhas, setLinhas] = useState<LinhaEdit[]>([]);
  const [vendedorId, setVendedorId] = useState<string>("");
  const [avisoDetec, setAvisoDetec] = useState("");
  const extract = useServerFn(extractVendasFromImage);

  if (!aberto) return null;

  function reset() {
    setImgUrl("");
    setLinhas([]);
    setErro("");
    setVendedorId("");
    setAvisoDetec("");
  }

  async function processar(file: File) {
    setErro("");
    setLinhas([]);
    setCarregando(true);
    try {
      const dataUrl = await fileToDataURL(file);
      setImgUrl(dataUrl);
      const r = await extract({ data: { imageDataUrl: dataUrl } });
      // Auto-match vendedor por matrícula / código
      const detec = listaVendedores.find(
        (v) => (r.matricula && v.matricula === r.matricula) ||
               (r.vendedorCodigo && v.codigo === r.vendedorCodigo)
      );
      if (detec) {
        setVendedorId(detec.id);
        setAvisoDetec(`Vendedor detectado automaticamente: ${detec.nome}`);
      } else {
        setVendedorId(listaVendedores[0].id);
        setAvisoDetec(r.vendedorNome ? `Detectado "${r.vendedorNome}" — selecione o vendedor manualmente.` : "Selecione o vendedor manualmente.");
      }
      setLinhas(r.linhas.map((l) => ({ ...l, marcada: true })));
      if (r.linhas.length === 0) setErro("Nenhuma linha reconhecida na imagem.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }

  function editarLinha(idx: number, patch: Partial<LinhaEdit>) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function lancar() {
    const v = listaVendedores.find((x) => x.id === vendedorId);
    if (!v) return setErro("Selecione um vendedor.");
    const selecionadas = linhas.filter((l) => l.marcada);
    if (selecionadas.length === 0) return setErro("Selecione ao menos uma linha.");

    const conflitos = selecionadas.filter((l) => vendasStore.existe(l.data, v.id));
    if (conflitos.length > 0) {
      if (!confirm(`${conflitos.length} linha(s) já existem para ${v.nome} e serão sobrescritas. Continuar?`)) return;
    }

    for (const l of selecionadas) {
      vendasStore.upsert({
        data: l.data,
        vendedorId: v.id,
        vendedorCodigo: v.codigo,
        vendedorNome: v.nome,
        matricula: v.matricula,
        valorVendaLiquida: Number(l.valorVendaLiquida) || 0,
        qtdeClienteVendaLiquida: Number(l.qtdeClienteVendaLiquida) || 0,
        tkmVenda: 0,
        valorVendaRecepto: Number(l.valorVendaRecepto) || 0,
        qtdeClienteRecepto: Number(l.qtdeClienteRecepto) || 0,
        tkmRecepto: 0,
        valorVendaTotal: 0,
        qtdeClienteTotal: 0,
        tkmTotal: 0,
      });
    }
    alert(`${selecionadas.length} venda(s) lançadas para ${v.nome}.`);
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500">Captura de Relatório</p>
            <h3 className="font-display text-xl text-[var(--pm-navy)] dark:text-blue-300">📸 Lançar por Imagem</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!imgUrl && (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-3 text-5xl">📷</div>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
                Tire uma foto do relatório <b>"Venda por vendedor"</b> ou envie um arquivo.
                <br />O sistema identificará data, valores e cliente automaticamente.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processar(f);
                }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-[var(--pm-navy)] px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-800 dark:bg-blue-600"
              >
                Selecionar / Capturar Imagem
              </button>
            </div>
          )}

          {imgUrl && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <img src={imgUrl} alt="Relatório capturado" className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700" />
                <div className="flex-1">
                  <button onClick={reset} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                    Trocar imagem
                  </button>
                  {avisoDetec && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{avisoDetec}</p>}
                </div>
              </div>

              {carregando && (
                <div className="rounded-lg bg-blue-50 p-4 text-center text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  🤖 Analisando imagem com IA…
                </div>
              )}

              {!carregando && linhas.length > 0 && (
                <>
                  <label className="block text-xs">
                    <span className="mb-1 block font-bold uppercase tracking-wider text-slate-500">Vendedor destino</span>
                    <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                      {listaVendedores.map((v) => (
                        <option key={v.id} value={v.id}>{v.nome} · {v.matricula}</option>
                      ))}
                    </select>
                  </label>

                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[620px] text-xs">
                      <thead className="bg-slate-100 text-[10px] uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <tr>
                          <th className="p-2 text-center">✓</th>
                          <th className="p-2 text-left">Data</th>
                          <th className="p-2 text-right">Valor Líq.</th>
                          <th className="p-2 text-right">Qtd.</th>
                          <th className="p-2 text-right">Recepto</th>
                          <th className="p-2 text-right">Qtd. Rec.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhas.map((l, i) => (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="p-1.5 text-center">
                              <input type="checkbox" checked={l.marcada} onChange={(e) => editarLinha(i, { marcada: e.target.checked })} />
                            </td>
                            <td className="p-1.5">
                              <input type="date" value={l.data} onChange={(e) => editarLinha(i, { data: e.target.value })} className="w-full rounded bg-transparent px-1 py-0.5 text-xs" />
                            </td>
                            <td className="p-1.5">
                              <input inputMode="decimal" value={l.valorVendaLiquida} onChange={(e) => editarLinha(i, { valorVendaLiquida: Number(e.target.value) || 0 })} className="w-24 rounded bg-transparent px-1 py-0.5 text-right text-xs" />
                            </td>
                            <td className="p-1.5">
                              <input inputMode="numeric" value={l.qtdeClienteVendaLiquida} onChange={(e) => editarLinha(i, { qtdeClienteVendaLiquida: Number(e.target.value) || 0 })} className="w-14 rounded bg-transparent px-1 py-0.5 text-right text-xs" />
                            </td>
                            <td className="p-1.5">
                              <input inputMode="decimal" value={l.valorVendaRecepto} onChange={(e) => editarLinha(i, { valorVendaRecepto: Number(e.target.value) || 0 })} className="w-24 rounded bg-transparent px-1 py-0.5 text-right text-xs" />
                            </td>
                            <td className="p-1.5">
                              <input inputMode="numeric" value={l.qtdeClienteRecepto} onChange={(e) => editarLinha(i, { qtdeClienteRecepto: Number(e.target.value) || 0 })} className="w-14 rounded bg-transparent px-1 py-0.5 text-right text-xs" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {erro && <p className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">{erro}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {linhas.length > 0 && `${linhas.filter((l) => l.marcada).length} de ${linhas.length} selecionadas`}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
            <button
              onClick={lancar}
              disabled={linhas.length === 0 || carregando}
              className="rounded-lg bg-[var(--pm-navy)] px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-40 dark:bg-blue-600"
            >
              Lançar {linhas.filter((l) => l.marcada).length || ""} vendas
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
