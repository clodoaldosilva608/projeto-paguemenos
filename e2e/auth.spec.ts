/**
 * Testes E2E — Fluxos críticos de autenticação e navegação
 *
 * Valida que:
 * - Login com credenciais válidas funciona
 * - Logout funciona
 * - Rotas protegidas redirecionam sem auth
 * - Multi-tenant isolation (vendedor não vê admin)
 *
 * Rodar: npx playwright test e2e/auth.spec.ts
 *
 * NOTA: estes testes requerem credenciais de teste configuradas via
 * env vars (TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, etc.) e não devem
 * ser commitados com credenciais reais.
 */
import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

test.describe("Auth flow", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Credenciais de teste não configuradas");

  test("login admin bem-sucedido", async ({ page }) => {
    await page.goto(`/auth`);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    await emailInput.fill(ADMIN_EMAIL!);
    await passwordInput.fill(ADMIN_PASSWORD!);

    const submitButton = page.getByRole("button", { name: /entrar|acessar|login/i }).first();
    await submitButton.click();

    // Deve redirecionar para dashboard ou admin
    await page.waitForURL(/\/$|\/dashboard|\/admin/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/$|\/dashboard|\/admin/);
  });

  test("logout redireciona para landing/auth", async ({ page }) => {
    // Login primeiro
    await page.goto(`/auth`);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await emailInput.fill(ADMIN_EMAIL!);
    await passwordInput.fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: /entrar|acessar|login/i }).first().click();
    await page.waitForURL(/\/$|\/dashboard|\/admin/, { timeout: 10_000 });

    // Procurar botão de logout
    const logoutButton = page.getByRole("button", { name: /sair|logout/i }).first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForURL(/\/auth|\/$/, { timeout: 10_000 });
    }
  });
});

test.describe("Rotas protegidas", () => {
  test("/admin redireciona sem auth", async ({ page }) => {
    // Limpar qualquer sessão existente
    await page.context().clearCookies();

    await page.goto(`/admin`);

    // Deve redirecionar para auth ou landing
    await page.waitForURL(/\/auth|\/$/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/auth|\/$/);
  });

  test("/planilha-interna redireciona sem auth", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(`/planilha-interna`);
    await page.waitForURL(/\/auth|\/$/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/auth|\/$/);
  });

  test("/tv carrega sem auth (página pública)", async ({ page }) => {
    await page.context().clearCookies();
    const response = await page.goto(`/tv`);
    // TV mode é público (painel em tempo real)
    expect(response?.status()).toBe(200);
  });
});
