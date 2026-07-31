/**
 * Teste Geral — Orion / Pague Menos (Modelo Filial = Loja)
 *
 * Modelo:
 *   - Cada filial = 1 loja com 1 gerente + 1 supervisor + N vendedores/farmacêutica
 *   - Admin Master vê TODAS as filiais
 *   - Gerente vê TODA a sua filial (loja inteira)
 *   - Supervisor vê TODA a sua filial (subordinado do gerente)
 *   - Vendedor/Farmacêutica vê apenas a sua filial
 *
 * Valida:
 *  1. Login de cada perfil
 *  2. Acesso de LEITURA a cada tabela crítica
 *  3. Tentativas de MUTAÇÃO que devem ser BLOQUEADAS pela RLS
 *  4. Tentativas de MUTAÇÃO que devem ser PERMITIDAS
 *  5. Verificações de cross-filial
 *
 * Uso: bun run src/scripts/teste-geral.ts
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;

const CREDS = {
  admin:         { email: process.env.TEST_ADMIN_EMAIL,         password: process.env.TEST_ADMIN_PASSWORD },
  gerente1001:   { email: process.env.TEST_GERENTE_1001_EMAIL,  password: process.env.TEST_GERENTE_1001_PASSWORD },
  gerente2001:   { email: process.env.TEST_GERENTE_2001_EMAIL,  password: process.env.TEST_GERENTE_2001_PASSWORD },
  supervisor1001:{ email: process.env.TEST_SUPERVISOR_1001_EMAIL,password: process.env.TEST_SUPERVISOR_1001_PASSWORD },
  vendedor1001:  { email: process.env.TEST_VENDEDOR_1001_EMAIL, password: process.env.TEST_VENDEDOR_1001_PASSWORD },
  vendedor2002:  { email: process.env.TEST_VENDEDOR_2002_EMAIL, password: process.env.TEST_VENDEDOR_2002_PASSWORD },
};

type Token = string | null;
type TestResult = { category: string; name: string; pass: boolean; detail: string };

async function login(email: string, password: string): Promise<Token> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.access_token || null;
}

async function restCall(
  token: Token,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  try { data = await r.json(); } catch { /* empty body */ }
  return { status: r.status, data };
}

