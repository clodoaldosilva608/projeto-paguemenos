/**
 * Tenant Middleware — TanStack Start
 *
 * Extrai o subdomínio do host e injeta tenantSlug no context do servidor.
 * Loaders e Server Functions acessam via getRequestContext().
 *
 * Estratégia de fallback (NUNCA QUEBRA PRODUÇÃO):
 * 1. Subdomínio de plataforma (*.projeto-paguemenos.vercel.app) → extrai slug
 * 2. localhost → usa ?tenant= param ou 'paguemenos'
 * 3. Domínio customizado → lookup em companies.custom_domain
 * 4. Se nada casar → 'paguemenos' (fallback hardcoded)
 */

import { createMiddleware } from "@tanstack/react-start";
import { getEvent } from "@tanstack/react-start/server";

// Domínios de plataforma (não são tenants)
const PLATFORM_DOMAINS = [
  "projeto-paguemenos.vercel.app",
  "paguemenos.vercel.app",
  "localhost",
  "127.0.0.1",
];

export interface TenantConfig {
  slug: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  appName: string;
  logoUrl: string | null;
  customDomain: string | null;
  active: boolean;
}

const DEFAULT_TENANT: TenantConfig = {
  slug: "paguemenos",
  name: "Pague Menos",
  primaryColor: "#1B4F8C",
  secondaryColor: "#D64541",
  appName: "PagueMenos",
  logoUrl: null,
  customDomain: null,
  active: true,
};

/**
 * Extrai o slug do tenant do hostname.
 * Ex: clienteA.projeto-paguemenos.vercel.app → "clienteA"
 *     projeto-paguemenos.vercel.app → "paguemenos" (fallback)
 *     localhost → "paguemenos" (ou ?tenant= param)
 */
export function extractTenantSlug(host: string, searchParams?: URLSearchParams): string {
  const hostname = host.split(":")[0]; // remove porta

  // localhost: usa ?tenant= param ou fallback
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    if (searchParams) {
      const tenantParam = searchParams.get("tenant");
      if (tenantParam && /^[a-z0-9-]{3,40}$/.test(tenantParam)) {
        return tenantParam;
      }
    }
    return "paguemenos";
  }

  // Verifica se é subdomínio de uma plataforma
  for (const platform of PLATFORM_DOMAINS) {
    if (hostname === platform) {
      // Domínio raiz da plataforma → tenant padrão
      return "paguemenos";
    }
    if (hostname.endsWith(`.${platform}`)) {
      // Subdomínio: extrai a parte antes do domínio da plataforma
      const sub = hostname.slice(0, -(platform.length + 1));
      // Remove "www" se existir
      if (sub && sub !== "www") {
        // Valida formato: apenas lowercase, números, hífens
        if (/^[a-z0-9-]{3,40}$/.test(sub)) {
          return sub;
        }
      }
      return "paguemenos";
    }
  }

  // Domínio customizado: retorna o hostname completo para lookup
  // O resolver vai buscar em companies.custom_domain
  return hostname;
}

/**
 * Busca config do tenant no Supabase.
 * Se não encontrar ou erro, retorna DEFAULT_TENANT (NUNCA quebra).
 */
export async function resolveTenantConfig(slug: string): Promise<TenantConfig> {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.warn("[tenant] Supabase não configurado — usando tenant padrão");
      return DEFAULT_TENANT;
    }

    // Tenta usar a função get_tenant_config (criada pela migration)
    // Se a função não existir (migration não aplicada), cai para SELECT direto
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_tenant_config`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tenant_slug: slug }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.length > 0) {
        const t = data[0];
        return {
          slug: t.slug,
          name: t.name,
          primaryColor: t.primary_color || DEFAULT_TENANT.primaryColor,
          secondaryColor: t.secondary_color || DEFAULT_TENANT.secondaryColor,
          appName: t.app_name || DEFAULT_TENANT.appName,
          logoUrl: t.logo_url || null,
          customDomain: t.custom_domain || null,
          active: t.active ?? true,
        };
      }
    }

    // Fallback: SELECT direto na tabela companies
    const resp2 = await fetch(`${SUPABASE_URL}/rest/v1/companies?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=*&limit=1`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    });

    if (resp2.ok) {
      const data = await resp2.json();
      if (data && data.length > 0) {
        const t = data[0];
        return {
          slug: t.slug,
          name: t.name,
          primaryColor: t.primary_color || DEFAULT_TENANT.primaryColor,
          secondaryColor: t.secondary_color || DEFAULT_TENANT.secondaryColor,
          appName: t.app_name || DEFAULT_TENANT.appName,
          logoUrl: t.logo_url || null,
          customDomain: t.custom_domain || null,
          active: t.active ?? true,
        };
      }
    }

    // Se slug não existe, retorna padrão (NUNCA quebra)
    console.warn(`[tenant] Tenant "${slug}" não encontrado — usando padrão`);
    return DEFAULT_TENANT;
  } catch (err: any) {
    console.error("[tenant] Erro ao resolver tenant:", err.message);
    return DEFAULT_TENANT;
  }
}

// Cache em memória (TTL 5 min)
const tenantCache = new Map<string, { data: TenantConfig; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function getCachedTenantConfig(slug: string): Promise<TenantConfig> {
  const cached = tenantCache.get(slug);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const data = await resolveTenantConfig(slug);
  tenantCache.set(slug, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

/**
 * Middleware global — roda em toda request.
 * Extrai tenant do host e injeta no context.
 */
export const tenantMiddleware = createMiddleware({ type: "request" }).server(async ({ next }) => {
  const event = getEvent();
  const request = event?.node?.req || event?.request;
  
  let host = "localhost";
  let searchParams: URLSearchParams | undefined;

  if (request) {
    host = request.headers?.host || request.headers?.["x-forwarded-host"] || "localhost";
    const url = request.url || request.originalUrl;
    if (url) {
      try {
        const parsed = new URL(url, `http://${host}`);
        searchParams = parsed.searchParams;
      } catch {}
    }
  }

  const slug = extractTenantSlug(host, searchParams);
  const tenant = await getCachedTenantConfig(slug);

  // Injeta no context para loaders/server functions acessarem
  return next({
    context: {
      tenant,
      tenantSlug: slug,
    },
  });
});

/**
 * Helper para acessar o tenant atual em loaders/server functions.
 */
export function getCurrentTenant(): TenantConfig {
  try {
    const event = getEvent();
    const ctx = (event as any)?.context;
    if (ctx?.tenant) return ctx.tenant;
  } catch {}
  return DEFAULT_TENANT;
}

export { DEFAULT_TENANT };
