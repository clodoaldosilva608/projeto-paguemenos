// =============================================================
// IAPage — Assistente IA (sem dados fake, lê do Supabase)
// =============================================================

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, Bot, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { useIAChat } from "@/hooks/useIAChat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Insight {
  id: string;
  titulo: string;
  msg: string;
  tipo: string;
}

export default function IAPage() {
  const { msgs, carregando, enviar, limpar, sugestoes, usuario } = useIAChat();
  const { usuario: user } = useAuth();
  const [input, setInput] = useState("");
  const [insights, setInsights] = useState<Insight[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, carregando]);

  // Gerar insights baseados nas metas REAIS do usuário
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("metas_individuais")
          .select("*")
          .eq("usuario_id", user.id);
        const metas = data || [];
        const gerados: Insight[] = [];

        for (const m of metas) {
          if (m.periodo === "mensal" && m.valor_meta > 0) {
            const pct = (m.valor_realizado / m.valor_meta) * 100;
            if (pct >= 100) {
              gerados.push({
                id: `ins-${m.id}`,
                tipo: "tendencia",
                titulo: `${m.categoria.replace(/_/g, " ")}: Meta atingida! 🎉`,
                msg: `Você atingiu ${pct.toFixed(1)}% da meta mensal de ${m.categoria.replace(/_/g, " ")}. Parabéns!`,
              });
            } else if (pct >= 50) {
              gerados.push({
                id: `ins-${m.id}`,
                tipo: "oportunidade",
                titulo: `${m.categoria.replace(/_/g, " ")}: ${pct.toFixed(1)}% da meta`,
                msg: `Você está a ${pct.toFixed(1)}% da meta mensal. Continue assim!`,
              });
            } else {
              gerados.push({
                id: `ins-${m.id}`,
                tipo: "alerta",
                titulo: `${m.categoria.replace(/_/g, " ")}: Abaixo do esperado`,
                msg: `Você está a apenas ${pct.toFixed(1)}% da meta mensal. Foco necessário!`,
              });
            }
          }
        }

        if (gerados.length === 0) {
          gerados.push({
            id: "ins-empty",
            tipo: "info",
            titulo: "Sem dados suficientes",
            msg: "Quando o gestor definir suas metas, os insights aparecerão aqui automaticamente.",
          });
        }

        setInsights(gerados);
      } catch {
        setInsights([{
          id: "ins-err",
          tipo: "info",
          titulo: "Carregando insights...",
          msg: "Os insights aparecerão aqui em breve.",
        }]);
      }
    })();
  }, [user]);

  const tipoIcone: Record<string, { icone: string; cor: string }> = {
    alerta: { icone: "⚠️", cor: "border-l-amber-500" },
    tendencia: { icone: "📈", cor: "border-l-emerald-500" },
    oportunidade: { icone: "💡", cor: "border-l-blue-500" },
    comparacao: { icone: "🔄", cor: "border-l-purple-500" },
    info: { icone: "ℹ️", cor: "border-l-slate-400" },
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    void enviar(t);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
          <span>🧠</span> Insights Automáticos
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((ins, i) => {
            const { icone, cor } = tipoIcone[ins.tipo] || tipoIcone.info;
            return (
              <motion.div key={ins.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={cn("rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900", cor)}>
                <div className="flex items-start gap-2">
                  <span className="text-xl">{icone}</span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{ins.titulo}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{ins.msg}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
              <Sparkles className="h-4 w-4 text-blue-500" /> Pergunte à IA Orion
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contexto: {usuario?.nome ?? "visitante"} · dados reais das suas metas.
            </p>
          </div>
          {msgs.length > 0 && (
            <button onClick={limpar} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <Trash2 className="h-3 w-3" /> Limpar
            </button>
          )}
        </div>

        <div ref={scrollRef} className="max-h-[400px] min-h-[240px] overflow-y-auto p-4">
          {msgs.length === 0 && (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <Bot className="h-7 w-7" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Experimente uma das sugestões abaixo ou faça sua pergunta.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {sugestoes.map((s) => (
                  <button key={s} onClick={() => enviar(s)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map((m, i) => (
            <div key={i} className={cn("mb-3 flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm",
                m.role === "user"
                  ? "rounded-br-none bg-blue-600 text-white"
                  : "rounded-bl-none border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
              )}>
                {m.content}
              </div>
            </div>
          ))}

          {carregando && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-xs text-slate-500">Analisando dados...</span>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre suas metas e performance..."
            disabled={carregando}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900"
          />
          <button type="submit" disabled={carregando || !input.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-500 disabled:opacity-50">
            <Send className="h-3.5 w-3.5" /> Enviar
          </button>
        </form>
      </div>
    </motion.div>
  );
}
