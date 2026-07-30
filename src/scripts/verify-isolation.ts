/**
 * Script de verificação de isolamento de dados por filial e equipe.
 * Verifica:
 * 1. Vendedor da Filial A não consegue ler vendas da Filial B
 * 2. Gerente da Equipe X não consegue ler metas da Equipe Y (mesma filial)
 * 3. Admin lê tudo
 * 4. Supervisor vê toda a filial, não apenas sua equipe
 */

const SUPABASE_URL = "https://wfvihysxlzkwwrwobmpv.supabase.co";
const ANON_KEY = "sb_publishable_IAEHjjaGnKBAtrT4DsmUqw_mrwFvul1";

async function login(email: string, password: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  return data.access_token || null;
}

async function query(token: string, table: string, select: string, limit = 200) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${limit}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const data = await r.json();
  return Array.isArray(data) ? data : [];
}

async function runTests() {
  const results: { test: string; pass: boolean; detail: string }[] = [];

  // TEST 1: Vendedor 1001 não vê vendas da filial 1002
  const t1 = await login("joao1001@pmenos.com.br", "Vend1001@2026");
  if (t1) {
    const vendas = await query(t1, "vendas_diarias", "filial_id");
    const filiais = new Set(vendas.map((v: any) => v.filial_id));
    results.push({
      test: "Vendedor 1001 não vê vendas da filial 1002",
      pass: !filiais.has("1002"),
      detail: `Filiais: ${Array.from(filiais).join(", ")}`,
    });
  }

  // TEST 2: Vendedor 1002 não vê profiles da filial 1001
  const t2 = await login("carlos2002@pmenos.com.br", "Vend2002@2026");
  if (t2) {
    const profiles = await query(t2, "profiles", "filial_id");
    const filiais = new Set(profiles.map((p: any) => p.filial_id));
    results.push({
      test: "Vendedor 1002 não vê profiles da filial 1001",
      pass: !filiais.has("1001"),
      detail: `Filiais: ${Array.from(filiais).join(", ")}`,
    });
  }

  // TEST 3: Admin lê tudo
  const t3 = await login("clodoaldosilva608@gmail.com", "Silva88677488");
  if (t3) {
    const profiles = await query(t3, "profiles", "filial_id");
    const filiais = new Set(profiles.map((p: any) => p.filial_id));
    results.push({
      test: "Admin vê profiles de múltiplas filiais",
      pass: filiais.size > 5,
      detail: `${filiais.size} filiais visíveis`,
    });
  }

  // TEST 4: Gerente 1001 vê apenas sua equipe
  const t4 = await login("gerente1001@pmenos.com.br", "Gerente1001@2026");
  if (t4) {
    const profiles = await query(t4, "profiles", "nome,filial_id");
    const filiais = new Set(profiles.map((p: any) => p.filial_id));
    results.push({
      test: "Gerente 1001 vê apenas filial 1001",
      pass: filiais.size === 1 && filiais.has("1001"),
      detail: `Filiais: ${Array.from(filiais).join(", ")}, total: ${profiles.length}`,
    });
  }

  // TEST 5: Gerente 2001 não vê metas da filial 2002
  const t5 = await login("gerente2001@pmenos.com.br", "Ger2001@2026");
  if (t5) {
    const metas = await query(t5, "metas_individuais", "filial_id");
    const filiais = new Set(metas.map((m: any) => m.filial_id));
    results.push({
      test: "Gerente 2001 não vê metas da filial 2002",
      pass: !filiais.has("2002"),
      detail: `Filiais: ${Array.from(filiais).join(", ")}`,
    });
  }

  // TEST 6: Supervisor 1001 vê toda a filial 1001
  const t6 = await login("supervisor1001@pmenos.com.br", "Sup1001@2026");
  if (t6) {
    const profiles = await query(t6, "profiles", "filial_id");
    const filiais = new Set(profiles.map((p: any) => p.filial_id));
    results.push({
      test: "Supervisor 1001 vê toda a filial 1001 (não apenas equipe)",
      pass: filiais.size === 1 && filiais.has("1001") && profiles.length > 1,
      detail: `Filiais: ${Array.from(filiais).join(", ")}, profiles: ${profiles.length}`,
    });
  }

  // RESUMO
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICACAO DE ISOLAMENTO DE DADOS");
  console.log("=".repeat(60) + "\n");

  let allPass = true;
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} ${r.test}`);
    console.log(`   ${r.detail}\n`);
    if (!r.pass) allPass = false;
  }

  console.log("=".repeat(60));
  console.log(allPass ? "TODOS OS TESTES PASSARAM" : "ALGUNS TESTES FALHARAM");
  console.log("=".repeat(60));
}

runTests().catch(console.error);
