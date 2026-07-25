import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useServerFn } from "@tanstack/react-start";
import { buscarEmailPorMatricula } from "@/lib/login-matricula.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: (s: Record<string, unknown>) => ({ mode: (s.mode as "signin" | "signup" | undefined) || "signin" }),
  head: () => ({
    meta: [
      { title: "Entrar — Orion Dashboard" },
      { name: "description", content: "Acesse sua conta Orion para acompanhar metas, vendas e performance da equipe em tempo real." },
      { property: "og:title", content: "Entrar — Orion Dashboard" },
      { property: "og:description", content: "Faça login no Orion para acompanhar metas, vendas e desempenho da sua equipe." },
      { property: "og:url", content: "https://projeto-orionn.lovable.app/auth" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://projeto-orionn.lovable.app/auth" }],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { login, loginGoogle, cadastrar, autenticado, carregando, erro } = useAuth();
  const fnBuscarMatricula = useServerFn(buscarEmailPorMatricula);
  const [modo, setModo] = useState<"signin" | "signup" | "recover">(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (autenticado) navigate({ to: "/" }); }, [autenticado, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); setBusy(true);
    try {
      if (modo === "signin") {
        // Detectar login por matrícula (sem @) vs email
        const ehEmail = email.trim().includes("@");
        if (!ehEmail) {
          // Login por primeiro nome + matrícula
          try {
            const r = await fnBuscarMatricula({ data: { primeiro_nome: email.trim(), matricula: senha.trim() } });
            // Agora faz login com email + matrícula (como senha)
            const ok = await login(r.email, r.senha);
            if (ok) navigate({ to: "/" });
          } catch (err: any) {
            setMsg(err.message || "Erro ao validar credenciais por matrícula.");
          }
        } else {
          // Login normal por email
          const ok = await login(email, senha);
          if (ok) navigate({ to: "/" });
        }
      } else if (modo === "signup") {
        // Melhoria 9: validação de senha forte
        const erroSenha = validarSenhaForte(senha);
        if (erroSenha) { setMsg(erroSenha); return; }
        const ok = await cadastrar(email, senha, nome || email.split("@")[0]);
        if (ok === "aguardando_aprovacao" as any) setMsg("✅ Conta criada! Aguardando aprovação do gestor. Você poderá fazer login após ser aprovado."); else if (ok) setMsg("Conta criada! Faça login.");
      } else {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setMsg(error.message); else setMsg("Se este e-mail existe, enviamos um link para redefinir a senha.");
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-900 p-4">
      <div className="pointer-events-none absolute inset-0 opacity-20"><div className="h-full w-full" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.3) 1px, transparent 0)", backgroundSize: "40px 40px" }} /></div>
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-[120px]" />

      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-8 w-8"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9" strokeLinecap="round" /></svg>
          </div>
          <h1 className="mt-4 font-display text-3xl text-white">ORION — Gestão Multi-Empresa e Performance</h1>
          <p className="mt-1 text-sm text-slate-400">
            {modo === "signin" && "Faça login para acessar sua conta"}
            {modo === "signup" && "Crie sua conta com o e-mail cadastrado pelo gestor"}
            {modo === "recover" && "Recupere o acesso à sua conta"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={async () => { setBusy(true); try { await loginGoogle(); } finally { setBusy(false); } }}
            disabled={busy || carregando}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow transition hover:bg-slate-50 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" /><span className="text-xs text-slate-500">ou</span><div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {modo === "signup" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Nome</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {modo === "signin" ? "E-mail ou Primeiro Nome" : "E-mail"}
              </label>
              <input type={modo === "signin" ? "text" : "email"} required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={modo === "signin" ? "ex: clodoaldo ou voce@empresa.com" : "voce@empresa.com"}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              {modo === "signin" && (
                <p className="mt-1.5 text-[10px] text-slate-500">
                  💡 Vendedores: digite seu <strong>primeiro nome</strong> e <strong>matrícula</strong> na senha.
                </p>
              )}
            </div>
            {modo !== "recover" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Senha</label>
                <input type="password" required minLength={modo === "signup" ? 8 : 1} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder={modo === "signin" ? "sua matrícula ou senha" : "••••••••"} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                {modo === "signup" && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">A senha deve ter:</p>
                    <ul className="space-y-0.5 text-[10px] text-slate-400">
                      <li className={senha.length >= 8 ? "text-emerald-400" : ""}>✓ Mínimo 8 caracteres</li>
                      <li className={/[A-Z]/.test(senha) ? "text-emerald-400" : ""}>✓ 1 letra maiúscula</li>
                      <li className={/[0-9]/.test(senha) ? "text-emerald-400" : ""}>✓ 1 número</li>
                      <li className={/[!@#$%^&*(),.?":{}|<>]/.test(senha) ? "text-emerald-400" : ""}>✓ 1 caractere especial</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {(erro || msg) && (
              <div className={`rounded-lg border px-4 py-2.5 text-sm ${erro ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
                {erro || msg}
              </div>
            )}

            <button type="submit" disabled={busy || carregando} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
              {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> :
                modo === "signin" ? "Entrar" : modo === "signup" ? "Criar conta" : "Enviar link de recuperação"}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-400">
            {modo === "signin" && (<>
              <button onClick={() => setModo("recover")} className="hover:text-white">Esqueci minha senha</button>
              <span>Ainda não tem conta? <button onClick={() => setModo("signup")} className="font-semibold text-blue-400 hover:text-blue-300">Cadastre-se</button></span>
            </>)}
            {modo === "signup" && (<span>Já tem conta? <button onClick={() => setModo("signin")} className="font-semibold text-blue-400 hover:text-blue-300">Entrar</button></span>)}
            {modo === "recover" && (<button onClick={() => setModo("signin")} className="hover:text-white">Voltar ao login</button>)}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.3em] text-slate-600">Orion v2.0 · Gestão Multi-Empresa</p>
      </motion.div>
    </div>
  );
}

// Melhoria 9: validação de senha forte no cadastro
function validarSenhaForte(senha: string): string | null {
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos 1 letra maiúscula.";
  if (!/[0-9]/.test(senha)) return "A senha deve ter pelo menos 1 número.";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) return "A senha deve ter pelo menos 1 caractere especial (!@#$%&*).";
  return null;
}
