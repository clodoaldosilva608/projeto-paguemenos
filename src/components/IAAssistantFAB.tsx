import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import { useIAChat } from "@/hooks/useIAChat";

export default function IAAssistantFAB() {
  const { msgs, carregando, enviar, sugestoes, usuario } = useIAChat();
  // Bug 3 fix: IA não abre automaticamente. Estado persistido por usuário.
  // Só abre se o usuário clicar explicitamente no botão.
  const [aberto, setAberto] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restaurar preferência do usuário (se fechou, continua fechado)
    try {
      const preferencia = window.localStorage.getItem(`orion-ia-fechado-${usuario?.id || "anon"}`);
      if (preferencia === "true") setAberto(false);
    } catch {}
  }, [usuario?.id]);

  function abrirIA() {
    setAberto(true);
    try { window.localStorage.removeItem(`orion-ia-fechado-${usuario?.id || "anon"}`); } catch {}
  }

  function fecharIA() {
    setAberto(false);
    try { window.localStorage.setItem(`orion-ia-fechado-${usuario?.id || "anon"}`, "true"); } catch {}
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, carregando]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    await enviar(t);
  };


  return (
    <>
      {/* FAB pulsante */}
      <button
        onClick={abrirIA}
        aria-label="Assistente IA"
        className="group fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/40 transition hover:scale-110 sm:bottom-28 sm:right-8"
      >
        <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-blue-500/60" />
        <span className="pointer-events-none absolute -inset-1 animate-pulse rounded-full bg-indigo-500/30 blur" />
        <Bot className="relative h-7 w-7" />
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-sm p-3 sm:items-center"
            onClick={fecharIA}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
              className="flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl sm:h-[600px]"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg text-white">Assistente Orion</h3>
                  <p className="text-[11px] text-slate-400">IA · Assistente Inteligente</p>
                </div>
                <button onClick={fecharIA} aria-label="Fechar assistente IA" title="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              </header>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {msgs.length === 0 && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      Olá {usuario?.nome.split(" ")[0] ?? ""}! 👋 Sou o assistente IA do Orion.
                      <br/><br/>
                      Posso te ajudar com:
                      <br/>
                      📊 <strong>Análise de metas</strong> — pergunte como estão suas metas
                      <br/>
                      💰 <strong>Lançar vendas</strong> — digite "registrei 3 vendas de R$ 80"
                      <br/>
                      💡 <strong>Dicas de vendas</strong> — estratégias para aumentar faturamento
                      <br/>
                      📈 <strong>Ranking</strong> — veja como você se compara com a equipe
                    </div>

                    {/* Aviso de lançamento por comando */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                      💡 <strong>Dica:</strong> Você pode lançar vendas direto pelo chat!
                      <br/>Ex: "registrei 2 vendas de R$ 150 com 10 clientes"
                    </div>

                    {/* Sugestões por perfil */}
                    <div className="flex flex-wrap gap-2">
                      {sugestoes.map((s: string) => (
                        <button key={s} onClick={() => enviar(s)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-white transition">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white" : "border border-white/10 bg-white/5 text-slate-100"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {carregando && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Orion está pensando...
                  </div>
                )}
              </div>

              <form onSubmit={submit} className="flex gap-2 border-t border-white/10 bg-slate-950/50 p-3">
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte algo ou lance uma venda (ex: vendi R$ 150 com 5 clientes)..."
                  disabled={carregando}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button type="submit" disabled={carregando || !input.trim()} className="flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
