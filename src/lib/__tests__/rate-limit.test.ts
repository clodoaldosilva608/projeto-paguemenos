/**
 * Testes unitários para src/lib/rate-limit.ts
 * Cobre a lógica de rate limiting em memória (fallback quando Upstash não configurado).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Importar depois de limpar cache
describe("Rate limit (memória)", () => {
  let checkRateLimit: typeof import("@/lib/rate-limit").checkRateLimit;
  let getClientIP: typeof import("@/lib/rate-limit").getClientIP;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/rate-limit");
    checkRateLimit = mod.checkRateLimit;
    getClientIP = mod.getClientIP;
  });

  it("deve permitir primeira requisição", () => {
    const result = checkRateLimit("192.168.1.1", "login", 10, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("deve contar requisições corretamente", () => {
    const ip = "10.0.0.1";
    checkRateLimit(ip, "login", 3, 60_000);
    checkRateLimit(ip, "login", 3, 60_000);
    const result = checkRateLimit(ip, "login", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("deve bloquear após exceder limite", () => {
    const ip = "10.0.0.2";
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, "login", 5, 60_000);
    }
    const result = checkRateLimit(ip, "login", 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.remaining).toBe(0);
  });

  it("deve resetar após janela expirar", () => {
    const ip = "10.0.0.3";
    // Mock Date.now para simular passagem de tempo
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip, "login", 5, 60_000);
    }
    expect(checkRateLimit(ip, "login", 5, 60_000).allowed).toBe(false);

    // Avançar 61 segundos
    vi.spyOn(Date, "now").mockReturnValue(now + 61_000);
    const result = checkRateLimit(ip, "login", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);

    vi.restoreAllMocks();
  });

  it("deve isolar rate limits por endpoint", () => {
    const ip = "10.0.0.4";
    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip, "login", 10, 60_000);
    }
    // Bloqueado em login
    expect(checkRateLimit(ip, "login", 10, 60_000).allowed).toBe(false);
    // Mas permitido em outro endpoint
    expect(checkRateLimit(ip, "signup", 5, 60_000).allowed).toBe(true);
  });

  it("deve isolar rate limits por IP", () => {
    const ip1 = "10.0.0.5";
    const ip2 = "10.0.0.6";
    for (let i = 0; i < 10; i++) {
      checkRateLimit(ip1, "login", 10, 60_000);
    }
    expect(checkRateLimit(ip1, "login", 10, 60_000).allowed).toBe(false);
    expect(checkRateLimit(ip2, "login", 10, 60_000).allowed).toBe(true);
  });

  it("getClientIP deve extrair IP de x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIP(request)).toBe("203.0.113.1");
  });

  it("getClientIP deve extrair IP de x-real-ip", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "203.0.113.2" },
    });
    expect(getClientIP(request)).toBe("203.0.113.2");
  });

  it("getClientIP deve retornar 'unknown' se nenhum header presente", () => {
    const request = new Request("https://example.com");
    expect(getClientIP(request)).toBe("unknown");
  });
});
