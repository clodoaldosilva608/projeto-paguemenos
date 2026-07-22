// =============================================================
// EquipesPage — CRUD via localStorage (sem dados fake)
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Edit, Trash2, Users, X, UserPlus, UserMinus, Loader2, Search,
} from "lucide-react";

interface Equipe {
  id: string;
  nome: string;
  filialId: string;
  filialNome: string;
  supervisor: string;
  membros: string[];
  ativo: boolean;
  criadoEm: string;
}

const STORAGE_KEY = "orion-equipes";

function carregar(): Equipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return []; // VAZIO — sem dados fake
}

function salvar(equipes: Equipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(equipes));
}

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Equipe | null>(null);
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setEquipes(carregar());
      setLoading(false);
    }, 200);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSalvar = (equipe: Equipe) => {
    const existe = equipes.find((e) => e.id === equipe.id);
    let novos: Equipe[];
    if (existe) {
      novos = equipes.map((e) => (e.id === equipe.id ? equipe : e));
      toast.success(`Equipe "${equipe.nome}" atualizada!`);
    } else {
      novos = [...equipes, equipe];
      toast.success(`Equipe "${equipe.nome}" criada!`);
    }
    salvar(novos);
    setEquipes(novos);
    setShowForm(false);
    setEditando(null);
  };

  const handleExcluir = (id: string) => {
    const equipe = equipes.find((e) => e.id === id);
    if (!equipe) return;
    if (!confirm(`Excluir equipe "${equipe.nome}"?`)) return;
    const novos = equipes.filter((e) => e.id !== id);
    salvar(novos);
    setEquipes(novos);
    toast.success("Equipe excluída");
  };

  const filtradas = busca
    ? equipes.filter((e) =>
        e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        e.supervisor.toLowerCase().includes(busca.toLowerCase())
      )
    : equipes;

  const totalAtivos = equipes.filter((e) => e.ativo).length;
  const totalMembros = equipes.reduce((acc, e) => acc + e.membros.length, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Equipes</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{equipes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Ativas</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{totalAtivos}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Total Membros</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{totalMembros}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <button onClick={() => { setEditando(null); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500">
          <Plus className="h-4 w-4" /> Criar Equipe
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Nenhuma equipe cadastrada</p>
          <p className="mt-1 text-sm text-slate-500">Clique em "Criar Equipe" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtradas.map((equipe, i) => (
            <motion.div key={equipe.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{equipe.nome}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${equipe.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {equipe.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">Supervisor: <span className="font-semibold">{equipe.supervisor}</span> · {equipe.filialNome} · {equipe.membros.length} membros</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditando(equipe); setShowForm(true); }} className="rounded-md p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleExcluir(equipe.id)} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {equipe.membros.length > 0 ? (
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {equipe.membros.map((nome) => (
                    <div key={nome} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                        {nome.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                      </div>
                      <p className="truncate text-sm font-semibold text-slate-800">{nome}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-5 text-center text-xs text-slate-400">Nenhum membro nesta equipe.</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <EquipeForm equipe={editando} onClose={() => { setShowForm(false); setEditando(null); }} onSalvar={handleSalvar} />
      )}
    </motion.div>
  );
}

function EquipeForm({ equipe, onClose, onSalvar }: { equipe: Equipe | null; onClose: () => void; onSalvar: (e: Equipe) => void }) {
  const [nome, setNome] = useState(equipe?.nome || "");
  const [filialNome, setFilialNome] = useState(equipe?.filialNome || "");
  const [supervisor, setSupervisor] = useState(equipe?.supervisor || "");
  const [membros, setMembros] = useState<string[]>(equipe?.membros || []);
  const [ativo, setAtivo] = useState(equipe?.ativo ?? true);
  const [novoMembro, setNovoMembro] = useState("");

  const adicionar = () => {
    if (novoMembro.trim()) {
      setMembros([...membros, novoMembro.trim()]);
      setNovoMembro("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{equipe ? "Editar equipe" : "Nova equipe"}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSalvar({ id: equipe?.id || `eq-${Date.now()}`, nome, filialId: "", filialNome, supervisor, membros, ativo, criadoEm: equipe?.criadoEm || new Date().toISOString() }); }} className="space-y-3">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da equipe *" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={filialNome} onChange={(e) => setFilialNome(e.target.value)} placeholder="Filial" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="Supervisor" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Membros ({membros.length})</label>
            <div className="flex gap-2">
              <input value={novoMembro} onChange={(e) => setNovoMembro(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), adicionar())} placeholder="Nome do membro" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button type="button" onClick={adicionar} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"><UserPlus className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {membros.map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {m}<button type="button" onClick={() => setMembros(membros.filter((x) => x !== m))} className="text-blue-500"><UserMinus className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativa</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancelar</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{equipe ? "Salvar" : "Criar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
