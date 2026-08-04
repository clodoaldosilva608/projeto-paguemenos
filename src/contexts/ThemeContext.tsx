import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";

type Tema = "claro" | "escuro";

// ===== White-Label Configuration =====
// Lê configuração do tenant do Supabase (multi-tenant via subdomínio).
// Fallback: env vars → localStorage → defaults do Pague Menos.
export interface BrandingConfig {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  companyId: string | null;
  companyName: string | null;
  tenantSlug: string | null;
}

const DEFAULT_BRANDING: BrandingConfig = {
  appName: "PagueMenos",
  primaryColor: "#1B4F8C",
  secondaryColor: "#D64541",
  logoUrl: null,
  companyId: null,
  companyName: "Pague Menos",
  tenantSlug: "paguemenos",
};

function getBrandingFromEnv(): Partial<BrandingConfig> {
  const env = (typeof window !== "undefined" ? (window as any).__ENV__ : process.env) || {};
  return {
    appName: env.VITE_APP_NAME || env.APP_NAME,
    primaryColor: env.VITE_PRIMARY_COLOR || env.PRIMARY_COLOR,
    secondaryColor: env.VITE_SECONDARY_COLOR || env.SECONDARY_COLOR,
    logoUrl: env.VITE_LOGO_URL || env.LOGO_URL || null,
    companyId: env.VITE_COMPANY_ID || env.COMPANY_ID || null,
    companyName: env.VITE_COMPANY_NAME || env.COMPANY_NAME || null,
  };
}

function getBrandingFromStorage(): Partial<BrandingConfig> | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("orion-branding");
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

/**
 * Extrai o slug do tenant do hostname atual.
 * clienteA.projeto-paguemenos.vercel.app → "clienteA"
 * projeto-paguemenos.vercel.app → "paguemenos"
 */
function getTenantSlugFromHost(): string {
  if (typeof window === "undefined") return "paguemenos";
  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get("tenant");
  if (tenantParam) return tenantParam;

  const platforms = ["projeto-paguemenos.vercel.app", "paguemenos.vercel.app", "localhost", "127.0.0.1"];
  for (const p of platforms) {
    if (host === p) return "paguemenos";
    if (host.endsWith(`.${p}`)) {
      const sub = host.slice(0, -(p.length + 1));
      if (sub && sub !== "www" && /^[a-z0-9-]{3,40}$/.test(sub)) return sub;
    }
  }
  return "paguemenos";
}

/**
 * Busca config do tenant do Supabase via API REST.
 * Se falhar, retorna null (fallback para env/storage/defaults).
 */
async function fetchTenantFromSupabase(slug: string): Promise<Partial<BrandingConfig> | null> {
  try {
    const supabaseUrl = (typeof window !== "undefined" ? (window as any).__ENV__ : process.env)?.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl) return null;

    // Usa endpoint público (RLS permite SELECT em companies where active=true)
    const resp = await fetch(`${supabaseUrl}/rest/v1/companies?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=slug,name,primary_color,secondary_color,app_name,logo_url&limit=1`, {
      headers: {
        apikey: (typeof window !== "undefined" ? (window as any).__ENV__ : process.env)?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "",
      },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || data.length === 0) return null;
    const t = data[0];
    return {
      appName: t.app_name,
      primaryColor: t.primary_color,
      secondaryColor: t.secondary_color,
      logoUrl: t.logo_url,
      companyName: t.name,
      tenantSlug: t.slug,
      companyId: String(t.slug), // usa slug como ID text
    };
  } catch {
    return null;
  }
}

interface TemaContexto {
  tema: Tema;
  alternar: () => void;
  branding: BrandingConfig;
  atualizarBranding: (config: Partial<BrandingConfig>) => void;
  isWhiteLabel: boolean;
  isLoadingTenant: boolean;
}

const TemaCtx = createContext<TemaContexto | undefined>(undefined);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    if (typeof window === "undefined") return "claro";
    const salvo = localStorage.getItem("orion-tema") as Tema | null;
    if (salvo) return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  });

  // Inicializa com env + storage + defaults
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    const envBranding = getBrandingFromEnv();
    const storedBranding = getBrandingFromStorage();
    return {
      ...DEFAULT_BRANDING,
      ...envBranding,
      ...storedBranding,
    } as BrandingConfig;
  });

  const [isLoadingTenant, setIsLoadingTenant] = useState(true);

  // Busca config do tenant no Supabase ao montar
  useEffect(() => {
    let mounted = true;
    const slug = getTenantSlugFromHost();

    fetchTenantFromSupabase(slug).then((tenantConfig) => {
      if (!mounted || !tenantConfig) {
        setIsLoadingTenant(false);
        return;
      }
      // Supabase tem prioridade sobre env/storage
      setBranding((prev) => ({
        ...prev,
        ...tenantConfig,
      }));
      setIsLoadingTenant(false);
    });

    return () => { mounted = false; };
  }, []);

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

  const alternar = useCallback(() => setTema((t) => (t === "claro" ? "escuro" : "claro")), []);

  const atualizarBranding = useCallback((config: Partial<BrandingConfig>) => {
    setBranding((prev) => {
      const novo = { ...prev, ...config };
      try {
        localStorage.setItem("orion-branding", JSON.stringify(novo));
      } catch {}
      return novo;
    });
  }, []);

  const isWhiteLabel = branding.tenantSlug !== "paguemenos" || !!branding.companyId || !!getBrandingFromStorage();

  // 🔒 Fase 7.2 (2026-08-04): memoizar value para evitar re-render em cascata.
  const value = useMemo(
    () => ({ tema, alternar, branding, atualizarBranding, isWhiteLabel, isLoadingTenant }),
    [tema, alternar, branding, atualizarBranding, isWhiteLabel, isLoadingTenant],
  );

  return (
    <TemaCtx.Provider value={value}>
      {children}
    </TemaCtx.Provider>
  );
}

export function useTema() {
  const ctx = useContext(TemaCtx);
  if (!ctx) throw new Error("useTema deve ser usado dentro de TemaProvider");
  return ctx;
}
