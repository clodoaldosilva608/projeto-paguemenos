/**
 * Testes de segurança — protegem as correções P0 da auditoria 2026-08-04.
 * Estes testes garantem que mudanças futuras não regrediram as correções.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Audit Fase 1 — endpoints sem auth", () => {
  it("gerarPlanilhaExecutiva deve ter requireSupabaseAuth no código-fonte", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/planilha-executiva.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("requireSupabaseAuth");
    expect(content).toContain("ensureAdmin");
    expect(content).toMatch(/\.middleware\(\[requireSupabaseAuth\]\)/);
  });

  it("extractVendasFromImage deve ter requireSupabaseAuth + rate limit", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/vendas-ocr.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("requireSupabaseAuth");
    expect(content).toContain("applyRateLimit");
  });

  it("criarTabelasEquipesFiliais deve ter requireSupabaseAuth + ensureAdminOnly", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/criar-tabelas.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("requireSupabaseAuth");
    expect(content).toContain("ensureAdminOnly");
  });

  it("setup-login-matricula deve ter requireSupabaseAuth + ensureAdminOnly", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/setup-login-matricula.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("requireSupabaseAuth");
    expect(content).toContain("ensureAdminOnly");
  });

  it("PowerBI endpoint NÃO deve ter token 'orion-public-demo' funcional", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/routes/api/public/powerbi/vendas.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    // O token só deve aparecer em comentários explicativos
    const functionalMatches = content.match(
      /["'`]orion-public-demo["'`]\s*[!=]==?\s*token|token\s*[!=]==?\s*["'`]orion-public-demo["'`]/g,
    );
    expect(functionalMatches).toBeNull();
  });
});

describe("Audit Fase 2 — hardcoded secrets", () => {
  it("buscarEmailPorMatricula NÃO deve retornar senha", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/login-matricula.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    // Não deve haver "senha:" no return
    const returnSenha = content.match(/return\s*\{[^}]*senha:/s);
    expect(returnSenha).toBeNull();
  });

  it("auth.tsx deve usar senha.trim() em vez de r.senha", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "src/routes/auth.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("login(r.email, senha.trim())");
    expect(content).not.toContain("login(r.email, r.senha)");
  });
});

describe("Audit Fase 3 — RLS + multi-tenancy + CRUD whitelist", () => {
  it("crud.functions.ts deve ter ALLOWED_COLUMNS whitelist", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/admin/crud.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("ALLOWED_COLUMNS");
    expect(content).toContain("ADMIN_ONLY_TABLES");
    expect(content).toContain("validateColumns");
    expect(content).toContain("ensureAdminOnlyForTable");

    // Whitelist deve incluir tabelas críticas
    expect(content).toMatch(/ADMIN_ONLY_TABLES\s*=\s*\[[^\]]*"user_roles"[^\]]*\]/);
    expect(content).toMatch(/ADMIN_ONLY_TABLES\s*=\s*\[[^\]]*"members"[^\]]*\]/);
    expect(content).toMatch(/ADMIN_ONLY_TABLES\s*=\s*\[[^\]]*"companies"[^\]]*\]/);
  });

  it("sheets.functions.ts deve ter validateSheetUrl com whitelist de domínios", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/sheets.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("validateSheetUrl");
    expect(content).toContain("allowedDomains");
    expect(content).toContain("docs.google.com");
    // AWS metadata IP block — aceita tanto "169.254" quanto "169\.254" (regex escape)
    expect(content).toMatch(/169\\.?254/);
  });

  it("migration guard_sensitive_profile_fields deve existir", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "supabase/migrations/20260804000200_lock_sensitive_profile_fields.sql",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("guard_sensitive_profile_fields");
    expect(content).toContain("filial_id");
    expect(content).toContain("equipe_id");
    expect(content).toContain("company_id");
    expect(content).toContain("aprovado");
  });

  it("migration fix_handle_new_user_membership deve forçar role='member'", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "supabase/migrations/20260804000600_fix_handle_new_user_membership.sql",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("'member'");
    expect(content).toMatch(/VALUES\s*\(\s*v_company_id\s*,\s*NEW\.id\s*,\s*'member'\s*\)/i);
    expect(content).toContain("ON CONFLICT");
    expect(content).toContain("DO NOTHING");
  });
});

describe("Audit Fase 6 — performance DB", () => {
  it("migration add_missing_indexes deve ter índices críticos", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "supabase/migrations/20260804000700_add_missing_indexes.sql",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("idx_profiles_filial_id");
    expect(content).toContain("idx_audit_log_entity_id");
    expect(content).toContain("idx_vendas_diarias_data");
    expect(content).toContain("idx_powerbi_tokens_token");
  });

  it("migration dashboard_stats_rpc deve criar função RPC", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "supabase/migrations/20260804001000_dashboard_stats_rpc.sql",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("get_dashboard_stats");
    expect(content).toContain("SUM(valor_venda)");
    expect(content).toContain("json_build_object");
  });

  it("crud.functions.ts getDashboardStats deve usar RPC", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/admin/crud.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain('admin.rpc("get_dashboard_stats")');
  });

  it("login-matricula.functions.ts deve ter paginação", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/login-matricula.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("page");
    expect(content).toContain("pageSize");
    expect(content).toContain(".range(from, to)");
    expect(content).toContain("pagination");
  });
});

describe("Audit Fase 7 — frontend memo + code splitting", () => {
  it("routes/index.tsx deve importar OrionApp e LandingPage", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "src/routes/index.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // Import estático (revertido de lazy — Vercel build não propagava lazy chunks)
    expect(content).toContain('import OrionApp');
    expect(content).toContain('import LandingPage');
  });

  it("AuthContext deve ter useMemo no value", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/contexts/AuthContext.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("useMemo");
    expect(content).toMatch(/const\s+value\s*=\s*useMemo/);
  });

  it("DashboardView deve ter KpiCard como componente memoizado top-level", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/components/DashboardView.tsx",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("memo(function KpiCard");
    // Não deve haver definição inline dentro do corpo
    expect(content).not.toMatch(/const\s+KpiCard\s*=\s*\(\s*\{[^}]+\}\s*\)\s*=>\s*\(/);
  });

  it("router.tsx deve ter QueryClient configurado", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(process.cwd(), "src/router.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("staleTime");
    expect(content).toContain("retry: 1");
    expect(content).toContain("refetchOnWindowFocus: false");
  });
});

describe("Audit Fase 8 — resiliência", () => {
  it("fetch-with-timeout.ts deve existir com fetchWithTimeout e fetchWithRetry", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/fetch-with-timeout.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("export async function fetchWithTimeout");
    expect(content).toContain("export async function fetchWithRetry");
    expect(content).toContain("AbortController");
    expect(content).toContain("Math.pow(2, attempt)"); // backoff exponencial
  });

  it("ia.functions.ts deve usar fetchWithRetry", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/ia.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("fetchWithRetry");
    expect(content).toMatch(/retries:\s*1/);
    expect(content).toMatch(/timeout:\s*30_000/);
  });

  it("sheets.functions.ts deve usar fetchWithTimeout", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/sheets.functions.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("fetchWithTimeout");
    expect(content).toMatch(/15_000/);
  });

  it("circuit-breaker.ts deve existir com withCircuitBreaker", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/circuit-breaker.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("withCircuitBreaker");
    expect(content).toContain("canExecute");
    expect(content).toContain("recordFailure");
    expect(content).toContain("recordSuccess");
  });

  it("audit.ts deve existir com logAuditSafe", async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.resolve(
      process.cwd(),
      "src/lib/audit.ts",
    );
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("logAuditSafe");
    expect(content).toContain("processAuditQueue");
    expect(content).toContain("MAX_ATTEMPTS");
    expect(content).toContain("auditQueue");
  });
});
