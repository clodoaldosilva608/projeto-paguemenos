import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import type { Usuario, Perfil } from "../../types/core";
import FuncionarioModal from "../FuncionarioModal";
import { useStore } from "../../hooks/useStore";
import { cn } from "../../utils/cn";

const PERFIS: { perfil: Perfil; label: string; bg: string; icone: string }[] = [
  { perfil: "gerente", label: "Gerente", bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icone: "🏢" },
  { perfil: "supervisor", label: "Supervisor", bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icone: "👥" },
  { perfil: "vendedor", label: "Vendedor", bg: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", icone: "📊" },
];

type FiltroStatus = "Todos" | "Ativos" | "Inativos";

export default function FuncionariosPage() {
  const { store, version } = useStore();
  const [filtro, setFiltro] = useState<FiltroStatus>("Todos");
  const [filtroPerfil, setFiltroPerfil] = useState<Perfil | "Todos">("Todos");
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | undefined>();
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const allUsers = useMemo(() => (store.getUsuarios() as any[]).filter((u: any) => u.perfil !== "admin"), [store, version]);

  const usuarios = useMemo(() => {
    let list = allUsers;
    if (filtro === "Ativos") list = list.filter((u) => u.ativo);
    if (filtro === "Inativos") list = list.filter((u) => !u.ativo);
    if (filtroPerfil !== "Todos") list = list.filter((u) => u.perfil === filtroPerfil);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter((u) => u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [allUsers, filtro, filtroPerfil, busca]);

  const stats = useMemo(
    () => ({
      total: allUsers.length,
      ativos: allUsers.filter((u) => u.ativo).length,
      inativos: allUsers.filter((u) => !u.ativo).length,
      gerentes: allUsers.filter((u) => u.perfil === "gerente").length,
      supervisores: allUsers.filter((u) => u.perfil === "supervisor").length,
      vendedores: allUsers.filter((u) => u.perfil === "vendedor").length,
    }),
    [allUsers]
  );

  const excluir = (id: string) => {
    store.deleteUsuario(id);
    setExcluindoId(null);
  };

  const toggleAtivo = (u: Usuario) => {
    store.updateUsuario({ ...u, ativo: !u.ativo });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "text-slate-800 dark:text-white" },
          { label: "Ativos", value: stats.ativos, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Inativos", value: stats.inativos, color: "text-slate-500 dark:text-slate-400" },
          { label: "Gerentes", value: stats.gerentes, color: "text-blue-600 dark:text-blue-400" },
          { label: "Supervisores", value: stats.supervisores, color: "text-amber-600 dark:text-amber-400" },
          { label: "Vendedores", value: stats.vendedores, color: "text-slate-600 dark:text-slate-300" },
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
            placeholder="Buscar colaborador..."
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
          <option value="gerente">Gerente</option>
          <option value="supervisor">Supervisor</option>
          <option value="vendedor">Vendedor</option>
        </select>

        <button
          onClick={() => {
            setUsuarioEditando(undefined);
            setModalAberto(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-500"
        >
          <span>+</span> Novo Colaborador
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {usuarios.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <span className="text-4xl">👥</span>
            <p className="mt-2 text-sm">Nenhum colaborador encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Colaborador</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Perfil</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Login</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u: any) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 transition hover:bg-blue-50/40 dark:border-slate-800 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white",
                            u.perfil === "gerente"
                              ? "bg-gradient-to-br from-blue-500 to-blue-700"
                              : u.perfil === "supervisor"
                              ? "bg-gradient-to-br from-amber-500 to-amber-700"
                              : "bg-gradient-to-br from-slate-400 to-slate-600"
                          )}
                        >
                          {u.iniciais}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">{u.nome}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {PERFIS.filter((p) => p.perfil === u.perfil).map((p) => (
                        <span key={p.perfil} className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", p.bg)}>
                          {p.icone} {p.label}
                        </span>
                      ))}
                    </td>
                    <td className="px-5 py-3">
                      {u.metodoLogin === "google" ? (
                        <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                          <span className="font-bold">G</span> Google
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">🔐 Senha</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleAtivo(u)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition",
                          u.ativo
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.ativo ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {u.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setUsuarioEditando(u);
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
                            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
        {usuarios.length} colaborador{usuarios.length !== 1 ? "es" : ""} encontrado{usuarios.length !== 1 ? "s" : ""}
      </p>

      <FuncionarioModal
        aberto={modalAberto}
        onFechar={() => {
          setModalAberto(false);
          setUsuarioEditando(undefined);
        }}
        usuario={usuarioEditando}
      />
    </motion.div>
  );
}
