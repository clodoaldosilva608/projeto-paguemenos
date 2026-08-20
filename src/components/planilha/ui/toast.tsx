"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Toast global usado por qualquer client component. Sem dependência externa.
type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  desc?: string;
}

interface ToastAPI {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, desc?: string) => void;
  error: (title: string, desc?: string) => void;
  info: (title: string, desc?: string) => void;
}

const Ctx = createContext<ToastAPI | null>(null);

export function useToast(): ToastAPI {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback seguro quando usado fora do provider (SSR ou testes)
    const noop = () => {};
    return { push: noop, success: noop, error: noop, info: noop };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...t, id }]);
    window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3600);
  }, []);

  const api: ToastAPI = {
    push,
    success: (title, desc) => push({ kind: "success", title, desc }),
    error: (title, desc) => push({ kind: "error", title, desc }),
    info: (title, desc) => push({ kind: "info", title, desc }),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="region" aria-label="Notificações">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto w-72 overflow-hidden rounded-lg border-l-4 bg-white p-3 shadow-lg animate-toast-in ${
              t.kind === "success"
                ? "border-emerald-500"
                : t.kind === "error"
                  ? "border-rose-500"
                  : "border-sky-500"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`text-lg ${t.kind === "success" ? "text-emerald-500" : t.kind === "error" ? "text-rose-500" : "text-sky-500"}`}>
                {t.kind === "success" ? "✓" : t.kind === "error" ? "⚠" : "ⓘ"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold text-slate-800">{t.title}</div>
                {t.desc && <div className="text-[11px] leading-snug text-slate-500">{t.desc}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

// Hook auxiliar: dispara um toast quando o valor mudar de undefined -> string
export function useAnnounce(message: string | null) {
  const { info } = useToast();
  useEffect(() => {
    if (message) info(message);
  }, [message, info]);
}
