import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  listarUsuariosComCredenciais,
  salvarCredencial,
  excluirCredencial,
} from "@/lib/login-matricula.functions";
import { useAuth } from "@/contexts/AuthContext";
import {
  KeyRound, Plus, Edit3, Trash2, X, Save, Loader2, User, Hash, AlertCircle, Search,
  ShieldCheck, Crown, Shield, ShieldAlert, Lock,
} from "lucide-react";

interface UsuarioCred {
  user_id: string;
  nome: string;
  email: string;
  role: "admin" | "gerente" | "supervisor" | "vendedor" | string;
  credencial_id: string | null;
  primeiro_nome: string | null;
  matricula: string | null;
  ativo: boolean | null;
  tem_credencial: boolean;
}

const ROLE_META: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}> = {
  admin: {
    label: "Admin Master",
    icon: Crown,
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-100 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-900",
  },
  gerente: {
    label: "Gerente",
    icon: ShieldCheck,
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-100 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900",
  },
  supervisor: {
    label: "Supervisor",
    icon: Shield,
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900",
  },
  vendedor: {
    label: "Vendedor",
    icon: User,
    color: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-200 dark:border-slate-700",
  },
};

function roleMeta(role: string) {
  return ROLE_META[role] || ROLE_META.vendedor;
}

