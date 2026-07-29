import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "../../utils/cn";
import { toast } from "sonner";
import { Plus, X, Save, Edit3, Trash2, Play, Pause, Tag, Loader2, AlertCircle, Calendar } from "lucide-react";

type StatusCampanha = "ativa" | "rascunho" | "encerrada";

interface Campanha {
  id: string;
  nome: string;
  descricao?: string;
  status: StatusCampanha;
  data_inicio?: string;
  data_fim?: string;
  premio?: string;
  regras?: string;
}

const statusBadge: Record<string, string> = {
  ativa: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
  rascunho: "bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400",
  encerrada: "bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
};

const STORAGE_KEY = "orion-campanhas-local";

export default function CampanhasPage() {
  const { usuario } = useAuth();
  const [filtro, setFiltro] = useState<"todas" | StatusCampanha>("todas");
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Campanha | null>(null);
  const [podeEditar, setPodeEditar] = useState(false);
  const [usandoLocal, setUsandoLocal] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    nome: "",
    descricao: "",
    status: "rascunho" as StatusCampanha,
    data_inicio: hoje,
    data_fim: "",
    premio: "",
    regras: "",
  });

  useEffect(() => {
    if (usuario) setPodeEditar(usuario.perfil === "admin" || usuario.perfil === "gerente");
    void carregar();
  }, [usuario]);

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("campanhas").select("*").order("criado_em", { ascending: false });
      if (error) throw error;
      setCampanhas((data as Campanha[]) || []);
      setUsandoLocal(false);
    } catch {
      try {
        const local = window.localStorage.getItem(STORAGE_KEY);
        if (local) setCampanhas(JSON.parse(local));
      } catch {}
      setUsandoLocal(true);
    } finally {
      setLoading(false);
    }
  }

  async function salvarLocal(lista: Campanha[]) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); } catch {}
  }

  async function salvar() {
    if (!form.nome.trim()) { toast.error("Informe o nome da campanha."); return; }
    // Fix: converter strings vazias para null (data_fim pode ser opcional)
    const payload = {
      ...form,
      data_fim: form.data_fim || null,
      data_inicio: form.data_inicio || null,
      descricao: form.descricao || null,
      premio: form.premio || null,
      regras: form.regras || null,
    };
    try {
      if (usandoLocal) {
        if (editando) {
          const atualizadas = campanhas.map((c) => (c.id === editando.id ? { ...c, ...payload } : c));
          setCampanhas(atualizadas); salvarLocal(atualizadas);
        } else {
          const nova: Campanha = { id: crypto.randomUUID(), ...payload } as Campanha;
          setCampanhas([nova, ...campanhas]); salvarLocal([nova, ...campanhas]);
        }
        toast.success(editando ? "Campanha atualizada!" : "Campanha criada!");
      } else {
        if (editando) {
          const { error } = await supabase.from("campanhas").update({ ...payload, atualizado_em: new Date().toISOString() }).eq("id", editando.id);
          if (error) throw new Error(error.message);
          toast.success("Campanha atualizada!");
        } else {
          const { error } = await supabase.from("campanhas").insert({ ...payload, criado_por: usuario?.id });
          if (error) throw new Error(error.message);
          toast.success("Campanha criada!");
        }
        await carregar();
      }
      fecharModal();
    } catch (e: any) { toast.error("Erro: " + e.message); }
  }

  async function alterarStatus(c: Campanha, novoStatus: StatusCampanha) {
    try {
      if (usandoLocal) {
        const atualizadas = campanhas.map((x) => (x.id === c.id ? { ...x, status: novoStatus } : x));
        setCampanhas(atualizadas); salvarLocal(atualizadas);
      } else {
        const { error } = await supabase.from("campanhas").update({ status: novoStatus, atualizado_em: new Date().toISOString() }).eq("id", c.id);
        if (error) throw new Error(error.message);
        await carregar();
      }
      toast.success(`Campanha ${novoStatus === "ativa" ? "ativada" : novoStatus === "encerrada" ? "encerrada" : "em rascunho"}.`);
    } catch (e: any) { toast.error("Erro: " + e.message); }
  }

  async function excluir(c: Campanha) {
    if (!confirm(`Excluir campanha "${c.nome}"?`)) return;
    try {
      if (usandoLocal) {
        const atualizadas = campanhas.filter((x) => x.id !== c.id);
        setCampanhas(atualizadas); salvarLocal(atualizadas);
      } else {
        const { error } = await supabase.from("campanhas").delete().eq("id", c.id);
        if (error) throw new Error(error.message);
        await carregar();
      }
      toast.success("Campanha excluída.");
    } catch (e: any) { toast.error("Erro: " + e.message); }
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", descricao: "", status: "rascunho", data_inicio: hoje, data_fim: "", premio: "", regras: "" });
    setModalAberto(true);
  }

  function abrirEdicao(c: Campanha) {
    setEditando(c);
    setForm({ nome: c.nome, descricao: c.descricao || "", status: c.status, data_inicio: c.data_inicio || hoje, data_fim: c.data_fim || "", premio: c.premio || "", regras: c.regras || "" });
    setModalAberto(true);
  }

  function fecharModal() { setModalAberto(false); setEditando(null); }

  const filtradas = filtro === "todas" ? campanhas : campanhas.filter((c) => c.status === filtro);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {usandoLocal && podeEditar && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <strong>Modo temporário:</strong> As campanhas estão sendo salvas localmente neste navegador. Para persistência multi-usuário, aplique a migration <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">20260724130000_campanhas.sql</code> no Supabase Studio.
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {(["todas", "ativa", "rascunho", "encerrada"] as const).map((f) => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                filtro === f ? "bg-blue-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700")}>
              {f === "todas" ? `Todas (${campanhas.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${campanhas.filter((c) => c.status === f).length})`}
            </button>
          ))}
        </div>
        {podeEditar && (
          <button onClick={abrirNovo} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500">
            <Plus className="h-4 w-4" /> Nova Campanha
          </button>
        )}
      </div>

      {/* Estado vazio com ilustração */}
      {filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-blue-50/30 p-12 text-center dark:border-white/10 dark:from-slate-800/50 dark:to-slate-900">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50">
            <Tag className="h-10 w-10 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">
            {filtro !== "todas" ? `Nenhuma campanha ${filtro}` : "Nenhuma campanha cadastrada"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            {podeEditar
              ? "Crie campanhas comerciais para incentivar sua equipe — prêmios, metas por período, regras personalizadas."
              : "Aguarde o gestor criar campanhas comerciais. Elas aparecerão aqui automaticamente."}
          </p>
          {podeEditar && (
            <button onClick={abrirNovo} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500">
              <Plus className="h-4 w-4" /> Criar primeira campanha
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtradas.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">{c.nome}</h3>
                  {c.descricao && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{c.descricao}</p>}
                </div>
                <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1", statusBadge[c.status])}>{c.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Período</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {c.data_inicio ? new Date(c.data_inicio + "T00:00").toLocaleDateString("pt-BR") : "—"}
                    {c.data_fim ? ` — ${new Date(c.data_fim + "T00:00").toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prêmio</p>
                  <p className="mt-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">{c.premio || "—"}</p>
                </div>
              </div>
              {c.regras && (
                <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <strong>Regras:</strong> {c.regras}
                </div>
              )}
              {podeEditar && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    {c.status !== "ativa" && (
                      <button onClick={() => alterarStatus(c, "ativa")} className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <Play className="h-3 w-3" /> Ativar
                      </button>
                    )}
                    {c.status === "ativa" && (
                      <button onClick={() => alterarStatus(c, "rascunho")} className="flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200">
                        <Pause className="h-3 w-3" /> Pausar
                      </button>
                    )}
                    {c.status !== "encerrada" && (
                      <button onClick={() => alterarStatus(c, "encerrada")} className="rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-200 dark:bg-blue-950/40 dark:text-blue-300">Encerrar</button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => abrirEdicao(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-white/10" aria-label={`Editar ${c.nome}`}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => excluir(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-white/10" aria-label={`Excluir ${c.nome}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* MODAL NOVA/EDITAR CAMPANHA */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={fecharModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-blue-600 px-5 py-3 text-white dark:border-white/10">
                <h2 className="font-bold">{editando ? "Editar Campanha" : "Nova Campanha"}</h2>
                <button onClick={fecharModal} aria-label="Fechar" className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Nome *</label>
                  <input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Black Friday 2026"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Descrição</label>
                  <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} placeholder="Descrição curta da campanha"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><Calendar className="h-3 w-3" /> Data Início</label>
                    <input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-xs font-bold uppercase text-slate-500"><Calendar className="h-3 w-3" /> Data Fim</label>
                    <input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Prêmio</label>
                  <input type="text" value={form.premio} onChange={(e) => setForm({ ...form, premio: e.target.value })} placeholder="Ex: R$ 500 + troféu"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Regras</label>
                  <textarea value={form.regras} onChange={(e) => setForm({ ...form, regras: e.target.value })} rows={3} placeholder="Ex: Vendedor com maior faturamento no período"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusCampanha })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100">
                    <option value="rascunho">Rascunho</option>
                    <option value="ativa">Ativa</option>
                    <option value="encerrada">Encerrada</option>
                  </select>
                </div>
                <button onClick={salvar} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">
                  <Save className="h-4 w-4" /> {editando ? "Atualizar Campanha" : "Criar Campanha"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
