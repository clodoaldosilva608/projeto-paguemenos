import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "../../utils/cn";
import { Users2, Search, Edit, Trash2, Plus, X, Loader2, Target, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const PERFIS: { perfil: string; label: string; bg: string; icone: string }[] = [
  { perfil: "admin", label: "Admin", bg: "bg-red-100 text-red-700", icone: "👑" },
  { perfil: "gerente", label: "Gerente", bg: "bg-blue-100 text-blue-700", icone: "🏢" },
  { perfil: "supervisor", label: "Supervisor", bg: "bg-amber-100 text-amber-700", icone: "👥" },
  { perfil: "farmaceutica", label: "Farmacêutica", bg: "bg-emerald-100 text-emerald-700", icone: "💊" },
  { perfil: "vendedor", label: "Atendente", bg: "bg-slate-100 text-slate-600", icone: "📊" },
];

type FiltroStatus = "Todos" | "Ativos" | "Inativos";

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  iniciais: string;
  cargo: string | null;
  filial_id: string | null;
  telefone: string | null;
  ativo: boolean;
  aprovado: boolean;
  role: string;
}

export default function FuncionariosPage() {
  const { usuario: gestor } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroStatus>("Todos");
  const [filtroPerfil, setFiltroPerfil] = useState<string>("Todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [showMetas, setShowMetas] = useState<Funcionario | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        (supabase as any).from("profiles").select("*").order("nome"),
        (supabase as any).from("user_roles").select("user_id, role"),
      ]);
      const rolesMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
      const lista: Funcionario[] = (profiles || []).map((p: any) => ({
        id: p.id,
        nome: p.nome || "",
        email: p.email || "",
        iniciais: p.iniciais || "",
        cargo: p.cargo,
        filial_id: p.filial_id,
        telefone: p.telefone,
        ativo: p.ativo ?? true,
        aprovado: p.aprovado ?? false,
        role: rolesMap.get(p.id) || "vendedor",
      }));
      setFuncionarios(lista);
    } catch (e: any) {
      toast.error("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    let list = funcionarios; // mostra todos inclusive o gestor
    if (filtro === "Ativos") list = list.filter(f => f.ativo);
    if (filtro === "Inativos") list = list.filter(f => !f.ativo);
    if (filtroPerfil !== "Todos") list = list.filter(f => f.role === filtroPerfil);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(f => f.nome.toLowerCase().includes(q) || f.email.toLowerCase().includes(q) || (f.cargo || "").toLowerCase().includes(q));
    }
    return list;
  }, [funcionarios, filtro, filtroPerfil, busca, gestor]);

  const toggleAtivo = async (f: Funcionario) => {
    // Melhoria 8: confirmação antes de desativar (evita desativação acidental)
    if (f.ativo) {
      if (!confirm(`Desativar ${f.nome}?\n\nO funcionário perderá acesso ao sistema até ser reativado.`)) return;
    }
    try {
      const { error } = await (supabase as any).from("profiles").update({ ativo: !f.ativo }).eq("id", f.id);
      if (error) throw error;
      toast.success(f.ativo ? `${f.nome} desativado` : `${f.nome} ativado`);
      carregar();
    } catch (e: any) { toast.error(e.message); }
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este funcionário permanentemente?")) return;
    try {
      // Deletar via Admin API
      const { error } = await (supabase as any).from("profiles").delete().eq("id", id);
      if (error) throw error;
      toast.success("Funcionário excluído");
      carregar();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold text-slate-800">{funcionarios.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Ativos</p><p className="text-xl font-bold text-emerald-600">{funcionarios.filter(f => f.ativo).length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Aprovados</p><p className="text-xl font-bold text-blue-600">{funcionarios.filter(f => f.aprovado).length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Pendentes</p><p className="text-xl font-bold text-amber-600">{funcionarios.filter(f => !f.aprovado).length}</p></div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, email ou cargo..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="Todos">Todos perfis</option>
          {PERFIS.map(p => <option key={p.perfil} value={p.perfil}>{p.label}</option>)}
        </select>
        <div className="flex gap-1">
          {(["Todos", "Ativos", "Inativos"] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={cn("rounded-lg px-3 py-2 text-xs font-semibold", filtro === f ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200")}>{f}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">
          <Users2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Nenhum funcionário encontrado</p>
          <p className="mt-1 text-sm text-slate-500">Os funcionários aparecerão aqui quando se cadastrarem e forem aprovados.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(f => {
            const perfilInfo = PERFIS.find(p => p.perfil === f.role) || PERFIS[3];
            return (
              <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">{f.iniciais || f.nome.substring(0, 2).toUpperCase()}</div>
                    <div>
                      <p className="font-semibold text-slate-800">{f.nome}</p>
                      <p className="text-xs text-slate-500">{f.email}</p>
                    </div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", perfilInfo.bg)}>{perfilInfo.icone} {perfilInfo.label}</span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {f.cargo && <p>📝 {f.cargo}</p>}
                  {f.telefone && <p>📞 {f.telefone}</p>}
                  {f.filial_id && <p>📍 Filial {f.filial_id}</p>}
                  <p className={f.aprovado ? "text-emerald-600" : "text-amber-600"}>{f.aprovado ? "✅ Aprovado" : "⏳ Pendente"}</p>
                </div>

                <div className="mt-3 flex gap-1.5">
                  <button onClick={() => setEditando(f)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><Edit className="h-3 w-3" /> Editar</button>
                  <button onClick={() => setShowMetas(f)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-blue-200 px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"><Target className="h-3 w-3" /> Metas</button>
                  <button onClick={() => toggleAtivo(f)} className={cn("rounded-lg p-1.5 text-xs", f.ativo ? "text-slate-400 dark:text-slate-500 hover:bg-slate-100" : "text-emerald-500 hover:bg-emerald-50")} title={f.ativo ? "Desativar" : "Ativar"}>{f.ativo ? "⚪" : "🟢"}</button>
                  <button onClick={() => excluir(f.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" title="Excluir"><Trash2 className="h-3 w-3" /></button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Editar */}
      {editando && <EditarModal funcionario={editando} onClose={() => { setEditando(null); carregar(); }} />}
      {/* Modal Metas */}
      {showMetas && <MetasModal funcionario={showMetas} onClose={() => setShowMetas(null)} />}
    </div>
  );
}

// =============================================================
// Modal Editar Funcionário
// =============================================================
function EditarModal({ funcionario, onClose }: { funcionario: Funcionario; onClose: () => void }) {
  const [nome, setNome] = useState(funcionario.nome);
  const [cargo, setCargo] = useState(funcionario.cargo || "");
  const [telefone, setTelefone] = useState(funcionario.telefone || "");
  const [filialId, setFilialId] = useState(funcionario.filial_id || "");
  const [role, setRole] = useState(funcionario.role);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("profiles").update({ nome, cargo, telefone, filial_id: filialId || null }).eq("id", funcionario.id);
      if (error) throw error;
      // Atualizar role se mudou
      if (role !== funcionario.role) {
        await (supabase as any).from("user_roles").update({ role }).eq("user_id", funcionario.id);
      }
      toast.success("Funcionário atualizado!");
      onClose();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Editar Funcionário</h3><button onClick={onClose}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button></div>
        <div className="space-y-3">
          <div><label className="text-xs font-semibold uppercase text-slate-500">Nome</label><input value={nome} onChange={e => setNome(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-semibold uppercase text-slate-500">Cargo</label><input value={cargo} onChange={e => setCargo(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-semibold uppercase text-slate-500">Telefone</label><input value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-semibold uppercase text-slate-500">Filial</label><input value={filialId} onChange={e => setFilialId(e.target.value)} placeholder="Ex: 7537" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
          <div><label className="text-xs font-semibold uppercase text-slate-500">Perfil</label><select value={role} onChange={e => setRole(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{PERFIS.map(p => <option key={p.perfil} value={p.perfil}>{p.label}</option>)}</select></div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancelar</button>
          <button onClick={salvar} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// =============================================================
// Modal Metas do Funcionário
// =============================================================
function MetasModal({ funcionario, onClose }: { funcionario: Funcionario; onClose: () => void }) {
  const [metas, setMetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaMeta, setNovaMeta] = useState({ categoria: "faturamento", periodo: "mensal", valor_meta: "", valor_realizado: "" });

  const carregar = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any).from("metas_individuais").select("*").eq("usuario_id", funcionario.id).order("categoria, periodo");
      setMetas(data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [funcionario.id]);

  const adicionar = async () => {
    if (!novaMeta.valor_meta) return;
    try {
      const { error } = await (supabase as any).from("metas_individuais").insert({
        usuario_id: funcionario.id,
        categoria: novaMeta.categoria,
        periodo: novaMeta.periodo,
        valor_meta: Number(novaMeta.valor_meta),
        valor_realizado: Number(novaMeta.valor_realizado) || 0,
        status: "pendente",
      });
      if (error) throw error;
      toast.success("Meta adicionada!");
      setNovaMeta({ categoria: "faturamento", periodo: "mensal", valor_meta: "", valor_realizado: "" });
      carregar();
    } catch (e: any) { toast.error(e.message); }
  };

  const remover = async (id: string) => {
    if (!confirm("Remover esta meta?")) return;
    try {
      await (supabase as any).from("metas_individuais").delete().eq("id", id);
      toast.success("Meta removida");
      carregar();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div><h3 className="text-lg font-semibold">Metas de {funcionario.nome}</h3><p className="text-xs text-slate-500">{funcionario.email}</p></div>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400 dark:text-slate-500" /></button>
        </div>

        {/* Metas existentes */}
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          metas.length === 0 ? <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Nenhuma meta definida ainda.</p> : (
            <div className="space-y-2">
              {metas.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">{m.categoria.replace(/_/g, " ")} <span className="text-xs text-slate-400 dark:text-slate-500">({m.periodo})</span></p>
                    <p className="text-xs text-slate-500">Meta: R$ {Number(m.valor_meta).toFixed(2)} | Realizado: R$ {Number(m.valor_realizado).toFixed(2)} | {m.status}</p>
                  </div>
                  <button onClick={() => remover(m.id)} className="rounded p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Adicionar nova meta */}
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <h4 className="mb-2 text-sm font-bold">Adicionar Meta</h4>
          <div className="grid grid-cols-2 gap-2">
            <select value={novaMeta.categoria} onChange={e => setNovaMeta({ ...novaMeta, categoria: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
              <option value="faturamento">Faturamento</option>
              <option value="marcas_exclusivas">Marcas Exclusivas</option>
              <option value="super_desconto">Super Desconto</option>
              <option value="genericos">Genéricos</option>
            </select>
            <select value={novaMeta.periodo} onChange={e => setNovaMeta({ ...novaMeta, periodo: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
              <option value="mensal">Mensal</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
            </select>
            <input type="number" value={novaMeta.valor_meta} onChange={e => setNovaMeta({ ...novaMeta, valor_meta: e.target.value })} placeholder="Valor meta R$" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
            <input type="number" value={novaMeta.valor_realizado} onChange={e => setNovaMeta({ ...novaMeta, valor_realizado: e.target.value })} placeholder="Realizado R$ (opcional)" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" />
          </div>
          <button onClick={adicionar} className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500">+ Adicionar Meta</button>
        </div>
      </div>
    </div>
  );
}
