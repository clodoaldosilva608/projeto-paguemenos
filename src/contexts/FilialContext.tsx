import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface FilialContextValue {
  /** "todas" ou ID da filial selecionada */
  filialSelecionada: string;
  /** Define a filial ativa (admin pode escolher "todas") */
  setFilialSelecionada: (id: string) => void;
  /** True quando "Todas as Filiais" está selecionado */
  isTodasFiliais: boolean;
  /** True se o usuário pode ver todas as filiais (apenas admin) */
  podeVerTodas: boolean;
  /** Retorna o filial_id para filtrar queries, ou undefined se "todas" */
  filialFiltro: string | undefined;
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

  // Se não for admin, forçar a filial do usuário
  useEffect(() => {
    if (usuario && !podeVerTodas && usuario.filialId) {
      setFilialSelecionadaState(usuario.filialId);
      localStorage.setItem(STORAGE_KEY, usuario.filialId);
    }
    // Admin começa com "todas" se não houver seleção salva
    if (podeVerTodas && !localStorage.getItem(STORAGE_KEY)) {
      setFilialSelecionadaState("todas");
    }
  }, [podeVerTodas, usuario]);

  const setFilialSelecionada = (id: string) => {
    setFilialSelecionadaState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  // filialFiltro: undefined para "todas" (não filtrar), ou o ID da filial
  const filialFiltro = filialSelecionada === "todas" ? undefined : filialSelecionada;

  return (
    <FilialCtx.Provider
      value={{
        filialSelecionada,
        setFilialSelecionada,
        isTodasFiliais: filialSelecionada === "todas",
        podeVerTodas,
        filialFiltro,
      }}
    >
      {children}
    </FilialCtx.Provider>
  );
}

export function useFilial() {
  const ctx = useContext(FilialCtx);
  if (!ctx) {
    return {
      filialSelecionada: "todas",
      setFilialSelecionada: () => {},
      isTodasFiliais: true,
      podeVerTodas: false,
      filialFiltro: undefined as string | undefined,
    };
  }
  return ctx;
}
