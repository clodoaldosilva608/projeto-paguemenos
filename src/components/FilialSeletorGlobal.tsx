import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, ChevronDown, Building2, Check } from "lucide-react";
import { useFilial } from "@/contexts/FilialContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function FilialSeletorGlobal() {
  const { filialSelecionada, setFilialSelecionada, podeVerTodas } = useFilial();
  const [filiais, setFiliais] = useState<{ id: string; nome: string; cidade?: string }[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await (supabase as any)
          .from("filiais")
          .select("id, nome, cidade")
          .eq("ativo", true)
          .order("nome");
        if (data) setFiliais(data);
      } catch {}
    })();
  }, []);

  function selecionar(id: string) {
    setFilialSelecionada(id);
    setAberto(false);
    if (id === "todas") {
      toast.success("Visualizando todas as filiais");
    } else {
      const f = filiais.find((f) => f.id === id);
      toast.success(`Filtrando por: ${f?.nome || id}`);
    }
    // Recarregar a página para aplicar o filtro em todas as queries
    setTimeout(() => window.location.reload(), 300);
  }

  const filialAtual = filiais.find((f) => f.id === filialSelecionada);
  const nomeAtual =
    filialSelecionada === "todas"
      ? "Todas as Filiais"
      : filialAtual?.nome || "Todas as Filiais";

  if (!podeVerTodas) return null;

  return (
    <div className="relative z-30">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-2 rounded-xl border-2 border-blue-500/30 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
      >
        <Store className="h-4 w-4" />
        <span className="hidden max-w-[180px] truncate sm:inline">{nomeAtual}</span>
        <ChevronDown className={`h-4 w-4 transition ${aberto ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {aberto && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute right-0 top-full z-40 mt-1 min-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-800"
            >
              {/* Todas as Filiais */}
              <button
                onClick={() => selecionar("todas")}
                className={`flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                  filialSelecionada === "todas"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Todas as Filiais</span>
                {filialSelecionada === "todas" && <Check className="ml-auto h-4 w-4 text-blue-600" />}
              </button>

              <div className="border-t border-slate-100 dark:border-white/5" />

              {/* Lista de filiais */}
              <div className="max-h-[400px] overflow-y-auto">
                {filiais.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => selecionar(f.id)}
                    className={`flex w-full items-center gap-2 px-4 py-3 text-sm transition hover:bg-slate-50 dark:hover:bg-white/5 ${
                      filialSelecionada === f.id
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Store className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium">{f.nome}</p>
                      {f.cidade && (
                        <p className="text-[10px] text-slate-400">{f.cidade}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">#{f.id}</span>
                    {filialSelecionada === f.id && <Check className="h-4 w-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
