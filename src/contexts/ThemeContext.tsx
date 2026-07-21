import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Tema = "claro" | "escuro";

interface TemaContexto {
  tema: Tema;
  alternar: () => void;
}

const TemaCtx = createContext<TemaContexto | undefined>(undefined);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    if (typeof window === "undefined") return "claro";
    const salvo = localStorage.getItem("orion-tema") as Tema | null;
    if (salvo) return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (tema === "escuro") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("orion-tema", tema);
  }, [tema]);

  const alternar = () => setTema((t) => (t === "claro" ? "escuro" : "claro"));

  return <TemaCtx.Provider value={{ tema, alternar }}>{children}</TemaCtx.Provider>;
}

export function useTema() {
  const ctx = useContext(TemaCtx);
  if (!ctx) throw new Error("useTema deve ser usado dentro de TemaProvider");
  return ctx;
}
