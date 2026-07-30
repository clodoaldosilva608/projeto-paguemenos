// ============================================================================
// Rate Limiting — protege endpoints sensíveis contra força bruta
// Implementação simples em memória (por IP + endpoint)
// Para produção com múltiplas instâncias, recomendado usar Upstash Ratelimit
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Mapa em memória: key = "ip:endpoint", value = { count, resetAt }
const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpeza periódica de entradas expiradas (a cada 5 minutos)
let lastCleanup = Date.now();
function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return; // 5 min
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) rateLimitMap.delete(key);
  }
}

/**
 * Verifica rate limit para um IP + endpoint.
 * Retorna { allowed: true } ou { allowed: false, retryAfter: segundos }
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000, // 1 minuto
): { allowed: boolean; retryAfter?: number; remaining: number } {
  cleanupExpired();
  const key = `${ip}:${endpoint}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    // Primeira requisição ou janela expirou
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter, remaining: 0 };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Extrai IP do request (considera x-forwarded-for, x-real-ip, etc)
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  // Vercel/ proxies
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0].trim();
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "unknown";
}

/**
 * Helper para aplicar rate limit em server functions sensíveis
 * Lança erro se exceder o limite
 *
 * @example
 * import { applyRateLimit } from "@/lib/rate-limit";
 *
 * export const login = createServerFn({ method: "POST" })
 *   .handler(async ({ context }) => {
 *     await applyRateLimit(context.request, "login", 10, 60_000);
 *     // ... resto do handler
 *   });
 */
export async function applyRateLimit(
  request: Request | undefined,
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000,
): Promise<void> {
  if (!request) return; // Skip se não tiver request (ex: chamada interna)
  const ip = getClientIP(request);
  const result = checkRateLimit(ip, endpoint, maxRequests, windowMs);
  if (!result.allowed) {
    throw new Error(
      `Muitas tentativas para ${endpoint}. Tente novamente em ${result.retryAfter}s.`,
    );
  }
}

/**
 * Configurações de rate limit por tipo de endpoint
 */
export const RATE_LIMITS = {
  // Login: 10 tentativas por minuto por IP (protege contra força bruta)
  login: { max: 10, windowMs: 60_000 },
  // Cadastro: 5 por minuto por IP (protege contra spam de contas)
  signup: { max: 5, windowMs: 60_000 },
  // SSO: 20 por minuto por IP (mais permissivo, é chamado por sistemas)
  sso: { max: 20, windowMs: 60_000 },
  // Reset password: 3 por hora por IP (protege contra enumeração de emails)
  resetPassword: { max: 3, windowMs: 60 * 60 * 1000 },
  // Login por matrícula: 10 por minuto por IP
  matricula: { max: 10, windowMs: 60_000 },
} as const;
