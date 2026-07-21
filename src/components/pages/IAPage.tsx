import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, Bot, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { useIAChat } from "@/hooks/useIAChat";

const insightsGerados = [
  { id: 1, tipo: "alerta", titulo: "Genéricos abaixo do esperado", msg: "A categoria Genéricos + Similares está com 35,93% de atingimento, o que indica risco de não atingir a meta ao final do mês. Recomenda-se foco nos colaboradores MIEKO (26,40%) e ALÍCIA (33,71%) com ações específicas de abordagem e treinamento." },
  { id: 2, tipo: "tendencia", titulo: "Projeção de faturamento positiva", msg: "Com base no ritmo atual de R$ 25.032/dia, a filial 7537 projeta R$ 775.999,75 até 31/07, ultrapassando a meta mensal de R$ 766.254,66 em 1,3%." },
  { id: 3, tipo: "oportunidade", titulo: "CLODOALDO como destaque oculto", msg: "Apesar de ter a menor meta absoluta (R$ 24.855,66), CLODOALDO tem o 2° melhor atingimento (44,80%) e maior consistência diária." },
  { id: 4, tipo: "comparacao", titulo: "Ticket Médio: ELIELTON vs média", msg: "ELIELTON lidera com TKM de R$ 110,48, 24,8% acima da média da filial (R$ 88,44)." },
];

const tipoIcone: Record<string, { icone: string; cor: string }> = {
  alerta: { icone: "⚠️", cor: "border-l-amber-500" },
  tendencia: { icone: "📈", cor: "border-l-emerald-500" },
  oportunidade: { icone: "💡", cor: "border-l-blue-500" },
  comparacao: { icone: "🔄", cor: "border-l-purple-500" },
};

export default function IAPage() {
  const { msgs, carregando, enviar, limpar, sugestoes, usuario } = useIAChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, carregando]);

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
          {insightsGerados.map((ins, i) => {
            const { icone, cor } = tipoIcone[ins.tipo] || tipoIcone.alerta;
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
              Contexto: {usuario?.nome ?? "visitante"} · dados reais do seu store de vendas.
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
            placeholder="Pergunte sobre metas, performance, indicadores..."
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
