import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: "Redefinir Senha — Orion Dashboard" },
      { name: "description", content: "Defina uma nova senha para retomar o acesso ao seu painel Orion de metas e desempenho." },
      { property: "og:title", content: "Redefinir Senha — Orion Dashboard" },
      { property: "og:description", content: "Escolha uma nova senha e recupere o acesso à sua conta Orion." },
      { property: "og:url", content: "https://projeto-orionn.lovable.app/reset-password" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://projeto-orionn.lovable.app/reset-password" }],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) setMsg(error.message);
    else { setMsg("Senha atualizada. Redirecionando..."); setTimeout(() => navigate({ to: "/" }), 1200); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="font-display text-2xl text-white">Nova senha</h1>
        <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500" />
        {msg && <p className="text-sm text-slate-300">{msg}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {busy ? "Atualizando..." : "Atualizar senha"}
        </button>
      </form>
    </div>
  );
}
