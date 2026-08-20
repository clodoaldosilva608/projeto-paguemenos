// ============================================================
// Helper de fetch com timeout e retry exponencial
// Fase 8.1 da auditoria de 2026-08-04
//
// Problema: chamadas externas (IA, Sheets, SSO) sem timeout podiam
// pendurar indefinidamente. Sem retry, falhas transitórias derrubavam
// a operação. Sem circuit breaker, serviços externos indisponíveis
// geravam latência acumulada.
// ============================================================

export interface FetchWithRetryConfig {
  /** Número máximo de retries (além da tentativa inicial). Default: 2 */
  retries?: number;
  /** Backoff inicial em ms (dobra a cada retry). Default: 500ms */
  backoff?: number;
  /** Timeout por tentativa em ms. Default: 30000ms */
  timeout?: number;
  /** Função para decidir se uma resposta deve ser retryada. Default: 5xx */
  shouldRetry?: (response: Response, attempt: number) => boolean;
}

/**
 * Fetch com timeout usando AbortController.
 * Lança erro específico se timeout ocorrer.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout após ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch com retry exponencial. Tenta até `retries + 1` vezes.
 * Backoff: 500ms, 1000ms, 2000ms, ... (capped em 8s).
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: FetchWithRetryConfig = {},
): Promise<Response> {
  const {
    retries = 2,
    backoff = 500,
    timeout = 30_000,
    shouldRetry = (response) => response.status >= 500,
  } = config;

  let lastError: Error;
  const maxAttempts = retries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      // Se resposta é retryable e ainda há tentativas, esperar e tentar de novo
      if (shouldRetry(response, attempt) && attempt < retries) {
        const delay = Math.min(backoff * Math.pow(2, attempt), 8_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Erro de rede ou timeout — retryar se ainda há tentativas
      if (attempt < retries) {
        const delay = Math.min(backoff * Math.pow(2, attempt), 8_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError!;
}

/**
 * Helper simples para checar se erro é de timeout (para logging/observabilidade).
 */
export function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message.includes("Request timeout"))
  );
}

/**
 * Helper para checar se erro é recuperável (rede, timeout, 5xx).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    if (isTimeoutError(error)) return true;
    if (error.message.includes("fetch failed")) return true;
    if (error.message.includes("network")) return true;
  }
  return false;
}
