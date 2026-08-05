/**
 * GestaoMetasTab — aba para o gestor lançar/editar metas e vendas
 * Permite CRUD completo de metas_individuais e vendas_diarias
 * Dados vêm do Supabase em tempo real
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fmtBRL, fmtPct, fmtData } from "@/lib/planilha/format";
import { CATEGORIAS, CATEGORIA_PARA_SLUG } from "@/lib/planilha/format";
import type { DashboardData } from "@/lib/planilha/data";
import { Loader2, Plus, Trash2, Edit3, X, Save, TrendingUp, Target, DollarSign } from "lucide-react";

interface MetaRow {
  id: string;
  usuario_id: string;
  vendedorNome: string;
  filial_id: string;
  equipe_id: string | null;
  categoria: string;
  periodo: string;
  valor_meta: number;
  valor_realizado: number;
  valor_projecao: number;
  data_inicio: string;
  status: string;
}

interface VendaRow {
  id: string;
  usuario_id: string;
  vendedorNome: string;
  filial_id: string;
  equipe_id: string | null;
  data: string;
  categoria: string;
  valor_venda: number;
  qtd_clientes: number;
  observacao: string | null;
}

type SubAba = "metas" | "vendas" | "projecao";

export function GestaoMetas({ d }: { d: DashboardData }) {
  const { usuario } = useAuth();
  const [subAba, setSubAba] = useState<SubAba>("metas");
  const [metas, setMetas] = useState<MetaRow[]>([]);
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMeta, setModalMeta] = useState<MetaRow | null | "nova">(null);
  const [modalVenda, setModalVenda] = useState<VendaRow | null | "nova">(null);

  const vendedoresMap = new Map(d.vendedoresList.map((v, i) => [v.nome, { id: v.id, nome: v.nome }]));
  // Mapear nomes para UUIDs reais do Supabase
  const [uuidMap, setUuidMap] = useState<Record<string, string>>({});

  useEffect(() => {
    void carregar();
  }, [d.filtros]);

  async function carregar() {
    setLoading(true);
    const filialId = usuario?.filialId || null;

    // Buscar UUIDs reais dos profiles
    let pQ = supabase.from("profiles").select("id, nome, filial_id").eq("ativo", true).order("nome");
    if (filialId) pQ = pQ.eq("filial_id", filialId);
    const { data: profiles } = await pQ;
    const nomeToUuid: Record<string, string> = {};
    (profiles || []).forEach((p: any) => { nomeToUuid[p.nome] = p.id; });
    setUuidMap(nomeToUuid);

    // Buscar metas
    let mQ = supabase.from("metas_individuais").select("*").order("categoria, periodo");
    if (filialId) mQ = mQ.eq("filial_id", filialId);
    const { data: metasData } = await mQ;
    const metasRows: MetaRow[] = (metasData || []).map((m: any) => ({
      ...m,
      vendedorNome: (profiles || []).find((p: any) => p.id === m.usuario_id)?.nome || "—",
    })).filter((m: MetaRow) => nomeToUuid[m.vendedorNome]);
    setMetas(metasRows);

    // Buscar vendas
    let vQ = supabase.from("vendas_diarias").select("*").order("data", { ascending: false }).limit(100);
    if (filialId) vQ = vQ.eq("filial_id", filialId);
    const { data: vendasData } = await vQ;
    const vendasRows: VendaRow[] = (vendasData || []).map((v: any) => ({
      ...v,
      vendedorNome: (profiles || []).find((p: any) => p.id === v.usuario_id)?.nome || "—",
    })).filter((v: VendaRow) => nomeToUuid[v.vendedorNome]);
    setVendas(vendasRows);

    setLoading(false);
  }

  async function salvarMeta(meta: Partial<MetaRow>) {
    const filialId = usuario?.filialId || "7537";
    const payload = {
      usuario_id: meta.usuario_id,
      filial_id: filialId,
      equipe_id: meta.equipe_id || null,
      categoria: meta.categoria,
      periodo: meta.periodo,
      valor_meta: Number(meta.valor_meta) || 0,
      valor_realizado: Number(meta.valor_realizado) || 0,
      valor_projecao: Number(meta.valor_projecao) || 0,
      data_inicio: meta.data_inicio || new Date().toISOString().slice(0, 8) + "01",
      status: meta.status || "em_andamento",
    };
    if (meta.id) {
      const { error } = await supabase.from("metas_individuais").update(payload).eq("id", meta.id);
      if (error) { alert("Erro: " + error.message); return; }
    } else {
      const { error } = await supabase.from("metas_individuais").insert(payload);
      if (error) { alert("Erro: " + error.message); return; }
    }
    setModalMeta(null);
    void carregar();
  }

  async function excluirMeta(id: string) {
    if (!confirm("Excluir esta meta?")) return;
    const { error } = await supabase.from("metas_individuais").delete().eq("id", id);
    if (error) { alert("Erro: " + error.message); return; }
    void carregar();
  }

  async function salvarVenda(venda: Partial<VendaRow>) {
    const filialId = usuario?.filialId || "7537";
    const payload = {
      usuario_id: venda.usuario_id,
      filial_id: filialId,
      equipe_id: venda.equipe_id || null,
      data: venda.data,
      categoria: venda.categoria,
      valor_venda: Number(venda.valor_venda) || 0,
      qtd_clientes: Number(venda.qtd_clientes) || 0,
      observacao: venda.observacao || null,
    };
    if (venda.id) {
      const { error } = await supabase.from("vendas_diarias").update(payload).eq("id", venda.id);
      if (error) { alert("Erro: " + error.message); return; }
    } else {
      const { error } = await supabase.from("vendas_diarias").insert(payload);
      if (error) { alert("Erro: " + error.message); return; }
    }
    setModalVenda(null);
    void carregar();
  }

  async function excluirVenda(id: string) {
    if (!confirm("Excluir esta venda?")) return;
    const { error } = await supabase.from("vendas_diarias").delete().eq("id", id);
    if (error) { alert("Erro: " + error.message); return; }
    void carregar();
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-sky-400" /></div>;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Sub-abas */}
      <div className="flex gap-1.5">
        <SubTab active={subAba === "metas"} onClick={() => setSubAba("metas")} icon={<Target className="h-3.5 w-3.5" />} label="Metas" />
        <SubTab active={subAba === "vendas"} onClick={() => setSubAba("vendas")} icon={<DollarSign className="h-3.5 w-3.5" />} label="Vendas" />
        <SubTab active={subAba === "projecao"} onClick={() => setSubAba("projecao")} icon={<TrendingUp className="h-3.5 w-3.5" />} label="Projeção" />
      </div>

      {/* Botão novo */}
      <div className="flex justify-end">
        <button
          onClick={() => setModalMeta(subAba === "vendas" ? "nova" : "nova")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-1.5 text-[11px] font-bold text-sky-300 hover:bg-sky-500/30"
        >
          <Plus className="h-3.5 w-3.5" /> {subAba === "vendas" ? "Nova Venda" : "Nova Meta"}
        </button>
      </div>

      {/* Conteúdo */}
      {subAba === "metas" && (
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full text-[10px]">
            <thead className="bg-[#0d2640] text-slate-400">
              <tr className="text-left uppercase">
                <th className="px-2 py-1.5">Vendedor</th>
                <th className="px-2 py-1.5">Categoria</th>
                <th className="px-2 py-1.5">Período</th>
                <th className="px-2 py-1.5 text-right">Meta</th>
                <th className="px-2 py-1.5 text-right">Realizado</th>
                <th className="px-2 py-1.5 text-right">Projeção</th>
                <th className="px-2 py-1.5 text-right">%</th>
                <th className="px-2 py-1.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {metas.map((m) => {
                const pct = m.valor_meta > 0 ? (m.valor_realizado / m.valor_meta) * 100 : 0;
                return (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1 text-slate-200">{m.vendedorNome}</td>
                    <td className="px-2 py-1 text-slate-400">{m.categoria}</td>
                    <td className="px-2 py-1 text-slate-400">{m.periodo}</td>
                    <td className="px-2 py-1 text-right text-slate-300">{fmtBRL(m.valor_meta)}</td>
                    <td className="px-2 py-1 text-right font-semibold text-emerald-400">{fmtBRL(m.valor_realizado)}</td>
                    <td className="px-2 py-1 text-right text-blue-400">{fmtBRL(m.valor_projecao)}</td>
                    <td className="px-2 py-1 text-right font-bold" style={{ color: pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#dc2626" }}>{fmtPct(pct)}</td>
                    <td className="px-2 py-1">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setModalMeta(m)} className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"><Edit3 className="h-3 w-3" /></button>
                        <button onClick={() => excluirMeta(m.id)} className="rounded p-0.5 text-red-400 hover:bg-red-500/20"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {metas.length === 0 && <tr><td colSpan={8} className="px-2 py-6 text-center text-slate-500">Nenhuma meta cadastrada</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {subAba === "vendas" && (
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full text-[10px]">
            <thead className="bg-[#0d2640] text-slate-400">
              <tr className="text-left uppercase">
                <th className="px-2 py-1.5">Data</th>
                <th className="px-2 py-1.5">Vendedor</th>
                <th className="px-2 py-1.5">Categoria</th>
                <th className="px-2 py-1.5 text-right">Valor</th>
                <th className="px-2 py-1.5 text-right">Clientes</th>
                <th className="px-2 py-1.5 text-right">Ticket</th>
                <th className="px-2 py-1.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => {
                const tk = v.qtd_clientes > 0 ? v.valor_venda / v.qtd_clientes : 0;
                return (
                  <tr key={v.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-2 py-1 text-slate-400">{fmtData(v.data)}</td>
                    <td className="px-2 py-1 text-slate-200">{v.vendedorNome}</td>
                    <td className="px-2 py-1 text-slate-400">{v.categoria}</td>
                    <td className="px-2 py-1 text-right font-semibold text-slate-100">{fmtBRL(v.valor_venda)}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{v.qtd_clientes}</td>
                    <td className="px-2 py-1 text-right text-slate-400">{fmtBRL(tk)}</td>
                    <td className="px-2 py-1">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setModalVenda(v)} className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"><Edit3 className="h-3 w-3" /></button>
                        <button onClick={() => excluirVenda(v.id)} className="rounded p-0.5 text-red-400 hover:bg-red-500/20"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {vendas.length === 0 && <tr><td colSpan={7} className="px-2 py-6 text-center text-slate-500">Nenhuma venda lançada</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {subAba === "projecao" && (
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-[12px] font-bold text-slate-200">Projeção de Fechamento</h3>
          <div className="space-y-2">
            {CATEGORIAS.map((cat) => {
              const metasCat = metas.filter(m => m.categoria === CATEGORIA_PARA_SLUG[cat] || m.categoria === cat);
              const metaTotal = metasCat.reduce((s, m) => s + m.valor_meta, 0);
              const realTotal = metasCat.reduce((s, m) => s + m.valor_realizado, 0);
              const projTotal = metasCat.reduce((s, m) => s + m.valor_projecao, 0);
              const pct = metaTotal > 0 ? (realTotal / metaTotal) * 100 : 0;
              const projPct = metaTotal > 0 ? (projTotal / metaTotal) * 100 : 0;
              return (
                <div key={cat} className="rounded-lg bg-white/[0.03] p-2.5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">{cat}</span>
                    <span className="text-[10px] text-slate-500">{metasCat.length} metas</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-slate-500">Meta:</span> <span className="font-bold text-slate-300">{fmtBRL(metaTotal)}</span></div>
                    <div><span className="text-slate-500">Realizado:</span> <span className="font-bold text-emerald-400">{fmtBRL(realTotal)}</span></div>
                    <div><span className="text-slate-500">Projeção:</span> <span className="font-bold text-blue-400">{fmtBRL(projTotal)}</span></div>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[8px] text-slate-500">Real</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="w-10 text-right text-[9px] font-bold text-emerald-400">{fmtPct(pct)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-[8px] text-slate-500">Proj.</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, projPct)}%` }} />
                      </div>
                      <span className="w-10 text-right text-[9px] font-bold text-blue-400">{fmtPct(projPct)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[9px] text-slate-500">💡 A projeção é calculada somando o campo valor_projecao de cada meta. Edite as metas na aba "Metas" para ajustar a projeção.</p>
        </div>
      )}

      {/* Modal Meta */}
      {modalMeta && (
        <MetaModal
          meta={modalMeta === "nova" ? null : modalMeta}
          vendedores={Object.entries(uuidMap).map(([nome, uuid]) => ({ nome, uuid }))}
          onClose={() => setModalMeta(null)}
          onSave={salvarMeta}
        />
      )}

      {/* Modal Venda */}
      {modalVenda && (
        <VendaModal
          venda={modalVenda === "nova" ? null : modalVenda}
          vendedores={Object.entries(uuidMap).map(([nome, uuid]) => ({ nome, uuid }))}
          onClose={() => setModalVenda(null)}
          onSave={salvarVenda}
        />
      )}
    </div>
  );
}

function SubTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors ${
        active ? "bg-sky-500/20 text-sky-300" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function MetaModal({ meta, vendedores, onClose, onSave }: {
  meta: MetaRow | null;
  vendedores: { nome: string; uuid: string }[];
  onClose: () => void;
  onSave: (m: Partial<MetaRow>) => void;
}) {
  const [form, setForm] = useState({
    usuario_id: meta?.usuario_id || vendedores[0]?.uuid || "",
    categoria: meta?.categoria || "faturamento",
    periodo: meta?.periodo || "mensal",
    valor_meta: meta?.valor_meta?.toString() || "",
    valor_realizado: meta?.valor_realizado?.toString() || "",
    valor_projecao: meta?.valor_projecao?.toString() || "",
    data_inicio: meta?.data_inicio || new Date().toISOString().slice(0, 8) + "01",
    status: meta?.status || "em_andamento",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d2640] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{meta ? "Editar Meta" : "Nova Meta"}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Vendedor">
            <select value={form.usuario_id} onChange={(e) => setForm({ ...form, usuario_id: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
              {vendedores.map((v) => <option key={v.uuid} value={v.uuid} className="bg-slate-800">{v.nome}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
                <option value="faturamento" className="bg-slate-800">Faturamento</option>
                <option value="marcas_exclusivas" className="bg-slate-800">Marcas Exclusivas</option>
                <option value="genericos" className="bg-slate-800">Genéricos</option>
                <option value="super_desconto" className="bg-slate-800">Super Desconto</option>
              </select>
            </Field>
            <Field label="Período">
              <select value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
                <option value="mensal" className="bg-slate-800">Mensal</option>
                <option value="diaria" className="bg-slate-800">Diária</option>
                <option value="semanal" className="bg-slate-800">Semanal</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Meta (R$)">
              <input type="number" step="0.01" value={form.valor_meta} onChange={(e) => setForm({ ...form, valor_meta: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white" />
            </Field>
            <Field label="Realizado (R$)">
              <input type="number" step="0.01" value={form.valor_realizado} onChange={(e) => setForm({ ...form, valor_realizado: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white" />
            </Field>
            <Field label="Projeção (R$)">
              <input type="number" step="0.01" value={form.valor_projecao} onChange={(e) => setForm({ ...form, valor_projecao: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-white" />
            </Field>
          </div>
          <Field label="Data início">
            <input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white" />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => onSave({ ...form, id: meta?.id })} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function VendaModal({ venda, vendedores, onClose, onSave }: {
  venda: VendaRow | null;
  vendedores: { nome: string; uuid: string }[];
  onClose: () => void;
  onSave: (v: Partial<VendaRow>) => void;
}) {
  const [form, setForm] = useState({
    usuario_id: venda?.usuario_id || vendedores[0]?.uuid || "",
    data: venda?.data || new Date().toISOString().slice(0, 10),
    categoria: venda?.categoria || "faturamento",
    valor_venda: venda?.valor_venda?.toString() || "",
    qtd_clientes: venda?.qtd_clientes?.toString() || "",
    observacao: venda?.observacao || "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d2640] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{venda ? "Editar Venda" : "Nova Venda"}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Vendedor">
            <select value={form.usuario_id} onChange={(e) => setForm({ ...form, usuario_id: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
              {vendedores.map((v) => <option key={v.uuid} value={v.uuid} className="bg-slate-800">{v.nome}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white" />
            </Field>
            <Field label="Categoria">
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
                <option value="faturamento" className="bg-slate-800">Faturamento</option>
                <option value="marcas_exclusivas" className="bg-slate-800">Marcas Exclusivas</option>
                <option value="genericos" className="bg-slate-800">Genéricos</option>
                <option value="super_desconto" className="bg-slate-800">Super Desconto</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input type="number" step="0.01" value={form.valor_venda} onChange={(e) => setForm({ ...form, valor_venda: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white" />
            </Field>
            <Field label="Clientes">
              <input type="number" value={form.qtd_clientes} onChange={(e) => setForm({ ...form, qtd_clientes: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white" />
            </Field>
          </div>
          <Field label="Observação">
            <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white" placeholder="Opcional" />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => onSave({ ...form, id: venda?.id })} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {children}
    </div>
  );
}
