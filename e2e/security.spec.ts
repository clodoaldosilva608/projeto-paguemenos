/**
 * Testes E2E — Segurança (protegem correções P0 da auditoria 2026-08-04)
 *
 * Estes testes rodam contra PRODUÇÃO (https://orion-vendas.vercel.app)
 * e validam que:
 * - Endpoints sem auth retornam 401
 * - Token demo "orion-public-demo" foi removido
 * - CORS não é mais *
 * - Headers de segurança estão ativos
 *
 * Rodar: npx playwright test e2e/security.spec.ts
 */
import { test, expect } from "@playwright/test";

const PROD_URL = process.env.BASE_URL || "https://orion-vendas.vercel.app";

test.describe("Auditoria P0 — endpoints sem auth", () => {
  test("PowerBI endpoint sem token retorna 400", async ({ request }) => {
    const response = await request.get(`/api/public/powerbi/vendas`);
    expect(response.status()).toBe(400);
  });

  test("PowerBI com token demo 'orion-public-demo' retorna 401 (NÃO 200)", async ({ request }) => {
    // 🔒 CRÍTICO: este teste protege a correção da Fase 1.
    // Antes da Fase 1, este endpoint retornava 200 com TODAS as vendas.
    // Agora deve retornar 401.
    const response = await request.get(
      `/api/public/powerbi/vendas?token=orion-public-demo`,
    );
    expect(response.status()).toBe(401);
  });

  test("PowerBI com token inválido retorna 401", async ({ request }) => {
    const response = await request.get(
      `/api/public/powerbi/vendas?token=invalid-token-xyz`,
    );
    expect(response.status()).toBe(401);
  });

  test("PowerBI com token demo NÃO retorna dados JSON", async ({ request }) => {
    const response = await request.get(
      `/api/public/powerbi/vendas?token=orion-public-demo&format=json`,
    );
    expect(response.status()).toBe(401);

    // Garantir que resposta NÃO contém dados de vendas
    const text = await response.text();
    expect(text).not.toContain("total_vendas");
    expect(text).not.toContain("vendedores");
    expect(text).not.toContain("matricula");
  });
});

test.describe("Auditoria P0 — headers de segurança", () => {
  test("CORS NÃO é mais Access-Control-Allow-Origin: *", async ({ request }) => {
    const response = await request.get(
      `/api/public/powerbi/vendas?token=orion-public-demo`,
    );

    // Não deve ter header CORS * (deve ser whitelist ou ausente)
    const corsHeader = response.headers()["access-control-allow-origin"];
    expect(corsHeader).not.toBe("*");
  });

  test("HSTS ativo", async ({ request }) => {
    const response = await request.get(`/`);
    const hsts = response.headers()["strict-transport-security"];
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
  });

  test("X-Frame-Options: DENY", async ({ request }) => {
    const response = await request.get(`/`);
    expect(response.headers()["x-frame-options"]).toBe("DENY");
  });

  test("X-Content-Type-Options: nosniff", async ({ request }) => {
    const response = await request.get(`/`);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("Referrer-Policy: strict-origin-when-cross-origin", async ({ request }) => {
    const response = await request.get(`/`);
    expect(response.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
  });

  test("Permissions-Policy restringe camera/microphone", async ({ request }) => {
    const response = await request.get(`/`);
    const pp = response.headers()["permissions-policy"];
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
  });
});

test.describe("Auditoria P0 — landing page carrega", () => {
  test("landing page retorna 200", async ({ page }) => {
    const response = await page.goto(`/`);
    expect(response?.status()).toBe(200);
  });

  test("landing page contém logo Orion", async ({ page }) => {
    await page.goto(`/`);
    const logo = page.locator('img[alt*="ORION"]').first();
    await expect(logo).toBeVisible();
  });

  test("landing page NÃO contém 'orion-public-demo' no HTML", async ({ page }) => {
    await page.goto(`/`);
    const content = await page.content();
    // Não deve haver referência ao token demo no HTML
    // (apenas em comentários de código, não no HTML renderizado)
    expect(content).not.toMatch(/token=orion-public-demo/);
  });

  test("landing page tem botão Entrar", async ({ page }) => {
    await page.goto(`/`);
    const loginButton = page.getByRole("button", { name: /entrar/i }).first();
    await expect(loginButton).toBeVisible();
  });
});

test.describe("Auditoria P0 — auth flow", () => {
  test("página /auth carrega", async ({ page }) => {
    await page.goto(`/auth`);
    // Deve ter campo de email
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test("página /auth NÃO aceita credenciais fracas no cliente (validação)", async ({ page }) => {
    await page.goto(`/auth`);

    // Tentar login com senha fraca
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    await emailInput.fill("teste@teste.com");
    await passwordInput.fill("123"); // senha fraca

    // Submeter form
    const submitButton = page.getByRole("button", { name: /entrar|acessar|login/i }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
    }

    // Deve mostrar erro de validação ou não prosseguir
    // (não deve ir para dashboard)
    await page.waitForTimeout(1000);
    expect(page.url()).not.toMatch(/\/dashboard|\/admin/);
  });
});

test.describe("Auditoria P0 — mobile responsivo", () => {
  test("landing page carrega em mobile (iPhone 14)", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Mobile test apenas em chromium");

    // Este teste só roda no projeto "mobile" do playwright.config
    await page.goto(`/`);
    await expect(page).toHaveTitle(/Orion/i);
  });
});
