/**
 * Testes unitários para src/lib/circuit-breaker.ts
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Circuit breaker", () => {
  let withCircuitBreaker: typeof import("@/lib/circuit-breaker").withCircuitBreaker;
  let getCircuitBreaker: typeof import("@/lib/circuit-breaker").getCircuitBreaker;
  let resetAllCircuitBreakers: typeof import("@/lib/circuit-breaker").resetAllCircuitBreakers;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/lib/circuit-breaker");
    withCircuitBreaker = mod.withCircuitBreaker;
    getCircuitBreaker = mod.getCircuitBreaker;
    resetAllCircuitBreakers = mod.resetAllCircuitBreakers;
    resetAllCircuitBreakers();
  });

  it("deve permitir execução quando circuito está fechado", async () => {
    const result = await withCircuitBreaker("test", async () => "ok");
    expect(result).toBe("ok");
  });

  it("deve registrar sucesso e manter circuito fechado", async () => {
    await withCircuitBreaker("test", async () => 1);
    await withCircuitBreaker("test", async () => 2);
    await withCircuitBreaker("test", async () => 3);

    const state = getCircuitBreaker("test").getState();
    expect(state.isOpen).toBe(false);
    expect(state.failures).toBe(0);
    expect(state.successCount).toBe(3);
  });

  it("deve abrir circuito após 5 falhas consecutivas", async () => {
    const failingFn = async () => {
      throw new Error("fail");
    };

    // 5 falhas
    for (let i = 0; i < 5; i++) {
      await expect(withCircuitBreaker("test", failingFn)).rejects.toThrow("fail");
    }

    const state = getCircuitBreaker("test").getState();
    expect(state.isOpen).toBe(true);
    expect(state.failures).toBe(5);
  });

  it("deve falhar rápido quando circuito está aberto", async () => {
    // Abrir circuito
    for (let i = 0; i < 5; i++) {
      await expect(
        withCircuitBreaker("test", async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
    }

    // Próxima chamada deve falhar imediatamente sem executar fn
    const start = Date.now();
    await expect(
      withCircuitBreaker("test", async () => {
        throw new Error("should not be called");
      }),
    ).rejects.toThrow("Circuit breaker 'test' está aberto");
    const elapsed = Date.now() - start;

    // Deve falhar em < 100ms (não executou fn)
    expect(elapsed).toBeLessThan(100);
  });

  it("deve resetar falhas após sucesso", async () => {
    // Algumas falhas
    for (let i = 0; i < 3; i++) {
      await expect(
        withCircuitBreaker("test", async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow();
    }

    expect(getCircuitBreaker("test").getState().failures).toBe(3);

    // Sucesso reseta contador
    await withCircuitBreaker("test", async () => "ok");

    expect(getCircuitBreaker("test").getState().failures).toBe(0);
    expect(getCircuitBreaker("test").getState().isOpen).toBe(false);
  });

  it("deve permitir half-open após recovery timeout", async () => {
    // Abrir circuito
    for (let i = 0; i < 5; i++) {
      await expect(
        withCircuitBreaker("test", async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow();
    }

    expect(getCircuitBreaker("test").canExecute()).toBe(false);

    // Mock Date.now para simular passagem de tempo (60s + 1ms)
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 60_001);

    expect(getCircuitBreaker("test").canExecute()).toBe(true);

    vi.restoreAllMocks();
  });

  it("deve isolar breakers por nome", async () => {
    // Abrir "service-a"
    for (let i = 0; i < 5; i++) {
      await expect(
        withCircuitBreaker("service-a", async () => {
          throw new Error("fail");
        }),
      ).rejects.toThrow();
    }

    // "service-b" ainda deve funcionar
    const result = await withCircuitBreaker("service-b", async () => "ok");
    expect(result).toBe("ok");

    expect(getCircuitBreaker("service-a").getState().isOpen).toBe(true);
    expect(getCircuitBreaker("service-b").getState().isOpen).toBe(false);
  });
});
