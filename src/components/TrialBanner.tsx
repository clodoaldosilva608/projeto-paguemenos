import { useEffect, useState } from "react";
import { Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function TrialBanner() {
  const { usuario } = useAuth();
  const [info, setInfo] = useState<{ plano: string; expira: string | null } | null>(null);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("plano, trial_expires_at").eq("id", usuario.id).maybeSingle();
      if (data) setInfo({ plano: (data as any).plano ?? "ativo", expira: (data as any).trial_expires_at ?? null });
    })();
  }, [usuario?.id]);

  if (!info || info.plano === "ativo") return null;

  const dias = info.expira ? Math.max(0, Math.ceil((new Date(info.expira).getTime() - Date.now()) / 86400000)) : 0;
  const expirado = info.plano === "trial" && dias <= 0;

  if (expirado || info.plano === "limitado") {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
        <Sparkles className="h-5 w-5 shrink-0" />
        <p className="flex-1 font-medium">Seu período de teste terminou. Você está no modo limitado — adquira um plano para desbloquear todos os recursos.</p>
        <a href="mailto:contato@orion.app?subject=Contratar%20plano" className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600">Falar com vendas</a>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-400/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4 text-sm text-blue-800 dark:text-blue-200">
      <Clock className="h-5 w-5 shrink-0" />
      <p className="flex-1 font-medium">Você está no teste grátis. Restam <strong>{dias} {dias === 1 ? "dia" : "dias"}</strong> — aproveite todos os recursos!</p>
      <a href="mailto:contato@orion.app?subject=Contratar%20plano" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500">Contratar</a>
    </div>
  );
}
