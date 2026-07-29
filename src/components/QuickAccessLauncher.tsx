import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuickLinks } from "@/hooks/useQuickLinks";
import { MessageCircle, Send, Instagram, Facebook, Twitter, Youtube, Link as LinkIcon, X, Sparkles } from "lucide-react";

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  "message-circle": MessageCircle,
  whatsapp: MessageCircle,
  telegram: Send,
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
  link: LinkIcon,
};

export default function QuickAccessLauncher() {
  const { links, loading } = useQuickLinks(false);
  const [aberto, setAberto] = useState(false);

  if (loading || links.length === 0) return null;

  const abrir = (url: string) => { window.open(url, "_blank", "noopener,noreferrer"); setAberto(false); };

  // Se só tem 1 botão, mostra ele direto
  if (links.length === 1) {
    const l = links[0];
    const Icon = ICONES[l.icone] ?? LinkIcon;
    return (
      <button
        onClick={() => abrir(l.url)}
        className="group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        style={{ backgroundColor: l.cor }}
      >
        <Icon className="h-4 w-4" />
        {l.label}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <Sparkles className="h-4 w-4" />
        Acessos rápidos · {links.length}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setAberto(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Escolha um destino</h3>
                <button onClick={() => setAberto(false)} className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {links.map((l) => {
                  const Icon = ICONES[l.icone] ?? LinkIcon;
                  return (
                    <button
                      key={l.id}
                      onClick={() => abrir(l.url)}
                      className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow" style={{ backgroundColor: l.cor }}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold text-white">{l.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
