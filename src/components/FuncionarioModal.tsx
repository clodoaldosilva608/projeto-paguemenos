import { useState, useEffect } from "react";
import { store, gerarPermissoes } from "../data/store";
import type { Usuario, Perfil } from "../types/core";
import { cn } from "../utils/cn";


const PERFIS_BASE: { value: Perfil; label: string; icon: string }[] = [
  { value: "vendedor", label: "Vendedor", icon: "📊" },
  { value: "farmaceutica", label: "Farmacêutica", icon: "💊" },
  { value: "supervisor", label: "Supervisor", icon: "👥" },
  { value: "gerente", label: "Gerente", icon: "🏢" },
];
const PERFIL_ADMIN = { value: "admin" as Perfil, label: "Administrador", icon: "🛡️" };


type TipoLogin = "email" | "google";

interface FuncionarioModalProps {
  aberto: boolean;
  onFechar: () => void;
  usuario?: Usuario;
  onSaved?: () => void;
  permitirAdmin?: boolean;
}

export default function FuncionarioModal({ aberto, onFechar, usuario, onSaved, permitirAdmin = false }: FuncionarioModalProps) {
  const PERFIS = permitirAdmin ? [...PERFIS_BASE, PERFIL_ADMIN] : PERFIS_BASE;

  const empresa = store.getEmpresa();
  const filiais = store.getFiliais();
  const primeiraFilialId = filiais[0]?.id || "";


  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cargo, setCargo] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("vendedor");
  const [filialId, setFilialId] = useState(primeiraFilialId);
  const [metodoLogin, setMetodoLogin] = useState<TipoLogin>("email");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    if (!aberto) return;
    setNome(usuario?.nome || "");
    setEmail(usuario?.email || "");
    setTelefone(usuario?.telefone || "");
    setCargo(usuario?.cargo || "");
    setPerfil(usuario?.perfil ? (permitirAdmin || usuario.perfil !== "admin" ? usuario.perfil : "vendedor") : "vendedor");
    setFilialId(usuario?.filialId || primeiraFilialId);
    setMetodoLogin(usuario?.metodoLogin || "email");
    setSenha("");
    setErros([]);
  }, [aberto, usuario, primeiraFilialId, permitirAdmin]);


  const handleFechar = () => {
    setErros([]);
    onFechar();
  };

  const salvar = async () => {
    const lista: string[] = [];
    if (!nome.trim()) lista.push("Nome é obrigatório");
    if (!email.trim()) lista.push("Email é obrigatório");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) lista.push("Email inválido");
    if (metodoLogin === "email" && !usuario && !senha.trim()) lista.push("Senha é obrigatória");
    if (metodoLogin === "email" && senha && senha.length < 6) lista.push("Senha deve ter ao menos 6 caracteres");

    const existente = store.getUsuarioByEmail(email.trim());
    if (existente && existente.id !== usuario?.id) {
      lista.push("Já existe um usuário com este email");
    }

    if (lista.length > 0) {
      setErros(lista);
      return;
    }

    setSalvando(true);
    await new Promise((r) => setTimeout(r, 400));

    const iniciais = nome
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    if (usuario) {
      store.updateUsuario({
        ...usuario,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone || undefined,
        cargo: cargo || undefined,
        perfil,
        filialId,
        metodoLogin,
        senha: metodoLogin === "email" ? senha || usuario.senha : undefined,
        permissoes: gerarPermissoes(perfil),
        iniciais,
      });
    } else {
      const u: Usuario = {
        id: `u-${Date.now()}`,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        iniciais,
        perfil,
        ativo: true,
        empresaId: empresa?.id || "e-demo",
        filialId,
        equipeId: perfil === "vendedor" ? "eq-1" : undefined,
        permissoes: gerarPermissoes(perfil),
        criadoEm: new Date().toISOString(),
        metodoLogin,
        senha: metodoLogin === "email" ? senha : undefined,
        telefone: telefone || undefined,
        cargo: cargo || undefined,
      };
      store.addUsuario(u);
    }

    setSalvando(false);
    onSaved?.();
    handleFechar();
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={handleFechar}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {usuario ? "Editar Colaborador" : "Novo Colaborador"}
          </h2>
          <button onClick={handleFechar} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          {erros.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              {erros.map((e, i) => (
                <p key={i} className="text-xs font-medium text-red-600 dark:text-red-400">
                  • {e}
                </p>
              ))}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Nome completo *
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="exemplo@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Telefone</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="(85) 9xxxx-xxxx"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Cargo</label>
              <input
                type="text"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Ex: Atendente"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Perfil de acesso *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PERFIS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPerfil(p.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-semibold transition",
                    perfil === p.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:text-slate-500"
                  )}
                >
                  <span className="text-2xl">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {filiais.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Filial</label>
              <select
                value={filialId}
                onChange={(e) => setFilialId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {filiais.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    Filial {f.codigo} - {f.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Método de login
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMetodoLogin("email")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition",
                  metodoLogin === "email"
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:text-slate-500"
                )}
              >
                🔐 Senha
              </button>
              <button
                type="button"
                onClick={() => setMetodoLogin("google")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 text-sm font-semibold transition",
                  metodoLogin === "google"
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:text-slate-500"
                )}
              >
                <span className="font-bold">G</span> Google
              </button>
            </div>
          </div>

          {metodoLogin === "email" && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Senha {usuario ? "(deixe em branco para manter)" : "*"}
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder={usuario ? "••••••••" : "Mínimo 6 caracteres"}
              />
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                O colaborador usará email + senha para acessar a plataforma.
              </p>
            </div>
          )}

          {metodoLogin === "google" && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                O colaborador fará login com a conta Google vinculada a este email.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
          <button
            onClick={handleFechar}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {usuario ? "Salvar Alterações" : "Cadastrar Colaborador"}
          </button>
        </div>
      </div>
    </div>
  );
}
