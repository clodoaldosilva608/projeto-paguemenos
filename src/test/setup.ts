/**
 * Setup global para testes Vitest.
 * Compatível com environment: node (default) e jsdom (quando necessário).
 */
import { TextEncoder, TextDecoder } from "util";

// Polyfill para TextEncoder/TextDecoder (necessário em alguns ambientes)
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as any;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as any;
}

// Polyfills para DOM (só aplicam se jsdom estiver ativo)
if (typeof window !== "undefined") {
  // Mock para matchMedia (necessário para componentes que usam prefers-reduced-motion)
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  // Mock para IntersectionObserver
  if (!window.IntersectionObserver) {
    class MockIntersectionObserver {
      observe = () => {};
      unobserve = () => {};
      disconnect = () => {};
      takeRecords = () => [];
    }
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  }
}

// Silenciar console.error em testes (apenas warnings esperados)
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("not wrapped in act")
  ) {
    return;
  }
  originalError.call(console, ...args);
};
