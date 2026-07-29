import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Loader2, Sparkles, Camera, Mic, MicOff, Image as ImageIcon } from "lucide-react";
import { useIAChat } from "@/hooks/useIAChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function IAAssistantFAB() {
  const { msgs, carregando, enviar, enviarComImagem, sugestoes, usuario } = useIAChat();
  const [aberto, setAberto] = useState(false);
  const [input, setInput] = useState("");
  const [gravando, setGravando] = useState(false);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
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
    pararGravacao();
    try { window.localStorage.setItem(`orion-ia-fechado-${usuario?.id || "anon"}`, "true"); } catch {}
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, carregando]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t && !previewImagem) return;
    setInput("");
    if (previewImagem) {
      await handleImagemSubmit(t, previewImagem);
      setPreviewImagem(null);
    } else {
      await enviar(t);
    }
  };

  // === UPLOAD DE IMAGEM ===
  function handleImagemChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas (PNG, JPG, etc.)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImagem(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleImagemSubmit(texto: string, imagemBase64: string) {
    // Usar a função do hook que envia para Gemini Vision
    await enviarComImagem(texto || "Analise esta imagem e extraia os valores de venda", imagemBase64);
    setPreviewImagem(null);
  }

  // === GRAVAÇÃO DE ÁUDIO (Web Speech API) ===
  const iniciarGravacao = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta gravação de áudio. Use Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setGravando(true);
    };

    recognition.onresult = (event: any) => {
      let textoFinal = "";
      for (let i = 0; i < event.results.length; i++) {
        textoFinal += event.results[i][0].transcript;
      }
      setInput(textoFinal);
    };

    recognition.onerror = (event: any) => {
      console.error("Erro na gravação:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Permissão de microfone negada. Autorize o acesso ao microfone.");
      } else if (event.error === "no-speech") {
        toast.error("Nenhuma fala detectada. Tente novamente.");
      } else {
        toast.error("Erro na gravação: " + event.error);
      }
      setGravando(false);
    };

    recognition.onend = () => {
      setGravando(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const pararGravacao = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setGravando(false);
  }, []);

  function toggleGravacao() {
    if (gravando) {
      pararGravacao();
    } else {
      iniciarGravacao();
    }
  }

  return (
    <>
      {/* FAB pulsante */}
      <button
        onClick={abrirIA}
        aria-label="Assistente IA"
        title="Assistente IA"
        className="group fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/40 transition hover:scale-110 sm:bottom-28 sm:right-8"
      >
        <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-blue-500/40" />
        <span className="pointer-events-none absolute -inset-1 animate-pulse rounded-full bg-indigo-500/20 blur" />
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
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">IA · Foto · Voz · Vendas</p>
                </div>
                <button onClick={fecharIA} aria-label="Fechar assistente IA" title="Fechar" className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
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
                      💰 <strong>Lançar vendas</strong> — digite "vendi R$ 150 com 5 clientes"
                      <br/>
                      📸 <strong>Enviar foto</strong> — tire foto do cupom ou nota fiscal
                      <br/>
                      🎤 <strong>Falar</strong> — clique no microfone e fale sua venda
                      <br/>
                      💡 <strong>Dicas de vendas</strong> — estratégias para aumentar faturamento
                    </div>

                    {/* Aviso de lançamento por comando */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                      💡 <strong>Dica:</strong> Você pode lançar vendas de 3 formas:
                      <br/>📝 Texto: "vendi R$ 150 com 5 clientes"
                      <br/>🎤 Voz: clique no 🎤 e fale
                      <br/>📸 Foto: envie foto do cupom
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

                {/* Mensagens */}
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white" : "border border-white/10 bg-white/5 text-slate-100"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {/* Indicador de carregamento */}
                {carregando && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Orion está pensando...
                  </div>
                )}

                {/* Indicador de gravação */}
                {gravando && (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    Ouvindo... fale agora
                  </div>
                )}
              </div>

              {/* Preview de imagem */}
              {previewImagem && (
                <div className="border-t border-white/10 p-2">
                  <div className="relative inline-block">
                    <img src={previewImagem} alt="Preview" className="max-h-24 rounded-lg" />
                    <button
                      onClick={() => setPreviewImagem(null)}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input + botões */}
              <form onSubmit={submit} className="flex items-center gap-1.5 border-t border-white/10 bg-slate-950/50 p-3">
                {/* Botão de imagem */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImagemChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={carregando}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 dark:text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-50"
                  aria-label="Enviar imagem"
                  title="Enviar foto"
                >
                  <Camera className="h-4 w-4" />
                </button>

                {/* Botão de microfone */}
                <button
                  type="button"
                  onClick={toggleGravacao}
                  disabled={carregando}
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border disabled:opacity-50 ${
                    gravando
                      ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse"
                      : "border-white/10 text-slate-400 dark:text-slate-500 hover:bg-white/5 hover:text-white"
                  }`}
                  aria-label={gravando ? "Parar gravação" : "Iniciar gravação"}
                  title={gravando ? "Parar gravação" : "Falar"}
                >
                  {gravando ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>

                {/* Campo de texto */}
                <input
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={gravando ? "Ouvindo..." : "Pergunte, fale ou lance uma venda..."}
                  disabled={carregando}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                {/* Botão enviar */}
                <button
                  type="submit"
                  disabled={carregando || (!input.trim() && !previewImagem)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                  aria-label="Enviar"
                >
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
