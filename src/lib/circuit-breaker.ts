// ============================================================
// Circuit breaker simples em memória
// Fase 8.4 da auditoria de 2026-08-04
//
// Protege chamadas externas (IA, Sheets, SSO) de ficarem tentando
// quando serviço está indisponível. Após N falhas consecutivas, abre
// o circuit e falha rápido até tempo de recuperação passar.
//
// NOTA: em Vercel serverless, cada invocação pode rodar em instância
// diferente — este circuit breaker é por-instância. Para circuit breaker
// distribuído, usar Redis (planejado para Fase 5 com Upstash).
// ============================================================

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
  successCount: number;
}

const breakers = new Map<string, CircuitBreakerState>();

const DEFAULT_THRESHOLD = 5; // abre após 5 falhas consecutivas
const DEFAULT_RECOVERY_TIMEOUT = 60_000; // 1 min em estado open
const DEFAULT_HALF_OPEN_TRIALS = 1; // 1 tentativa em half-open

export interface CircuitBreakerConfig {
  /** Número de falhas consecutivas para abrir. Default: 5 */
  failureThreshold?: number;
  /** Tempo em ms antes de tentar de novo (half-open). Default: 60_000 */
  recoveryTimeout?: number;
  /** Nome para isolar breakers diferentes. Default: "default" */
  name?: string;
}

export function getCircuitBreaker(name: string = "default") {
  let state = breakers.get(name);
  if (!state) {
    state = { failures: 0, lastFailureTime: 0, isOpen: false, successCount: 0 };
    breakers.set(name, state);
  }

  return {
    /** Verifica se pode executar. Retorna false se circuito está aberto. */
    canExecute(): boolean {
      if (!state!.isOpen) return true;
      // Verificar se pode tentar de novo (half-open)
      if (Date.now() - state!.lastFailureTime > DEFAULT_RECOVERY_TIMEOUT) {
        state!.isOpen = false;
        state!.failures = 0;
        state!.successCount = 0;
        return true;
      }
      return false;
    },

    /** Registra sucesso — reseta contador de falhas. */
    recordSuccess(): void {
      state!.failures = 0;
      state!.isOpen = false;
      state!.successCount++;
    },

    /** Registra falha — incrementa contador, pode abrir circuito. */
    recordFailure(): void {
      state!.failures++;
      state!.lastFailureTime = Date.now();
      if (state!.failures >= DEFAULT_THRESHOLD) {
        state!.isOpen = true;
      }
    },

    /** Retorna snapshot do estado (para observabilidade). */
    getState(): Readonly<CircuitBreakerState> {
      return { ...state! };
    },

    /** Reseta o circuito (para testes). */
    reset(): void {
      state!.failures = 0;
      state!.lastFailureTime = 0;
      state!.isOpen = false;
      state!.successCount = 0;
    },
  };
}

/**
 * Executa função com circuit breaker.
 * Se circuito está aberto, lança erro imediatamente sem chamar fn.
 */
export async function withCircuitBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  config?: CircuitBreakerConfig,
): Promise<T> {
  const breaker = getCircuitBreaker(name);

  if (!breaker.canExecute()) {
    const state = breaker.getState();
    throw new Error(
      `Circuit breaker '${name}' está aberto (${state.failures} falhas consecutivas). ` +
        `Tenta novamente em ${Math.ceil((DEFAULT_RECOVERY_TIMEOUT - (Date.now() - state.lastFailureTime)) / 1000)}s.`,
    );
  }

  try {
    const result = await fn();
    breaker.recordSuccess();
    return result;
  } catch (error) {
    breaker.recordFailure();
    throw error;
  }
}

/**
 * Limpa todos os circuit breakers (para testes).
 */
export function resetAllCircuitBreakers(): void {
  breakers.clear();
}