async function main() {
  const missing = Object.entries(CREDS).filter(([_, v]) => !v.email || !v.password).map(([k]) => k);
  if (missing.length > 0) {
    console.error(`[FATAL] Credenciais faltando no .env: ${missing.join(", ")}`);
    process.exit(1);
  }

  const results: TestResult[] = [];

  // ============================================================
  // SEÇÃO 1: LOGIN DE CADA PERFIL
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("SEÇÃO 1: LOGIN DE CADA PERFIL");
  console.log("=".repeat(70));

  const tokens: Record<string, Token> = {};
  for (const [perfil, cred] of Object.entries(CREDS)) {
    const t = await login(cred.email!, cred.password!);
    tokens[perfil] = t;
    results.push({
      category: "login",
      name: `Login ${perfil}`,
      pass: !!t,
      detail: t ? "OK" : "FAIL — credenciais inválidas ou usuário inativo",
    });
  }

  // ============================================================
  // SEÇÃO 2: ACESSO DE LEITURA
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("SEÇÃO 2: LEITURA — ACESSO PERMITIDO");
  console.log("=".repeat(70));

  const tabelasLeitura = [
    { tabela: "profiles",            select: "id,nome,filial_id,equipe_id" },
    { tabela: "vendas_diarias",      select: "id,filial_id,equipe_id,usuario_id" },
    { tabela: "metas_individuais",   select: "id,filial_id,equipe_id,usuario_id" },
    { tabela: "filiais",             select: "id,nome" },
    { tabela: "equipes",             select: "id,nome,filial_id" },
    { tabela: "campanhas",           select: "id,nome,filial_id" },
  ];

  for (const [perfil, token] of Object.entries(tokens)) {
    if (!token) continue;
    for (const { tabela, select } of tabelasLeitura) {
      const { status, data } = await restCall(token, "GET", `${tabela}?select=${select}&limit=200`);
      const rows = Array.isArray(data) ? data.length : 0;
      const ok = status === 200;
      results.push({
        category: "leitura",
        name: `${perfil} lê ${tabela}`,
        pass: ok,
        detail: ok ? `${rows} linhas` : `HTTP ${status}`,
      });
    }
  }

  // ============================================================
  // SEÇÃO 3: ISOLAMENTO CROSS-FILIAL
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("SEÇÃO 3: ISOLAMENTO");
  console.log("=".repeat(70));

  // 3.1 Vendedor 1001 NÃO vê filial 1002 em vendas
  if (tokens.vendedor1001) {
    const { data } = await restCall(tokens.vendedor1001, "GET", "vendas_diarias?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    results.push({
      category: "isolamento",
      name: "Vendedor 1001 não vê filial 1002 (vendas)",
      pass: !filiais.includes("1002"),
      detail: `filiais: ${filiais.join(",")}`,
    });
  }

  // 3.2 Vendedor 2002 NÃO vê filial 1001
  if (tokens.vendedor2002) {
    const { data } = await restCall(tokens.vendedor2002, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    results.push({
      category: "isolamento",
      name: "Vendedor 2002 não vê filial 1001 (profiles)",
      pass: !filiais.includes("1001"),
      detail: `filiais: ${filiais.join(",")}`,
    });
  }

  // 3.3 Gerente 1001 vê TODA a filial 1001 (5+ membros)
  if (tokens.gerente1001) {
    const { data } = await restCall(tokens.gerente1001, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    const total = Array.isArray(data) ? data.length : 0;
    results.push({
      category: "isolamento",
      name: "Gerente 1001 vê TODA a filial 1001 (5+ membros)",
      pass: filiais.length === 1 && filiais[0] === "1001" && total >= 5,
      detail: `filiais: ${filiais.join(",")} | total: ${total}`,
    });
  }

  // 3.4 Supervisor 1001 vê TODA a filial 1001 (igual gerente)
  if (tokens.supervisor1001) {
    const { data } = await restCall(tokens.supervisor1001, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    const total = Array.isArray(data) ? data.length : 0;
    results.push({
      category: "isolamento",
      name: "Supervisor 1001 vê TODA a filial 1001 (igual gerente)",
      pass: filiais.length === 1 && filiais[0] === "1001" && total >= 5,
      detail: `filiais: ${filiais.join(",")} | total: ${total}`,
    });
  }

  // 3.5 Admin VÊ múltiplas filiais
  if (tokens.admin) {
    const { data } = await restCall(tokens.admin, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id).filter(Boolean))] : [];
    results.push({
      category: "isolamento",
      name: "Admin Master vê 5+ filiais",
      pass: filiais.length > 5,
      detail: `${filiais.length} filiais: ${filiais.join(",")}`,
    });
  }

  // 3.6 Gerente 1001 NÃO vê metas da filial 2001
  if (tokens.gerente1001) {
    const { data } = await restCall(tokens.gerente1001, "GET", "metas_individuais?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    results.push({
      category: "isolamento",
      name: "Gerente 1001 não vê metas da filial 2001",
      pass: !filiais.includes("2001"),
      detail: `filiais: ${filiais.join(",")}`,
    });
  }

  // 3.7 Gerente 1001 vê TODAS as vendas da filial 1001 (múltiplos vendedores)
  if (tokens.gerente1001) {
    const { data } = await restCall(tokens.gerente1001, "GET", "vendas_diarias?select=filial_id,usuario_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    const usuarios = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.usuario_id))] : [];
    results.push({
      category: "isolamento",
      name: "Gerente 1001 vê TODAS as vendas da filial 1001 (múltiplos vendedores)",
      pass: filiais.length === 1 && filiais[0] === "1001" && usuarios.length > 1,
      detail: `filiais: ${filiais.join(",")} | vendedores: ${usuarios.length}`,
    });
  }

  // 3.8 Vendedor 1001 vê apenas suas próprias vendas
  if (tokens.vendedor1001) {
    const { data } = await restCall(tokens.vendedor1001, "GET", "vendas_diarias?select=usuario_id&limit=500");
    const usuarios = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.usuario_id))] : [];
    results.push({
      category: "isolamento",
      name: "Vendedor 1001 vê apenas suas próprias vendas",
      pass: usuarios.length === 1,
      detail: `vendedores distintos: ${usuarios.length}`,
    });
  }

  // ============================================================
  // SEÇÃO 4: MUTAÇÕES
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("SEÇÃO 4: MUTAÇÕES");
  console.log("=".repeat(70));

  // 4.1 Vendedor TENTA inserir venda para OUTRO usuário — BLOQUEADO
  if (tokens.vendedor1001) {
    const { status } = await restCall(tokens.vendedor1001, "POST", "vendas_diarias", {
      usuario_id: "00000000-0000-0000-0000-000000000000",
      filial_id: "1001",
      equipe_id: "eq-1001",
      data: "2026-01-01",
      categoria: "faturamento",
      valor_venda: 100,
      qtd_clientes: 1,
    });
    results.push({
      category: "mutacao-bloqueada",
      name: "Vendedor 1001 não insere venda para outro usuário",
      pass: status >= 400,
      detail: `HTTP ${status} (esperado: 4xx)`,
    });
  }

  // 4.2 Vendedor TENTA alterar perfil de outro usuário real — BLOQUEADO
  if (tokens.vendedor1001 && tokens.admin) {
    await restCall(tokens.vendedor1001, "PATCH", "profiles?id=eq.ac4c051c-4697-44a9-806d-92b37cd1da99", {
      nome: "HACKED",
    });
    const { data: checkData } = await restCall(tokens.admin, "GET", "profiles?select=nome&id=eq.ac4c051c-4697-44a9-806d-92b37cd1da99");
    const nomeAtual = Array.isArray(checkData) && checkData.length > 0 ? (checkData[0] as any).nome : null;
    results.push({
      category: "mutacao-bloqueada",
      name: "Vendedor 1001 não altera perfil de outro (gerente 2001)",
      pass: nomeAtual !== "HACKED",
      detail: `nome após tentativa: "${nomeAtual}"`,
    });
  }

  // 4.3 Vendedor TENTA ler audit_log — 0 linhas (admin-only)
  if (tokens.vendedor1001) {
    const { status, data } = await restCall(tokens.vendedor1001, "GET", "audit_log?select=id&limit=1");
    const isEmpty = Array.isArray(data) && data.length === 0;
    results.push({
      category: "mutacao-bloqueada",
      name: "Vendedor 1001 não lê audit_log",
      pass: status === 200 && isEmpty,
      detail: `HTTP ${status}, ${Array.isArray(data) ? data.length : 0} linhas`,
    });
  }

  // 4.4 Vendedor TENTA ler ai_config — 0 linhas (admin-only)
  if (tokens.vendedor1001) {
    const { status, data } = await restCall(tokens.vendedor1001, "GET", "ai_config?select=id&limit=1");
    const isEmpty = Array.isArray(data) && data.length === 0;
    results.push({
      category: "mutacao-bloqueada",
      name: "Vendedor 1001 não lê ai_config",
      pass: status === 200 && isEmpty,
      detail: `HTTP ${status}, data=${JSON.stringify(data).slice(0, 80)}`,
    });
  }

  // 4.5 Vendedor vê apenas própria user_roles
  if (tokens.vendedor1001) {
    const { data } = await restCall(tokens.vendedor1001, "GET", "user_roles?select=user_id,role&limit=100");
    const rows = Array.isArray(data) ? data.length : 0;
    results.push({
      category: "mutacao-bloqueada",
      name: "Vendedor 1001 vê apenas própria user_roles",
      pass: rows <= 1,
      detail: `${rows} linhas (esperado: 0 ou 1)`,
    });
  }

  // 4.6 Gerente TENTA criar user_roles — BLOQUEADO
  if (tokens.gerente1001) {
    const { status } = await restCall(tokens.gerente1001, "POST", "user_roles", {
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
    });
    results.push({
      category: "mutacao-bloqueada",
      name: "Gerente 1001 não cria user_roles (admin-only)",
      pass: status >= 400,
      detail: `HTTP ${status} (esperado: 4xx)`,
    });
  }

  // 4.7 Gerente TENTA ler audit_log — 0 linhas (admin-only)
  if (tokens.gerente1001) {
    const { status, data } = await restCall(tokens.gerente1001, "GET", "audit_log?select=id&limit=1");
    const isEmpty = Array.isArray(data) && data.length === 0;
    results.push({
      category: "mutacao-bloqueada",
      name: "Gerente 1001 não lê audit_log (admin-only)",
      pass: status === 200 && isEmpty,
      detail: `HTTP ${status}, ${Array.isArray(data) ? data.length : 0} linhas`,
    });
  }

  // 4.8 Gerente TENTA ler ai_config — 0 linhas (admin-only)
  if (tokens.gerente1001) {
    const { status, data } = await restCall(tokens.gerente1001, "GET", "ai_config?select=id&limit=1");
    const isEmpty = Array.isArray(data) && data.length === 0;
    results.push({
      category: "mutacao-bloqueada",
      name: "Gerente 1001 não lê ai_config (admin-only)",
      pass: status === 200 && isEmpty,
      detail: `HTTP ${status}, data=${JSON.stringify(data).slice(0, 80)}`,
    });
  }

  // 4.9 Supervisor TENTA criar user_roles — BLOQUEADO
  if (tokens.supervisor1001) {
    const { status } = await restCall(tokens.supervisor1001, "POST", "user_roles", {
      user_id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
    });
    results.push({
      category: "mutacao-bloqueada",
      name: "Supervisor 1001 não cria user_roles",
      pass: status >= 400,
      detail: `HTTP ${status} (esperado: 4xx)`,
    });
  }

  // 4.10 Admin PODE ler audit_log
  if (tokens.admin) {
    const { status } = await restCall(tokens.admin, "GET", "audit_log?select=id&limit=1");
    results.push({
      category: "mutacao-permitida",
      name: "Admin lê audit_log",
      pass: status === 200,
      detail: `HTTP ${status}`,
    });
  }

  // 4.11 Admin PODE ler ai_config
  if (tokens.admin) {
    const { status } = await restCall(tokens.admin, "GET", "ai_config?select=id&limit=1");
    results.push({
      category: "mutacao-permitida",
      name: "Admin lê ai_config",
      pass: status === 200,
      detail: `HTTP ${status}`,
    });
  }

  // 4.12 Admin PODE ler todos user_roles
  if (tokens.admin) {
    const { status, data } = await restCall(tokens.admin, "GET", "user_roles?select=user_id,role&limit=200");
    const rows = Array.isArray(data) ? data.length : 0;
    results.push({
      category: "mutacao-permitida",
      name: "Admin lê todos user_roles",
      pass: status === 200 && rows > 1,
      detail: `HTTP ${status}, ${rows} linhas`,
    });
  }

  // ============================================================
  // RELATÓRIO FINAL
  // ============================================================
  console.log("\n" + "=".repeat(70));
  console.log("RELATÓRIO DE TESTES GERAIS — Modelo Filial = Loja");
  console.log("=".repeat(70));

  const categories = ["login", "leitura", "isolamento", "mutacao-bloqueada", "mutacao-permitida"];
  let allPass = true;
  let totalPass = 0;
  let totalFail = 0;

  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    if (catResults.length === 0) continue;
    console.log(`\n--- ${cat.toUpperCase()} (${catResults.filter(r => r.pass).length}/${catResults.length} OK) ---`);
    for (const r of catResults) {
      const tag = r.pass ? "PASS" : "FAIL";
      console.log(`  [${tag}] ${r.name}`);
      console.log(`         ${r.detail}`);
      if (r.pass) totalPass++; else { totalFail++; allPass = false; }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log(`TOTAL: ${totalPass}/${results.length} testes passaram | ${totalFail} falharam`);
  console.log("=".repeat(70));
  if (!allPass) {
    console.log("\n⚠ ALGUNS TESTES FALHARAM — verifique acima.");
    process.exit(1);
  } else {
    console.log("\n✓ TODOS OS TESTES PASSARAM — sistema funcionando corretamente.");
  }
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(2);
});
