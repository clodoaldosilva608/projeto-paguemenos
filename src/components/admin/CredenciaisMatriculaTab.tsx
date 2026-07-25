import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  listarCredenciais, salvarCredencial, excluirCredencial,
} from "@/lib/login-matricula.functions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  KeyRound, Plus, Edit3, Trash2, X, Save, Loader2, User, Hash, AlertCircle, Search,
} from "lucide-react";

interface Credencial {
  id?: string;
  user_id: string;
  primeiro_nome: string;
  matricula: string;
  ativo: boolean;
  nome_completo?: string;
  email?: string;
}

interface Profile {
  id: string;
  nome: string;
  email: string;
}

export default function CredenciaisMatriculaTab() {
  const { usuario } = useAuth();
  const [credenciais, setCredenciais] = useState<Credencial[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Credencial | null>(null);

  const fnListar = useServerFn(listarCredenciais);
  const fnSalvar = useServerFn(salvarCredencial);
  const fnExcluir = useServerFn(excluirCredencial);

  const [form, setForm] = useState({
    user_id: "",
    primeiro_nome: "",
    matricula: "",
    ativo: true,
  });

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const [r, { data: profs }] = await Promise.all([
        fnListar({ data: {} } as any),
        supabase.from("profiles").select("id, nome, email").order("nome"),
      ]);
      setCredenciais(r.credenciais || []);
      setProfiles(profs || []);
    } catch (e: any) {
      toast.error("Erro ao carregar credenciais: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ user_id: "", primeiro_nome: "", matricula: "", ativo: true });
    setModalAberto(true);
  }

  function abrirEdicao(c: Credencial) {
    setEditando(c);
    setForm({
      user_id: c.user_id,
      primeiro_nome: c.primeiro_nome,
      matricula: c.matricula,
      ativo: c.ativo,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.user_id) { toast.error("Selecione um funcionário."); return; }
    if (!form.primeiro_nome.trim()) { toast.error("Informe o primeiro nome."); return; }
    if (!form.matricula.trim()) { toast.error("Informe a matrícula."); return; }
    try {
      await fnSalvar({
        data: {
          id: editando?.id,
          user_id: form.user_id,
          primeiro_nome: form.primeiro_nome.trim().toLowerCase(),
          matricula: form.matricula.trim(),
          ativo: form.ativo,
        },
      });
      toast.success(editando ? "Credencial atualizada! Senha redefinida para a matrícula." : "Credencial criada! Senha definida como a matrícula.");
      setModalAberto(false);
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  async function excluir(c: Credencial) {
    if (!confirm(`Excluir credencial de "${c.primeiro_nome}"?\nO funcionário perderá o login por matrícula, mas ainda pode logar por email.`)) return;
    try {
      await fnExcluir({ data: { id: c.id! } });
      toast.success("Credencial excluída.");
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  const filtrados = credenciais.filter((c) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return c.primeiro_nome.toLowerCase().includes(q) ||
      c.matricula.includes(q) ||
      (c.nome_completo || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q);
  });

  // Profiles que ainda não têm credencial
  const profilesSemCredencial = profiles.filter(
    (p) => !credenciais.some((c) => c.user_id === p.id),
  );

  if (usuario?.perfil !== "admin" && usuario?.perfil !== "gerente") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        Acesso restrito a administradores e gerentes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Credenciais por Matrícula
          </h3>
        </div>
        <button
          onClick={abrirNovo}
          disabled={profilesSemCredencial.length === 0}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
          title={profilesSemCredencial.length === 0 ? "Todos os funcionários já têm credencial" : "Nova credencial"}
        >
          <Plus className="h-3.5 w-3.5" /> Nova Credencial
        </button>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
        Vendedores podem fazer login usando <strong>primeiro nome + matrícula</strong> (a matrícula é a senha).
        Admin/gerente pode alterar matrícula, nome ou ativar/desativar credenciais.
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, matrícula ou email..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-white/10 dark:bg-slate-800/50">
          <KeyRound className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">Nenhuma credencial cadastrada</p>
          <p className="mt-1 text-xs text-slate-500">Clique em "Nova Credencial" para criar a primeira.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/5">
              <tr>
                <th className="px-3 py-2"><User className="mr-1 inline h-3 w-3" /> Funcionário</th>
                <th className="px-3 py-2"><Hash className="mr-1 inline h-3 w-3" /> Matrícula</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold capitalize text-slate-800 dark:text-slate-100">{c.primeiro_nome}</p>
                    <p className="text-[10px] text-slate-500">{c.nome_completo || "—"}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                      {c.matricula}
                    </code>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{c.email || "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      c.ativo
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                    }`}>
                      {c.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => abrirEdicao(c)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-white/10"
                        aria-label={`Editar credencial de ${c.primeiro_nome}`}
                        title="Editar"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => excluir(c)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-white/10"
                        aria-label={`Excluir credencial de ${c.primeiro_nome}`}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalAberto(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-blue-600 px-5 py-3 text-white dark:border-white/10">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase">
                  <KeyRound className="h-4 w-4" />
                  {editando ? "Editar Credencial" : "Nova Credencial"}
                </h3>
                <button onClick={() => setModalAberto(false)} aria-label="Fechar" className="rounded-lg p-1.5 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Funcionário *</label>
                  <select
                    value={form.user_id}
                    onChange={(e) => {
                      const prof = profiles.find((p) => p.id === e.target.value);
                      setForm({
                        ...form,
                        user_id: e.target.value,
                        primeiro_nome: prof ? prof.nome.split(" ")[0].toLowerCase() : form.primeiro_nome,
                      });
                    }}
                    disabled={!!editando}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-60"
                  >
                    <option value="">Selecione...</option>
                    {(editando ? profiles : profilesSemCredencial).map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Primeiro Nome *</label>
                  <input
                    type="text"
                    value={form.primeiro_nome}
                    onChange={(e) => setForm({ ...form, primeiro_nome: e.target.value })}
                    placeholder="ex: clodoaldo"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm lowercase dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">Será usado como login (em minúsculas).</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Matrícula *</label>
                  <input
                    type="text"
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    placeholder="ex: 70214306"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">A matrícula será a senha do funcionário.</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-slate-700 dark:text-slate-200">Credencial ativa</span>
                </label>
                <button
                  onClick={salvar}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
                >
                  <Save className="h-4 w-4" /> {editando ? "Atualizar e redefinir senha" : "Criar credencial"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
