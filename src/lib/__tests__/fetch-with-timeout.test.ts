/**
 * Testes unitários para src/lib/fetch-with-timeout.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("fetchWithTimeout", () => {
  let fetchWithTimeout: typeof import("@/lib/fetch-with-timeout").fetchWithTimeout;
  let fetchWithRetry: typeof import("@/lib/fetch-with-timeout").fetchWithRetry;
  let isTimeoutError: typeof import("@/lib/fetch-with-timeout").isTimeoutError;
  let isRetryableError: typeof import("@/lib/fetch-with-timeout").isRetryableError;

  beforeEach(async () => {
    const mod = await import("@/lib/fetch-with-timeout");
    fetchWithTimeout = mod.fetchWithTimeout;
    fetchWithRetry = mod.fetchWithRetry;
    isTimeoutError = mod.isTimeoutError;
    isRetryableError = mod.isRetryableError;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deve retornar response em sucesso", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const response = await fetchWithTimeout("https://example.com");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("deve lançar erro de timeout quando fetch excede tempo", async () => {
    // Mock AbortController para simular timeout imediato
    const originalAbortController = globalThis.AbortController;
    class MockAbortController {
      signal = { aborted: false, reason: undefined, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false };
      abort = () => {
        // Simular abort imediato
        const err = new Error("The user aborted a request");
        err.name = "AbortError";
        setTimeout(() => { throw err; }, 0);
      };
    }
    globalThis.AbortController = MockAbortController as any;

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url: any, options: any) => {
        return new Promise((_resolve, reject) => {
          // Simular que o abort foi triggered
          setTimeout(() => {
            const err = new Error("The user aborted a request");
            err.name = "AbortError";
            reject(err);
          }, 5);
        });
      },
    );

    await expect(
      fetchWithTimeout("https://example.com", {}, 10),
    ).rejects.toThrow();

    globalThis.AbortController = originalAbortController;
  }, 3000);

  it("deve respeitar AbortController", async () => {
    const abortError = new Error("The user aborted a request");
    abortError.name = "AbortError";

    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(abortError), 10);
      });
    });

    await expect(
      fetchWithTimeout("https://example.com", {}, 100),
    ).rejects.toThrow("Request timeout");
  });

  it("isTimeoutError deve identificar erros de timeout", () => {
    const timeoutErr = new Error("Request timeout após 30s");
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    const otherErr = new Error("network error");

    expect(isTimeoutError(timeoutErr)).toBe(true);
    expect(isTimeoutError(abortErr)).toBe(true);
    expect(isTimeoutError(otherErr)).toBe(false);
  });

  it("isRetryableError deve identificar erros de rede/timeout", () => {
    const timeoutErr = new Error("Request timeout após 30s");
    const fetchErr = new Error("fetch failed");
    const networkErr = new Error("network error");
    const otherErr = new Error("invalid input");

    expect(isRetryableError(timeoutErr)).toBe(true);
    expect(isRetryableError(fetchErr)).toBe(true);
    expect(isRetryableError(networkErr)).toBe(true);
    expect(isRetryableError(otherErr)).toBe(false);
  });
});

describe("fetchWithRetry", () => {
  let fetchWithRetry: typeof import("@/lib/fetch-with-timeout").fetchWithRetry;

  beforeEach(async () => {
    const mod = await import("@/lib/fetch-with-timeout");
    fetchWithRetry = mod.fetchWithRetry;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deve retornar response em sucesso sem retry", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const response = await fetchWithRetry("https://example.com");
    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("deve retry em erro 5xx", async () => {
    const errorResponse = new Response("server error", { status: 500 });
    const okResponse = new Response("ok", { status: 200 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(okResponse);

    const response = await fetchWithRetry(
      "https://example.com",
      {},
      { retries: 2, backoff: 10, timeout: 1000 },
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("deve falhar após esgotar retries", async () => {
    const errorResponse = new Response("server error", { status: 500 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(errorResponse);

    const response = await fetchWithRetry(
      "https://example.com",
      {},
      { retries: 2, backoff: 10, timeout: 1000 },
    );

    // Após 3 tentativas (1 + 2 retries), retorna última response 500
    expect(response.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // 1 inicial + 2 retries
  });

  it("não deve retry em erro 4xx (exceto 429)", async () => {
    const notFoundResponse = new Response("not found", { status: 404 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(notFoundResponse);

    const response = await fetchWithRetry(
      "https://example.com",
      {},
      { retries: 3, backoff: 10, timeout: 1000 },
    );

    expect(response.status).toBe(404);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // sem retry
  });

  it("deve retry em erro de rede (fetch failed)", async () => {
    const networkError = new Error("fetch failed");
    const okResponse = new Response("ok", { status: 200 });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(okResponse);

    const response = await fetchWithRetry(
      "https://example.com",
      {},
      { retries: 2, backoff: 10, timeout: 1000 },
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
