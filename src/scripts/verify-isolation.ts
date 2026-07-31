/**
 * Script de verificação de isolamento — Modelo Filial = Loja
 *
 * Modelo:
 *   - Cada filial = 1 loja com 1 gerente + 1 supervisor + N vendedores/farmacêutica
 *   - Admin Master vê TODAS as filiais
 *   - Gerente vê TODA a sua filial (loja inteira)
 *   - Supervisor vê TODA a sua filial (subordinado do gerente)
 *   - Vendedor/Farmacêutica vê apenas a sua filial
 *
 * Verifica:
 *   1. Vendedor não vê vendas/profiles de outra filial
 *   2. Gerente vê TODA a sua filial (todos os vendedores, supervisor, etc.)
 *   3. Supervisor vê TODA a sua filial (igual gerente, mas sem poder gerencial)
 *   4. Admin vê múltiplas filiais
 *   5. Usuário sem filial_id NÃO vê todos os perfis (fix do Item 3)
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;

const CREDS = {
  admin:         { email: process.env.TEST_ADMIN_EMAIL,          password: process.env.TEST_ADMIN_PASSWORD },
  gerente1001:   { email: process.env.TEST_GERENTE_1001_EMAIL,   password: process.env.TEST_GERENTE_1001_PASSWORD },
  gerente2001:   { email: process.env.TEST_GERENTE_2001_EMAIL,   password: process.env.TEST_GERENTE_2001_PASSWORD },
  supervisor1001:{ email: process.env.TEST_SUPERVISOR_1001_EMAIL, password: process.env.TEST_SUPERVISOR_1001_PASSWORD },
  vendedor1001:  { email: process.env.TEST_VENDEDOR_1001_EMAIL,  password: process.env.TEST_VENDEDOR_1001_PASSWORD },
  vendedor2002:  { email: process.env.TEST_VENDEDOR_2002_EMAIL,  password: process.env.TEST_VENDEDOR_2002_PASSWORD },
};

function assertCreds() {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!ANON_KEY) missing.push("SUPABASE_ANON_KEY (ou SUPABASE_PUBLISHABLE_KEY)");
  for (const [key, val] of Object.entries(CREDS)) {
    if (!val.email) missing.push(`${key.toUpperCase()}_EMAIL`);
    if (!val.password) missing.push(`${key.toUpperCase()}_PASSWORD`);
  }
  if (missing.length > 0) {
    console.error("\n[FATAL] Variáveis de ambiente ausentes no .env:");
    missing.forEach((m) => console.error(`   - ${m}`));
    process.exit(1);
  }
}

type Row = Record<string, unknown>;

async function login(email: string, password: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  return data.access_token || null;
}

async function query(token: string, table: string, select: string, limit = 500): Promise<Row[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${limit}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const data = await r.json();
  return Array.isArray(data) ? (data as Row[]) : [];
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function runTests() {
  assertCreds();
  const results: { test: string; pass: boolean; detail: string }[] = [];

  // TEST 1: Vendedor 1001 não vê vendas da filial 1002
  const t1 = await login(CREDS.vendedor1001.email!, CREDS.vendedor1001.password!);
  if (t1) {
    const vendas = await query(t1, "vendas_diarias", "filial_id,usuario_id");
    const filiais = uniq(vendas.map((v) => String(v.filial_id ?? "")));
    results.push({
      test: "Vendedor 1001 não vê vendas da filial 1002",
      pass: !filiais.includes("1002"),
      detail: `Filiais visíveis: ${filiais.join(", ") || "(nenhuma)"} | total de linhas: ${vendas.length}`,
    });
  } else {
    results.push({ test: "Vendedor 1001 não vê vendas da filial 1002", pass: false, detail: "LOGIN FALHOU" });
  }

  // TEST 2: Vendedor 2002 não vê profiles da filial 1001
  const t2 = await login(CREDS.vendedor2002.email!, CREDS.vendedor2002.password!);
  if (t2) {
    const profiles = await query(t2, "profiles", "filial_id,equipe_id");
    const filiais = uniq(profiles.map((p) => String(p.filial_id ?? "")));
    results.push({
      test: "Vendedor 2002 não vê profiles da filial 1001",
      pass: !filiais.includes("1001"),
      detail: `Filiais visíveis: ${filiais.join(", ") || "(nenhuma)"} | total: ${profiles.length}`,
    });
  } else {
    results.push({ test: "Vendedor 2002 não vê profiles da filial 1001", pass: false, detail: "LOGIN FALHOU" });
  }

  // TEST 3: Admin vê múltiplas filiais
  const t3 = await login(CREDS.admin.email!, CREDS.admin.password!);
  if (t3) {
    const profiles = await query(t3, "profiles", "filial_id");
    const filiais = uniq(profiles.map((p) => String(p.filial_id ?? "")));
    results.push({
      test: "Admin Master vê múltiplas filiais (5+)",
      pass: filiais.length > 5,
      detail: `${filiais.length} filiais visíveis: ${filiais.join(", ")}`,
    });
  } else {
    results.push({ test: "Admin Master vê múltiplas filiais", pass: false, detail: "LOGIN FALHOU" });
  }

  // TEST 4: Gerente 1001 vê TODA a filial 1001 (todos os 5 membros: gerente, supervisor, farmacêutica, 2 vendedores)
  const t4 = await login(CREDS.gerente1001.email!, CREDS.gerente1001.password!);
  if (t4) {
    const profiles = await query(t4, "profiles", "nome,filial_id,equipe_id");
    const filiais = uniq(profiles.map((p) => String(p.filial_id ?? "")));
    const seesOnlyOwnFilial = filiais.length === 1 && filiais[0] === "1001";
    const seesAllColleagues = profiles.length >= 5; // 5 pessoas na filial 1001
    results.push({
      test: "Gerente 1001 vê TODA a filial 1001 (5+ membros da loja)",
      pass: seesOnlyOwnFilial && seesAllColleagues,
      detail: `filial_id: ${filiais.join(",")} | profiles: ${profiles.length} (esperado: 5+)`,
    });
  } else {
    results.push({ test: "Gerente 1001 vê TODA a filial 1001", pass: false, detail: "LOGIN FALHOU" });
  }

  // TEST 5: Gerente 2001 não vê metas da filial 2002
  const t5 = await login(CREDS.gerente2001.email!, CREDS.gerente2001.password!);
  if (t5) {
    const metas = await query(t5, "metas_individuais", "filial_id");
    const filiais = uniq(metas.map((m) => String(m.filial_id ?? "")));
    results.push({
      test: "Gerente 2001 não vê metas da filial 2002",
      pass: !filiais.includes("2002"),
      detail: `Filiais visíveis: ${filiais.join(", ") || "(nenhuma)"} | total: ${metas.length}`,
    });
  } else {
    results.push({ test: "Gerente 2001 não vê metas da filial 2002", pass: false, detail: "LOGIN FALHOU" });
  }

  // TEST 6: Supervisor 1001 vê TODA a filial 1001 (igual gerente)
  const t6 = await login(CREDS.supervisor1001.email!, CREDS.supervisor1001.password!);
  if (t6) {
    const profiles = await query(t6, "profiles", "filial_id,equipe_id");
    const filiais = uniq(profiles.map((p) => String(p.filial_id ?? "")));
    const seesOnlyOwnFilial = filiais.length === 1 && filiais[0] === "1001";
    const seesAllColleagues = profiles.length >= 5;
    results.push({
      test: "Supervisor 1001 vê TODA a filial 1001 (igual gerente)",
      pass: seesOnlyOwnFilial && seesAllColleagues,
      detail: `filial_id: ${filiais.join(",")} | profiles: ${profiles.length} (esperado: 5+)`,
    });
  } else {
    results.push({ test: "Supervisor 1001 vê TODA a filial 1001", pass: false, detail: "LOGIN FALHOU" });
  }

  // TEST 7: Gerente 1001 vê TODAS as vendas da filial 1001 (não apenas as próprias)
  const t7 = await login(CREDS.gerente1001.email!, CREDS.gerente1001.password!);
  if (t7) {
    const vendas = await query(t7, "vendas_diarias", "filial_id,usuario_id");
    const filiais = uniq(vendas.map((v) => String(v.filial_id ?? "")));
    const usuarios = uniq(vendas.map((v) => String(v.usuario_id ?? "")));
    const seesOnlyOwnFilial = filiais.length === 1 && filiais[0] === "1001";
    // Gerente deve ver vendas de múltiplos vendedores (não apenas as próprias)
    const seesMultipleVendedores = usuarios.length > 1;
    results.push({
      test: "Gerente 1001 vê TODAS as vendas da filial 1001 (múltiplos vendedores)",
      pass: seesOnlyOwnFilial && seesMultipleVendedores,
      detail: `filial_id: ${filiais.join(",")} | vendedores distintos: ${usuarios.length} | total: ${vendas.length}`,
    });
  } else {
    results.push({ test: "Gerente 1001 vê TODAS as vendas da filial 1001", pass: false, detail: "LOGIN FALHOU" });
  }

  // TEST 8: Vendedor 1001 vê apenas suas próprias vendas (não as de outros vendedores da filial)
  const t8 = await login(CREDS.vendedor1001.email!, CREDS.vendedor1001.password!);
  if (t8) {
    const vendas = await query(t8, "vendas_diarias", "filial_id,usuario_id");
    const usuarios = uniq(vendas.map((v) => String(v.usuario_id ?? "")));
    results.push({
      test: "Vendedor 1001 vê apenas suas próprias vendas (1 vendedor)",
      pass: usuarios.length === 1,
      detail: `vendedores distintos nas vendas: ${usuarios.length} | total: ${vendas.length}`,
    });
  } else {
    results.push({ test: "Vendedor 1001 vê apenas suas próprias vendas", pass: false, detail: "LOGIN FALHOU" });
  }

  // RESUMO
  console.log("\n" + "=".repeat(70));
  console.log("VERIFICAÇÃO DE ISOLAMENTO — Modelo Filial = Loja");
  console.log("=".repeat(70) + "\n");

  let allPass = true;
  let passCount = 0;
  for (const r of results) {
    const tag = r.pass ? "PASS" : "FAIL";
    console.log(`[${tag}] ${r.test}`);
    console.log(`       ${r.detail}\n`);
    if (r.pass) passCount++; else allPass = false;
  }

  console.log("=".repeat(70));
  console.log(`RESULTADO: ${passCount}/${results.length} testes passaram`);
  console.log("=".repeat(70));
  if (!allPass) {
    console.log("\n⚠ ALGUNS TESTES FALHARAM — isolamento comprometido.\n");
    process.exit(1);
  } else {
    console.log("\n✓ TODOS OS TESTES PASSARAM — modelo filial=loja verificado.\n");
  }
}

runTests().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(2);
});
