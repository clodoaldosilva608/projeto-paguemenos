import { motion } from "framer-motion";
import { Users, Plus, Search, Edit, Trash2, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Equipe {
  id: string; nome: string; filialNome: string; supervisor: string;
  membros: string[]; ativo: boolean; criadoEm: string;
}

const STORAGE_KEY = "orion-equipes";
function carregar(): Equipe[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function salvar(e: Equipe[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); }

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Equipe | null>(null);

  useEffect(() => { setEquipes(carregar()); setLoading(false); }, []);

  const handleSalvar = (eq: Equipe) => {
    const existe = equipes.find(e => e.id === eq.id);
    const novos = existe ? equipes.map(e => e.id === eq.id ? eq : e) : [...equipes, eq];
    salvar(novos); setEquipes(novos); setShowForm(false); setEditando(null);
    toast.success(existe ? "Equipe atualizada!" : "Equipe criada!");
  };
  const handleExcluir = (id: string) => {
    if (!confirm("Excluir equipe?")) return;
    const novos = equipes.filter(e => e.id !== id); salvar(novos); setEquipes(novos);
    toast.success("Excluída");
  };

  const filtradas = busca ? equipes.filter(e => e.nome.toLowerCase().includes(busca.toLowerCase())) : equipes;

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <button onClick={() => { setEditando(null); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Criar Equipe</button>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Nenhuma equipe cadastrada</p>
          <p className="mt-1 text-sm text-slate-500">Clique em "Criar Equipe" para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtradas.map(eq => (
            <div key={eq.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{eq.nome}</h3>
                  <p className="text-xs text-slate-500">Supervisor: {eq.supervisor || "—"} · {eq.membros.length} membros</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditando(eq); setShowForm(true); }} className="rounded p-2 text-slate-400 dark:text-slate-500 hover:bg-blue-50 hover:text-blue-600"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleExcluir(eq.id)} className="rounded p-2 text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {eq.membros.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {eq.membros.map(m => <span key={m} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">{m}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <EquipeForm equipe={editando} onClose={() => setShowForm(false)} onSalvar={handleSalvar} />}
    </motion.div>
  );
}

function EquipeForm({ equipe, onClose, onSalvar }: { equipe: Equipe | null; onClose: () => void; onSalvar: (e: Equipe) => void }) {
  const [nome, setNome] = useState(equipe?.nome || "");
  const [filialNome, setFilialNome] = useState(equipe?.filialNome || "");
  const [supervisor, setSupervisor] = useState(equipe?.supervisor || "");
  const [membros, setMembros] = useState<string[]>(equipe?.membros || []);
  const [novoMembro, setNovoMembro] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">{equipe ? "Editar" : "Nova"} equipe</h3><button onClick={onClose}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button></div>
        <form onSubmit={e => { e.preventDefault(); onSalvar({ id: equipe?.id || `eq-${Date.now()}`, nome, filialNome, supervisor, membros, ativo: true, criadoEm: equipe?.criadoEm || new Date().toISOString() }); }} className="space-y-3">
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome *" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={filialNome} onChange={e => setFilialNome(e.target.value)} placeholder="Filial" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={supervisor} onChange={e => setSupervisor(e.target.value)} placeholder="Supervisor" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Membros ({membros.length})</label>
            <div className="flex gap-2"><input value={novoMembro} onChange={e => setNovoMembro(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (novoMembro.trim()) { setMembros([...membros, novoMembro.trim()]); setNovoMembro(""); } } }} placeholder="Nome" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" /><button type="button" onClick={() => { if (novoMembro.trim()) { setMembros([...membros, novoMembro.trim()]); setNovoMembro(""); } }} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">+</button></div>
            <div className="mt-2 flex flex-wrap gap-2">{membros.map(m => <span key={m} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">{m}<button type="button" onClick={() => setMembros(membros.filter(x => x !== m))} className="text-blue-400">✕</button></span>)}</div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancelar</button><button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{equipe ? "Salvar" : "Criar"}</button></div>
        </form>
      </div>
    </div>
  );
}
