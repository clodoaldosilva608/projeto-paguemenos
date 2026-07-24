import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  X, Save, Trash2, Plus, Calendar, DollarSign, Users, TrendingUp,
  Package, Tag, Target, AlertCircle, Edit3,
} from "lucide-react";

interface VendaDiaria {
  id?: string;
  data: string;
  categoria: string;
  valor_venda: number;
  qtd_clientes: number;
  observacao?: string;
}

const CATEGORIAS = [
  { id: "faturamento", label: "💰 Faturamento Geral", Icon: DollarSign },
  { id: "marcas_exclusivas", label: "🏷️ Marcas Exclusivas", Icon: Tag },
  { id: "genericos", label: "💊 Genéricos + Similares", Icon: Package },
  { id: "super_desconto", label: "🎯 Super Desconto", Icon: Target },
];

interface Props {
  aberto: boolean;
  onClose: () => void;
  onSalvou?: () => void;
}

export default function ModalLancarVendas({ aberto, onClose, onSalvou }: Props) {
  const { usuario } = useAuth();
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Formulário novo
  const hoje = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<VendaDiaria>({
    data: hoje,
    categoria: "faturamento",
    valor_venda: 0,
    qtd_clientes: 0,
    observacao: "",
  });

  useEffect(() => {
    if (aberto && usuario) void carregar();
  }, [aberto, usuario]);

  async function carregar() {
    if (!usuario) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vendas_diarias")
        .select("*")
        .eq("usuario_id", usuario.id)
        .order("data", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      setVendas((data as VendaDiaria[]) || []);
    } catch (e: any) {
      toast.error("Erro ao carregar vendas: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    if (!usuario) return;
    if (form.valor_venda <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    setSalvando(true);
    try {
      // Verificar se já existe venda para essa data/categoria
      const { data: existente } = await supabase
        .from("vendas_diarias")
        .select("id")
        .eq("usuario_id", usuario.id)
        .eq("data", form.data)
        .eq("categoria", form.categoria)
        .maybeSingle();

      if (existente?.id) {
        // Update
        const { error } = await supabase
          .from("vendas_diarias")
          .update({
            valor_venda: form.valor_venda,
            qtd_clientes: form.qtd_clientes,
            observacao: form.observacao,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", existente.id);
        if (error) throw new Error(error.message);
        toast.success(`✅ Venda de ${formatData(form.data)} atualizada!`);
      } else {
        // Insert
        const { error } = await supabase.from("vendas_diarias").insert({
          usuario_id: usuario.id,
          filial_id: usuario.filialId || "7537",
          data: form.data,
          categoria: form.categoria,
          valor_venda: form.valor_venda,
          qtd_clientes: form.qtd_clientes,
          observacao: form.observacao,
        });
        if (error) throw new Error(error.message);
        toast.success(`✅ Venda de ${formatData(form.data)} lançada!`);
      }

      setForm({
        data: hoje,
        categoria: "faturamento",
        valor_venda: 0,
        qtd_clientes: 0,
        observacao: "",
      });
      await carregar();
      if (onSalvou) onSalvou();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function editar(v: VendaDiaria) {
    setEditandoId(v.id || null);
    setForm({
      data: v.data,
      categoria: v.categoria,
      valor_venda: v.valor_venda,
      qtd_clientes: v.qtd_clientes,
      observacao: v.observacao || "",
    });
    // Scroll para o topo
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      const { error } = await supabase.from("vendas_diarias").delete().eq("id", id);
      if (error) throw new Error(error.message);
      toast.success("Lançamento excluído.");
      await carregar();
      if (onSalvou) onSalvou();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  }

  function formatData(d: string) {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  }

  function formatBRL(v: number) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const ticketMedio = form.qtd_clientes > 0 ? form.valor_venda / form.qtd_clientes : 0;

  // Agrupar por data
  const vendasPorData: Record<string, VendaDiaria[]> = {};
  for (const v of vendas) {
    if (!vendasPorData[v.data]) vendasPorData[v.data] = [];
    vendasPorData[v.data].push(v);
  }
  const datas = Object.keys(vendasPorData).sort((a, b) => b.localeCompare(a));

  // Total do mês
  const totalMes = vendas
    .filter((v) => v.data.startsWith(hoje.slice(0, 7)))
    .reduce((s, v) => s + v.valor_venda, 0);

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
          >
            {/* HEADER */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] px-5 py-3 text-white dark:border-white/10">
              <div>
                <h2 className="flex items-center gap-2 font-bold">
                  <DollarSign className="h-5 w-5" /> Lançar Vendas Diárias
                </h2>
                <p className="text-xs text-blue-200">
                  {usuario?.nome} · Total do mês: <strong className="font-mono text-emerald-300">{formatBRL(totalMes)}</strong>
                </p>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* FORMULÁRIO DE LANÇAMENTO */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-[#1e3a8a] dark:text-blue-300">
                  <Plus className="h-4 w-4" /> {editandoId ? "Editar Lançamento" : "Novo Lançamento"}
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Data" Icon={Calendar}>
                    <input
                      type="date"
                      value={form.data}
                      onChange={(e) => setForm({ ...form, data: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </Field>

                  <Field label="Categoria" Icon={Package}>
                    <select
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Valor da Venda (R$)" Icon={DollarSign}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.valor_venda || ""}
                      onChange={(e) => setForm({ ...form, valor_venda: Number(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </Field>

                  <Field label="Qtd. Clientes" Icon={Users}>
                    <input
                      type="number"
                      min="0"
                      value={form.qtd_clientes || ""}
                      onChange={(e) => setForm({ ...form, qtd_clientes: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </Field>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Observação (opcional)" Icon={Edit3}>
                    <input
                      type="text"
                      value={form.observacao || ""}
                      onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                      placeholder="Ex: dia de campanha, falta de produto, etc."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </Field>

                  <div className="flex items-end">
                    <div className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-800">
                      <p className="text-[10px] font-bold uppercase text-slate-500">Ticket Médio</p>
                      <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(ticketMedio)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={salvar}
                    disabled={salvando || form.valor_venda <= 0}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {salvando ? "Salvando..." : editandoId ? "Atualizar" : "Lançar Venda"}
                    <Save className="h-4 w-4" />
                  </button>
                  {editandoId && (
                    <button
                      onClick={() => {
                        setEditandoId(null);
                        setForm({
                          data: hoje,
                          categoria: "faturamento",
                          valor_venda: 0,
                          qtd_clientes: 0,
                          observacao: "",
                        });
                      }}
                      className="rounded-lg bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* LISTA DE LANÇAMENTOS */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-slate-700 dark:text-slate-200">
                  <TrendingUp className="h-4 w-4" /> Lançamentos recentes ({vendas.length})
                </h3>

                {loading ? (
                  <p className="py-8 text-center text-sm text-slate-500">Carregando...</p>
                ) : vendas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-white/10 dark:bg-slate-800/50">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhuma venda lançada ainda</p>
                    <p className="mt-1 text-xs text-slate-500">Use o formulário acima para lançar sua primeira venda.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-auto pr-1">
                    {datas.map((data) => {
                      const vendasDoDia = vendasPorData[data];
                      const totalDia = vendasDoDia.reduce((s, v) => s + v.valor_venda, 0);
                      const clientesDia = vendasDoDia.reduce((s, v) => s + v.qtd_clientes, 0);
                      return (
                        <div key={data} className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-white/5">
                            <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">
                              📅 {formatData(data)}
                            </p>
                            <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                              Total: {formatBRL(totalDia)} · {clientesDia} clientes
                            </p>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {vendasDoDia.map((v) => {
                              const cat = CATEGORIAS.find((c) => c.id === v.categoria);
                              return (
                                <div key={v.id} className="flex items-center justify-between px-3 py-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    {cat && <cat.Icon className="h-3.5 w-3.5 text-slate-500" />}
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{cat?.label || v.categoria}</span>
                                    {v.observacao && <span className="text-slate-400">· {v.observacao}</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{formatBRL(v.valor_venda)}</span>
                                    <span className="text-slate-400">· {v.qtd_clientes} cli</span>
                                    <button
                                      onClick={() => editar(v)}
                                      className="rounded p-1 text-slate-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-white/10"
                                      title="Editar"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => excluir(v.id!)}
                                      className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-white/10"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DICAS */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                💡 <strong>Dicas:</strong>
                <ul className="ml-4 mt-1 list-disc space-y-0.5">
                  <li>Para cada dia, você pode lançar até 4 categorias (Faturamento, ME, Genéricos, SD).</li>
                  <li>O Ticket Médio é calculado automaticamente: Valor ÷ Clientes.</li>
                  <li>Se já existe um lançamento na mesma data/categoria, ele será atualizado.</li>
                  <li>Os valores lançados alimentam o painel Resultados e o dashboard do admin.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, Icon, children }: { label: string; Icon: any; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
        <Icon className="h-3 w-3" /> {label}
      </label>
      {children}
    </div>
  );
}
