import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useStore } from "../../hooks/useStore";
import { useAuth } from "../../contexts/AuthContext";
import FuncionarioModal from "../FuncionarioModal";
import type { Usuario, Perfil } from "../../types/core";
import { cn } from "../../utils/cn";

const perfilBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  gerente: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  supervisor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  vendedor: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

type FiltroStatus = "Todos" | "Ativos" | "Inativos";

export default function UsuariosPage() {
  const { store, version } = useStore();
  const { usuario: usuarioLogado } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Usuario | undefined>();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroStatus>("Todos");
  const [filtroPerfil, setFiltroPerfil] = useState<Perfil | "Todos">("Todos");
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const todos = useMemo(() => store.getUsuarios(), [store, version]);

  const usuarios = useMemo(() => {
    let list = todos;
    if (filtro === "Ativos") list = list.filter((u) => u.ativo);
    if (filtro === "Inativos") list = list.filter((u) => !u.ativo);
    if (filtroPerfil !== "Todos") list = list.filter((u) => u.perfil === filtroPerfil);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter((u) => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [todos, filtro, filtroPerfil, busca]);

  const stats = useMemo(
    () => ({
      total: todos.length,
      ativos: todos.filter((u) => u.ativo).length,
      inativos: todos.filter((u) => !u.ativo).length,
      admins: todos.filter((u) => u.perfil === "admin").length,
      gerentes: todos.filter((u) => u.perfil === "gerente").length,
      supervisores: todos.filter((u) => u.perfil === "supervisor").length,
      vendedores: todos.filter((u) => u.perfil === "vendedor").length,
    }),
    [todos]
  );

  const adminsAtivos = useMemo(() => todos.filter((u) => u.perfil === "admin" && u.ativo).length, [todos]);

  const podeExcluir = (u: Usuario) => {
    if (u.id === usuarioLogado?.id) return false;
    if (u.perfil === "admin" && adminsAtivos <= 1) return false;
    return true;
  };

  const podeInativar = (u: Usuario) => {
    if (u.id === usuarioLogado?.id) return false;
    if (u.perfil === "admin" && u.ativo && adminsAtivos <= 1) return false;
    return true;
  };

  const excluir = (id: string) => {
    store.deleteUsuario(id);
    setExcluindoId(null);
  };

  const toggleAtivo = (u: Usuario) => {
    if (!podeInativar(u)) return;
    store.updateUsuario({ ...u, ativo: !u.ativo });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
        {[
          { label: "Total", value: stats.total, color: "text-slate-800 dark:text-white" },
          { label: "Ativos", value: stats.ativos, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inativos", value: stats.inativos, color: "text-slate-500 dark:text-slate-400" },
          { label: "Admins", value: stats.admins, color: "text-purple-600 dark:text-purple-400" },
          { label: "Gerentes", value: stats.gerentes, color: "text-blue-600 dark:text-blue-400" },
          { label: "Superv.", value: stats.supervisores, color: "text-amber-600 dark:text-amber-400" },
          { label: "Vend.", value: stats.vendedores, color: "text-slate-600 dark:text-slate-300" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={`mt-0.5 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-slate-400">
            <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="text"
            placeholder="Buscar usuário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-transparent text-sm outline-none dark:text-white"
          />
        </div>

        <div className="flex gap-2">
          {(["Todos", "Ativos", "Inativos"] as FiltroStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                filtro === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <select
          value={filtroPerfil}
          onChange={(e) => setFiltroPerfil(e.target.value as Perfil | "Todos")}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <option value="Todos">Todos os perfis</option>
          <option value="admin">Administrador</option>
          <option value="gerente">Gerente</option>
          <option value="supervisor">Supervisor</option>
          <option value="vendedor">Vendedor</option>
        </select>

        <button
          onClick={() => {
            setEditando(undefined);
            setModalAberto(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500"
        >
          <span>+</span> Novo Usuário
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {usuarios.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <span className="text-4xl">👤</span>
            <p className="mt-2 text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Usuário</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Perfil</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Login</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Último Acesso</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 transition hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
                          {u.iniciais}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">
                            {u.nome}
                            {u.id === usuarioLogado?.id && (
                              <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                                Você
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", perfilBadge[u.perfil] || perfilBadge.vendedor)}>
                        {u.perfil}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {u.metodoLogin === "google" ? "Google" : "Senha"}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleAtivo(u)}
                        disabled={!podeInativar(u)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition",
                          u.ativo
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                          !podeInativar(u) && "cursor-not-allowed opacity-60"
                        )}
                        title={!podeInativar(u) ? "Não é possível alterar este usuário" : ""}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.ativo ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {u.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {u.ultimoAcesso ? new Date(u.ultimoAcesso).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditando(u);
                            setModalAberto(true);
                          }}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                        >
                          Editar
                        </button>
                        {excluindoId === u.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => excluir(u.id)}
                              className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-500"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setExcluindoId(null)}
                              className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setExcluindoId(u.id)}
                            disabled={!podeExcluir(u)}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                              podeExcluir(u)
                                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                : "cursor-not-allowed text-slate-300 dark:text-slate-600"
                            )}
                            title={!podeExcluir(u) ? "Não é possível excluir este usuário" : ""}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""} exibido{usuarios.length !== 1 ? "s" : ""}
      </p>

      <FuncionarioModal
        aberto={modalAberto}
        onFechar={() => {
          setModalAberto(false);
          setEditando(undefined);
        }}
        usuario={editando}
        permitirAdmin
      />
    </motion.div>
  );
}
