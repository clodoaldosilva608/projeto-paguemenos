import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck, Lock, User, ArrowLeft, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
  head: () => ({
    meta: [
      { title: "Admin Login — Orion" },
      { name: "description", content: "Acesso restrito ao painel administrativo." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminLogin() {
  const navigate = useNavigate();
  const { usuario, login, carregando } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Modelo: gerente tem acesso TOTAL ao painel admin (igual admin)
    // Se já logado e for admin ou gerente, redirecionar para /admin
    if (usuario && (usuario.perfil === "admin" || usuario.perfil === "gerente")) {
      navigate({ to: "/admin" });
    }
  }, [usuario, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      toast.error("Preencha email e senha.");
      return;
    }
    setBusy(true);
    try {
      const ok = await login(email.trim().toLowerCase(), senha);
      if (!ok) {
        toast.error("Credenciais inválidas ou conta não aprovada.");
        return;
      }
      // Aguardar hidratação do AuthContext para verificar perfil
      setTimeout(() => {
        // O AuthContext vai atualizar usuario; se for admin, o useEffect redireciona
        // Se não for admin, mostrar erro
        toast.success("Login realizado! Verificando permissões...");
      }, 500);
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login.");
    } finally {
      setBusy(false);
    }
  };

  // Se logou mas não é admin nem gerente, mostrar bloqueio
  if (usuario && usuario.perfil !== "admin" && usuario.perfil !== "gerente") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center backdrop-blur-xl"
        >
          <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-red-400" />
          <h2 className="text-lg font-bold text-white">Acesso Negado</h2>
          <p className="mt-2 text-sm text-slate-300">
            Olá, <strong>{usuario.nome.split(" ")[0]}</strong>! Seu perfil{" "}
            <span className="font-bold uppercase text-red-400">{usuario.perfil}</span> não tem
            permissão para acessar o painel administrativo.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Apenas contas com perfil <strong>Admin Master</strong> ou <strong>Gerente</strong> podem acessar este painel.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o app
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* Background — gradiente escuro tech */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #0a0f1c 0%, #0d1521 25%, #111d33 50%, #0d1521 75%, #0a0f1c 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(66,165,245,0.3) 1px, transparent 0)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
        }}
      />
      <div className="pointer-events-none absolute left-1/4 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo + título */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Painel Admin</h1>
            <p className="mt-1 text-sm text-slate-400">
              Orion Enterprise · Acesso restrito a administradores
            </p>
          </div>

          {/* Aviso de segurança */}
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Todas as ações são auditadas. Use credenciais de administrador master.
                Acesso não autorizado é violação de segurança.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <User className="h-3 w-3" /> E-mail Admin
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Lock className="h-3 w-3" /> Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || carregando}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {busy || carregando ? "Autenticando..." : "Acessar Painel Admin"}
            </button>
          </form>

          {/* Voltar */}
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-4 flex w-full items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para a landing page
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-500">
          Orion Enterprise Admin · Acesso protegido · Todas as ações são logadas
        </p>
      </motion.div>
    </div>
  );
}
