import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface FilialContextValue {
  filialSelecionada: string; // "todas" ou ID da filial
  setFilialSelecionada: (id: string) => void;
  isTodasFiliais: boolean;
  podeVerTodas: boolean;
}

const FilialCtx = createContext<FilialContextValue | null>(null);

const STORAGE_KEY = "orion-filial-selecionada";

export function FilialProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const podeVerTodas = usuario?.perfil === "admin";

  const [filialSelecionada, setFilialSelecionadaState] = useState<string>(() => {
    if (typeof window === "undefined") return "todas";
    return localStorage.getItem(STORAGE_KEY) || "todas";
  });

  // Se nao for admin, forcar a filial do usuario
  useEffect(() => {
    if (!podeVerTodas && usuario?.filialId) {
      setFilialSelecionadaState(usuario.filialId);
      localStorage.setItem(STORAGE_KEY, usuario.filialId);
    }
  }, [podeVerTodas, usuario?.filialId]);

  const setFilialSelecionada = (id: string) => {
    setFilialSelecionadaState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return (
    <FilialCtx.Provider
      value={{
        filialSelecionada,
        setFilialSelecionada,
        isTodasFiliais: filialSelecionada === "todas",
        podeVerTodas,
      }}
    >
      {children}
    </FilialCtx.Provider>
  );
}

export function useFilial() {
  const ctx = useContext(FilialCtx);
  if (!ctx) {
    // Fallback se não tiver provider
    return {
      filialSelecionada: "todas",
      setFilialSelecionada: () => {},
      isTodasFiliais: true,
      podeVerTodas: false,
    };
  }
  return ctx;
}