export default function CredenciaisMatriculaTab() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioCred[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioCred | null>(null);

  const fnListar = useServerFn(listarUsuariosComCredenciais);
  const fnSalvar = useServerFn(salvarCredencial);
  const fnExcluir = useServerFn(excluirCredencial);

  const [form, setForm] = useState({
    user_id: "",
    primeiro_nome: "",
    matricula: "",
    ativo: true,
  });

  // Permissões:
  // - admin, gerente, supervisor: podem VISUALIZAR todos
  // - apenas admin e gerente: podem EDITAR/EXCLUIR/CRIAR
  // - NINGUÉM (nem admin) pode editar/excluir credencial de outro admin
  const podeVisualizar = usuario?.perfil === "admin" || usuario?.perfil === "gerente" || usuario?.perfil === "supervisor";
  const podeEditar = usuario?.perfil === "admin" || usuario?.perfil === "gerente";

  useEffect(() => {
    if (podeVisualizar) void carregar();
  }, [podeVisualizar]);

  async function carregar() {
    setLoading(true);
    try {
      const r = await fnListar({ data: {} } as any);
      setUsuarios(r.usuarios || []);
    } catch (e: any) {
      toast.error("Erro ao carregar usuários: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setForm({ user_id: "", primeiro_nome: "", matricula: "", ativo: true });
    setModalAberto(true);
  }

  function abrirEdicao(u: UsuarioCred) {
    setEditando(u);
    setForm({
      user_id: u.user_id,
      primeiro_nome: u.primeiro_nome || u.nome.split(" ")[0].toLowerCase(),
      matricula: u.matricula || "",
      ativo: u.ativo ?? true,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.user_id) { toast.error("Selecione um funcionário."); return; }
    if (!form.primeiro_nome.trim()) { toast.error("Informe o primeiro nome."); return; }
    if (!form.matricula.trim()) { toast.error("Informe a matrícula."); return; }
    if (form.matricula.trim().length < 6) { toast.error("Matrícula deve ter pelo menos 6 dígitos."); return; }
    if (!/^\d+$/.test(form.matricula.trim())) { toast.error("Matrícula deve conter apenas números."); return; }
    try {
      await fnSalvar({
        data: {
          id: editando?.credencial_id || undefined,
          user_id: form.user_id,
          primeiro_nome: form.primeiro_nome.trim().toLowerCase(),
          matricula: form.matricula.trim(),
          ativo: form.ativo,
        },
      });
      toast.success(editando?.tem_credencial ? "Credencial atualizada! Senha redefinida para a matrícula." : "Credencial criada! Senha definida como a matrícula.");
      setModalAberto(false);
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  async function excluir(u: UsuarioCred) {
    if (!u.credencial_id) return;
    if (!confirm(`Excluir credencial de "${u.primeiro_nome || u.nome}"?\nO funcionário perderá o login por matrícula, mas ainda pode logar por email.`)) return;
    try {
      await fnExcluir({ data: { id: u.credencial_id } });
      toast.success("Credencial excluída.");
      await carregar();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  }

  const filtrados = usuarios.filter((u) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      (u.nome || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.primeiro_nome || "").toLowerCase().includes(q) ||
      (u.matricula || "").includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  // Para o select de "Nova credencial": apenas usuários sem credencial E que não sejam admin
  const usuariosParaNovaCred = usuarios.filter(
    (u) => !u.tem_credencial && u.role !== "admin",
  );

  if (!podeVisualizar) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        <ShieldAlert className="mb-2 h-6 w-6" />
        Acesso restrito a administradores, gerentes e supervisores.
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
        {podeEditar && (
          <button
            onClick={abrirNovo}
            disabled={usuariosParaNovaCred.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
            title={usuariosParaNovaCred.length === 0 ? "Todos os funcionários elegíveis já têm credencial" : "Nova credencial"}
          >
            <Plus className="h-3.5 w-3.5" /> Nova Credencial
          </button>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        <AlertCircle className="mr-1 inline h-3.5 w-3.5" />
        Funcionários podem fazer login usando <strong>primeiro nome + matrícula</strong> (a matrícula é a senha).
        {podeEditar ? (
          <> Admin e gerente podem criar/editar/excluir credenciais. <strong className="text-red-600 dark:text-red-400">Credenciais de Admin Master não podem ser alteradas</strong> (login por email + senha).</>
        ) : (
          <> Como supervisor, você tem acesso somente leitura. Apenas admin e gerente podem alterar credenciais.</>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, email, matrícula ou perfil..."
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
          <p className="font-semibold text-slate-700 dark:text-slate-200">Nenhum funcionário encontrado</p>
          <p className="mt-1 text-xs text-slate-500">Ajuste a busca ou verifique se há usuários cadastrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/5">
              <tr>
                <th className="px-3 py-2"><User className="mr-1 inline h-3 w-3" /> Funcionário</th>
                <th className="px-3 py-2">Perfil</th>
                <th className="px-3 py-2"><Hash className="mr-1 inline h-3 w-3" /> Matrícula</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => {
                const meta = roleMeta(u.role);
                const RoleIcon = meta.icon;
                const ehAdmin = u.role === "admin";
                // Regras de bloqueio de edição:
                // - supervisor nunca edita (read-only)
                // - NINGUÉM edita/exclui admin (mesmo que seja admin ou gerente)
                const podeEditarEste = podeEditar && !ehAdmin;
                return (
                  <tr key={u.user_id} className={`border-t border-slate-100 dark:border-white/5 ${ehAdmin ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold capitalize text-slate-800 dark:text-slate-100">
                        {u.primeiro_nome || u.nome.split(" ")[0].toLowerCase()}
                      </p>
                      <p className="text-[10px] text-slate-500">{u.nome}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${meta.bg} ${meta.color} ${meta.border}`}>
                        <RoleIcon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.matricula ? (
                        <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                          {u.matricula}
                        </code>
                      ) : ehAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400" title="Admin faz login por email + senha">
                          <Lock className="h-3 w-3" /> —
                        </span>
                      ) : (
                        <span className="text-[10px] italic text-slate-400">sem credencial</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{u.email || "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      {u.tem_credencial ? (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          u.ativo
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                        }`}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                      ) : ehAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400" title="Login por email">
                          <Lock className="h-3 w-3" /> email
                        </span>
                      ) : (
                        <span className="text-[10px] italic text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        {podeEditarEste && (u.tem_credencial || !ehAdmin) ? (
                          <>
                            <button
                              onClick={() => abrirEdicao(u)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-white/10"
                              aria-label={`Editar credencial de ${u.nome}`}
                              title={u.tem_credencial ? "Editar" : "Criar credencial"}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {u.tem_credencial && (
                              <button
                                onClick={() => excluir(u)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-white/10"
                                aria-label={`Excluir credencial de ${u.nome}`}
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </>
                        ) : ehAdmin ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                            title="Credenciais de Admin Master não podem ser alteradas"
                          >
                            <Lock className="h-3 w-3" /> Protegido
                          </span>
                        ) : !podeEditar ? (
                          <span className="text-[10px] italic text-slate-400" title="Somente leitura">
                            leitura
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumo */}
      {!loading && usuarios.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span>Total: <strong className="text-slate-700 dark:text-slate-200">{usuarios.length}</strong></span>
          <span>·</span>
          <span>Admin: <strong className="text-red-600 dark:text-red-400">{usuarios.filter(u => u.role === "admin").length}</strong></span>
          <span>·</span>
          <span>Gerentes: <strong className="text-blue-600 dark:text-blue-400">{usuarios.filter(u => u.role === "gerente").length}</strong></span>
          <span>·</span>
          <span>Supervisores: <strong className="text-amber-600 dark:text-amber-400">{usuarios.filter(u => u.role === "supervisor").length}</strong></span>
          <span>·</span>
          <span>Vendedores: <strong className="text-slate-700 dark:text-slate-300">{usuarios.filter(u => u.role === "vendedor").length}</strong></span>
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
                  {editando?.tem_credencial ? "Editar Credencial" : "Nova Credencial"}
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
                      const prof = usuarios.find((p) => p.user_id === e.target.value);
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
                    {(editando ? usuarios.filter(u => u.user_id === editando.user_id) : usuariosParaNovaCred).map((p) => {
                      const meta = roleMeta(p.role);
                      return (
                        <option key={p.user_id} value={p.user_id}>
                          {p.nome} — {meta.label} ({p.email})
                        </option>
                      );
                    })}
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
                  <Save className="h-4 w-4" /> {editando?.tem_credencial ? "Atualizar e redefinir senha" : "Criar credencial"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
