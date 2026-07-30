import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFilial } from "@/contexts/FilialContext";
import { brlMoeda } from "../../utils/format";
import { Loader2, Store, MapPin } from "lucide-react";

interface Filial {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  ativo: boolean;
}

export default function FiliaisPage() {
  const { filialFiltro } = useFilial();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, [filialFiltro]);

  async function carregar() {
    setLoading(true);
    try {
      let query = (supabase as any).from("filiais").select("*").order("nome");
      // Se uma filial específica está selecionada, mostrar apenas ela
      if (filialFiltro) {
        query = query.eq("id", filialFiltro);
      }
      const { data } = await query;
      setFiliais(data || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filiais.length} filial(is) {filialFiltro ? "(filtrada)" : "cadastradas"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filiais.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-num text-sm font-bold text-white shadow">
                  {f.id}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{f.nome}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3 w-3" /> {f.cidade} - {f.estado}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                f.ativo
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {f.ativo ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Store className="h-3.5 w-3.5" />
              <span>Filial #{f.id}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {filiais.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <Store className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhuma filial encontrada</p>
        </div>
      )}
    </motion.div>
  );
}
