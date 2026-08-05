// Helper de fetch com timeout e retry exponencial
// Fase 8.1 da auditoria de 2026-08-04

export interface FetchWithRetryConfig {
  retries?: number;
  backoff?: number;
  timeout?: number;
  shouldRetry?: (response: Response, attempt: number) => boolean;
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
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
      if (shouldRetry(response, attempt) && attempt < retries) {
        const delay = Math.min(backoff * Math.pow(2, attempt), 8_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        const delay = Math.min(backoff * Math.pow(2, attempt), 8_000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  throw lastError!;
}

export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.message.includes("Request timeout"));
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    if (isTimeoutError(error)) return true;
    if (error.message.includes("fetch failed")) return true;
    if (error.message.includes("network")) return true;
  }
  return false;
}
