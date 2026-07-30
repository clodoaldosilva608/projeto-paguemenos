import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, ChevronDown, Building2 } from "lucide-react";
import { useFilial } from "@/contexts/FilialContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function FilialSeletorGlobal() {
  const { filialSelecionada, setFilialSelecionada, podeVerTodas } = useFilial();
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await (supabase as any)
          .from("filiais")
          .select("id, nome")
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
      toast.success(`Filtrando por: ${filiais.find((f) => f.id === id)?.nome || id}`);
    }
  }

  const nomeAtual =
    filialSelecionada === "todas"
      ? "Todas as Filiais"
      : filiais.find((f) => f.id === filialSelecionada)?.nome || "Todas as Filiais";

  if (!podeVerTodas) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-white/5"
      >
        <Store className="h-3.5 w-3.5" />
        <span className="hidden max-w-[140px] truncate sm:inline">{nomeAtual}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {aberto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute right-0 top-full z-20 mt-1 min-w-[220px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-800"
            >
              <button
                onClick={() => selecionar("todas")}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/5 ${
                  filialSelecionada === "todas"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Todas as Filiais
              </button>
              {filiais.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selecionar(f.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/5 ${
                    filialSelecionada === f.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Store className="h-3.5 w-3.5" />
                  <span className="truncate">{f.nome}</span>
                  <span className="ml-auto text-[10px] text-slate-400">#{f.id}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
