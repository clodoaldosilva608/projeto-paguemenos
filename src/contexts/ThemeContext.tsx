import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Tema = "claro" | "escuro";

// ===== White-Label Configuration =====
// Lê variáveis de ambiente (VITE_*) com fallback para Pague Menos
// Quando o Orion injeta env vars, a aplicação se adapta automaticamente
export interface BrandingConfig {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  companyId: string | null;
  companyName: string | null;
}

function getBrandingFromEnv(): BrandingConfig {
  // No TanStack Start, env vars do cliente usam VITE_ prefix
  const env = (typeof window !== "undefined" ? (window as any).__ENV__ : process.env) || {};

  return {
    appName: env.VITE_APP_NAME || env.APP_NAME || "ORION",
    primaryColor: env.VITE_PRIMARY_COLOR || env.PRIMARY_COLOR || "#1B4F8C",
    secondaryColor: env.VITE_SECONDARY_COLOR || env.SECONDARY_COLOR || "#D64541",
    logoUrl: env.VITE_LOGO_URL || env.LOGO_URL || null,
    companyId: env.VITE_COMPANY_ID || env.COMPANY_ID || null,
    companyName: env.VITE_COMPANY_NAME || env.COMPANY_NAME || null,
  };
}

// Tentar ler branding do localStorage (salvo pelo /setup)
function getBrandingFromStorage(): Partial<BrandingConfig> | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("orion-branding");
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

interface TemaContexto {
  tema: Tema;
  alternar: () => void;
  branding: BrandingConfig;
  atualizarBranding: (config: Partial<BrandingConfig>) => void;
  isWhiteLabel: boolean;
}

const TemaCtx = createContext<TemaContexto | undefined>(undefined);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    if (typeof window === "undefined") return "claro";
    const salvo = localStorage.getItem("orion-tema") as Tema | null;
    if (salvo) return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  });

  // Branding: env vars primeiro, depois localStorage (do /setup), depois fallback Pague Menos
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    const envBranding = getBrandingFromEnv();
    const storedBranding = getBrandingFromStorage();
    return {
      ...envBranding,
      ...storedBranding,
    };
  });

  useEffect(() => {
    const root = document.documentElement;
    if (tema === "escuro") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("orion-tema", tema);
  }, [tema]);

  // Aplicar CSS variables dinamicamente para white-label
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", branding.primaryColor);
    root.style.setProperty("--brand-secondary", branding.secondaryColor);
    root.style.setProperty("--brand-app-name", `"${branding.appName}"`);
  }, [branding]);

  const alternar = () => setTema((t) => (t === "claro" ? "escuro" : "claro"));

  const atualizarBranding = (config: Partial<BrandingConfig>) => {
    const novo = { ...branding, ...config };
    setBranding(novo);
    try {
      localStorage.setItem("orion-branding", JSON.stringify(novo));
    } catch {}
  };

  // isWhiteLabel = true quando há env vars OU config salva no localStorage
  const isWhiteLabel = !!branding.companyId || !!getBrandingFromStorage();

  return (
    <TemaCtx.Provider value={{ tema, alternar, branding, atualizarBranding, isWhiteLabel }}>
      {children}
    </TemaCtx.Provider>
  );
}

export function useTema() {
  const ctx = useContext(TemaCtx);
  if (!ctx) throw new Error("useTema deve ser usado dentro de TemaProvider");
  return ctx;
}

// Hook utilitário para acessar apenas o branding
export function useBranding() {
  const { branding } = useTema();
  return branding;
}
