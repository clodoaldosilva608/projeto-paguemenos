import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, Phone, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { atualizarPerfilProprio } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
  head: () => ({
    meta: [
      { title: "Primeiro acesso — Orion" },
      { name: "description", content: "Conclua seu cadastro no Orion: defina senha, telefone e revise seus dados." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function maskTelBR(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function forcaSenha(s: string): { score: number; label: string; cor: string } {
  let score = 0;
  if (s.length >= 8) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[a-z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  const map = [
    { label: "Muito fraca", cor: "bg-red-500" },
    { label: "Fraca", cor: "bg-orange-500" },
    { label: "Razoável", cor: "bg-yellow-500" },
    { label: "Boa", cor: "bg-lime-500" },
    { label: "Forte", cor: "bg-emerald-500" },
    { label: "Excelente", cor: "bg-emerald-600" },
  ];
  return { score, ...map[score] };
}

function validarSenha(s: string): string | null {
  if (!s) return null;
  if (s.length < 8) return "Mínimo de 8 caracteres.";
  if (!/[A-Z]/.test(s)) return "Deve conter ao menos 1 letra maiúscula.";
  if (!/\d/.test(s)) return "Deve conter ao menos 1 número.";
  if (!/[^A-Za-z0-9]/.test(s)) return "Deve conter ao menos 1 caractere especial.";
  return null;
}

function validarTelefone(s: string): string | null {
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 11) return "Telefone brasileiro deve ter 10 ou 11 dígitos.";
  if (d.length === 11 && d[2] !== "9") return "Celular BR deve começar com 9 após o DDD.";
  return null;
}

function WelcomePage() {
  const navigate = useNavigate();
  const { autenticado, carregando, usuario, refresh } = useAuth();
  const call = useServerFn(atualizarPerfilProprio);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!carregando && !autenticado) navigate({ to: "/auth", search: { mode: "signin" } });
    if (usuario) { setNome(usuario.nome || ""); setTelefone(usuario.telefone ? maskTelBR(usuario.telefone) : ""); }
  }, [autenticado, carregando, usuario, navigate]);

  const forca = useMemo(() => forcaSenha(senha), [senha]);
  const erroSenha = validarSenha(senha);
  const erroTel = validarTelefone(telefone);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Informe seu nome."); return; }
    if (erroTel) { toast.error(erroTel); return; }
    if (erroSenha) { toast.error(erroSenha); return; }
    setBusy(true);
    try {
      await call({
        data: {
          nome: nome.trim(),
          telefone: telefone ? telefone.replace(/\D/g, "") : null,
          nova_senha: senha || null,
          onboarding_completo: true,
        },
      });
      await refresh();
      toast.success("Perfil ativado com sucesso!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally { setBusy(false); }
  };

  const skip = async () => {
    // marcar onboarding_completo=true mesmo sem preencher senha
    if (!nome.trim()) { toast.error("Informe ao menos seu nome antes de pular."); return; }
    setBusy(true);
    try {
      await call({ data: { nome: nome.trim(), onboarding_completo: true } });
      await refresh();
      navigate({ to: "/" });
    } finally { setBusy(false); }
  };

  if (carregando || !usuario) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-900 p-4">
      <div className="pointer-events-none absolute inset-0 opacity-20"><div className="h-full w-full" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.3) 1px, transparent 0)", backgroundSize: "40px 40px" }} /></div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 font-display text-3xl text-white">Bem-vindo(a), {usuario.nome.split(" ")[0]}!</h1>
          <p className="mt-1 text-sm text-slate-400">Ative sua conta preenchendo seus dados. A senha e o celular são opcionais mas recomendados.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><User className="h-3 w-3" /> Nome *</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Phone className="h-3 w-3" /> Celular (opcional)</label>
            <input
              type="tel" inputMode="numeric" value={telefone}
              onChange={(e) => setTelefone(maskTelBR(e.target.value))}
              placeholder="(11) 99999-0000"
              className={`w-full rounded-lg border bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 ${erroTel ? "border-red-500/60 focus:ring-red-500/20" : "border-white/10 focus:border-blue-500 focus:ring-blue-500/20"}`}
            />
            {erroTel && <p className="mt-1 text-[11px] text-red-400">{erroTel}</p>}
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Lock className="h-3 w-3" /> Nova senha (opcional)</label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha} onChange={(e) => setSenha(e.target.value)}
                placeholder="Deixe em branco para manter"
                className={`w-full rounded-lg border bg-white/5 px-4 py-3 pr-10 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 ${erroSenha ? "border-red-500/60 focus:ring-red-500/20" : "border-white/10 focus:border-blue-500 focus:ring-blue-500/20"}`}
              />
              <button type="button" onClick={() => setMostrarSenha((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {senha && (
              <>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i < forca.score ? forca.cor : "bg-white/10"}`} />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Força: <span className="font-semibold text-slate-300">{forca.label}</span></p>
                {erroSenha && <p className="mt-1 text-[11px] text-red-400">{erroSenha}</p>}
              </>
            )}
            <p className="mt-1 text-[11px] text-slate-500">Requisitos: 8+ caracteres, 1 maiúscula, 1 número e 1 caractere especial.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" disabled={busy || !!erroSenha || !!erroTel} className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
              {busy ? "Ativando..." : "Ativar conta"}
            </button>
            <button type="button" onClick={skip} disabled={busy} className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">Pular por enquanto</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
