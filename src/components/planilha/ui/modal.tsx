"use client";

import { useEffect } from "react";

// Modal acessível com fechamento por ESC e clique no backdrop.
export function Modal({
  children,
  onClose,
  title,
  size = "md",
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const widths = { sm: "max-w-sm", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full ${widths[size]} rounded-2xl bg-white shadow-2xl animate-modal-in`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-extrabold text-[#0d2b57]">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
