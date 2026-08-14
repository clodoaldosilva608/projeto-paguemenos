import { defineConfig, devices } from "@playwright/test";

/**
 * Configuração Playwright para testes E2E do Orion.
 * Fase 9.3 da auditoria 2026-08-04.
 *
 * Estes testes validam fluxos críticos EM PRODUÇÃO (smoke tests)
 * para garantir que correções P0 não regrediram.
 *
 * Uso:
 *   npx playwright test                    # roda todos
 *   npx playwright test --project=desktop  # só desktop
 *   npx playwright test --headed           # com browser visível
 *   npx playwright test --ui               # modo interativo
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    // URL base — usar produção por padrão, mas pode ser overridden com BASE_URL
    baseURL: process.env.BASE_URL || "https://orion-vendas.vercel.app",

    // Trace em falhas para debug
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 14"] },
    },
  ],
});
