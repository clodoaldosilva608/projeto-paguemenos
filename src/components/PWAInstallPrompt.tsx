import { useEffect, useState } from "react";
import { Download, Smartphone, Share2, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const KEY_DISMISSED = "orion-pwa-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export default function PWAInstallPrompt({ variant = "auto" }: { variant?: "auto" | "button" }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (standalone) { setInstalled(true); return; }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    const dismissedAt = Number(window.localStorage.getItem(KEY_DISMISSED) || 0);
    const stillHidden = dismissedAt && Date.now() - dismissedAt < DISMISS_MS;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!stillHidden && variant === "auto") setShowBanner(true);
    };
    const onInstalled = () => { setInstalled(true); setShowBanner(false); setShowIOS(false); };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS && !standalone && !stillHidden && variant === "auto") {
      setTimeout(() => setShowIOS(true), 1500);
    }
    return () => { window.removeEventListener("beforeinstallprompt", onBIP); window.removeEventListener("appinstalled", onInstalled); };
  }, [variant]);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null); setShowBanner(false);
  };

  const dismiss = () => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY_DISMISSED, String(Date.now()));
    setShowBanner(false); setShowIOS(false);
  };

  if (installed) return null;

  if (variant === "button") {
    if (!deferred) return null;
    return (
      <button onClick={install} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20 dark:text-blue-300">
        <Download className="h-4 w-4" /> Instalar App
      </button>
    );
  }

  return (
    <AnimatePresence>
      {(showBanner && deferred) && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-lg sm:bottom-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Instale o Orion</p>
              <p className="mt-0.5 text-xs text-slate-300">Acesso rápido, notificações e uso offline direto do seu dispositivo.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={install} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">Instalar agora</button>
                <button onClick={dismiss} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">Depois</button>
              </div>
            </div>
            <button onClick={dismiss} className="text-slate-400 dark:text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}

      {showIOS && (
        <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 text-slate-100 shadow-2xl backdrop-blur-lg sm:bottom-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600"><Smartphone className="h-5 w-5" /></div>
            <div className="flex-1 text-sm">
              <p className="font-semibold">Instalar no iPhone</p>
              <p className="mt-1 text-xs text-slate-300">Toque em <Share2 className="inline h-3.5 w-3.5" /> Compartilhar no Safari e depois em <Plus className="inline h-3.5 w-3.5" /> <span className="font-semibold">Adicionar à Tela de Início</span>.</p>
            </div>
            <button onClick={dismiss} className="text-slate-400 dark:text-slate-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
