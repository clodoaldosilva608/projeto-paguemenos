/**
 * TESTE GERAL COMPLETO — Orion / Pague Menos
 * Testa: login, acesso a tabelas, mutações, isolamento, planilha, rotas web
 * 
 * Uso: bun run src/scripts/teste-completo.ts
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY!;
const APP_URL = "https://projeto-paguemenos.vercel.app";

const CREDS = {
  admin:         { email: process.env.TEST_ADMIN_EMAIL,          password: process.env.TEST_ADMIN_PASSWORD },
  gerente1001:   { email: process.env.TEST_GERENTE_1001_EMAIL,   password: process.env.TEST_GERENTE_1001_PASSWORD },
  gerente2001:   { email: process.env.TEST_GERENTE_2001_EMAIL,   password: process.env.TEST_GERENTE_2001_PASSWORD },
  supervisor1001:{ email: process.env.TEST_SUPERVISOR_1001_EMAIL, password: process.env.TEST_SUPERVISOR_1001_PASSWORD },
  vendedor1001:  { email: process.env.TEST_VENDEDOR_1001_EMAIL,  password: process.env.TEST_VENDEDOR_1001_PASSWORD },
  vendedor2002:  { email: process.env.TEST_VENDEDOR_2002_EMAIL,  password: process.env.TEST_VENDEDOR_2002_PASSWORD },
};

type Token = string | null;
type Result = { category: string; name: string; pass: boolean; detail: string };
const results: Result[] = [];

function log(cat: string, name: string, pass: boolean, detail: string) {
  const tag = pass ? "✅" : "❌";
  console.log(`  ${tag} ${name}: ${detail}`);
  results.push({ category: cat, name, pass, detail });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
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

async function api(token: Token, method: string, path: string, body?: unknown) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" || method === "PATCH" ? "return=representation" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  const text = await r.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text.slice(0, 200); } }
  return { status: r.status, data };
}

async function checkUrl(url: string): Promise<number> {
  try {
    const r = await fetch(url, { redirect: "follow" });
    return r.status;
  } catch { return 0; }
}

// ── 1. LOGIN ─────────────────────────────────────────────────────────────────
async function testLogin() {
  console.log("\n" + "=".repeat(70));
  console.log("1. LOGIN DE TODOS OS PERFIS");
  console.log("=".repeat(70));
  const tokens: Record<string, Token> = {};
  for (const [perfil, cred] of Object.entries(CREDS)) {
    const t = await login(cred.email!, cred.password!);
    tokens[perfil] = t;
    log("login", `Login ${perfil}`, !!t, t ? "OK" : "FALHOU");
  }
  return tokens;
}

// ── 2. ACESSO A TABELAS ──────────────────────────────────────────────────────
async function testTableAccess(tokens: Record<string, Token>) {
  console.log("\n" + "=".repeat(70));
  console.log("2. ACESSO A TABELAS (LEITURA)");
  console.log("=".repeat(70));
  const tabelas = [
    "profiles", "vendas_diarias", "metas_individuais", "equipes", "filiais",
    "campanhas", "audit_log", "ai_config", "ai_logs", "user_roles",
    "login_matricula", "treinamentos", "quick_links", "integrations",
  ];
  for (const [perfil, token] of Object.entries(tokens)) {
    if (!token) continue;
    for (const tab of tabelas) {
      const { status, data } = await api(token, "GET", `${tab}?select=*&limit=3`);
      const rows = Array.isArray(data) ? data.length : 0;
      log("leitura", `${perfil} → ${tab}`, status === 200, `${rows} linhas`);
    }
  }
}

// ── 3. ISOLAMENTO ────────────────────────────────────────────────────────────
async function testIsolamento(tokens: Record<string, Token>) {
  console.log("\n" + "=".repeat(70));
  console.log("3. ISOLAMENTO POR FILIAL");
  console.log("=".repeat(70));

  // Vendedor 1001 não vê filial 1002
  if (tokens.vendedor1001) {
    const { data } = await api(tokens.vendedor1001, "GET", "vendas_diarias?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    log("isolamento", "Vendedor 1001 não vê filial 1002", !filiais.includes("1002"), `filiais: ${filiais.join(",")}`);
  }

  // Vendedor 2002 não vê filial 1001
  if (tokens.vendedor2002) {
    const { data } = await api(tokens.vendedor2002, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    log("isolamento", "Vendedor 2002 não vê filial 1001", !filiais.includes("1001"), `filiais: ${filiais.join(",")}`);
  }

  // Gerente 1001 vê TODA a filial 1001 (5+ pessoas)
  if (tokens.gerente1001) {
    const { data } = await api(tokens.gerente1001, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    const total = Array.isArray(data) ? data.length : 0;
    log("isolamento", "Gerente 1001 vê TODA filial 1001", filiais.length === 1 && filiais[0] === "1001" && total >= 5, `${total} pessoas`);
  }

  // Supervisor 1001 vê TODA a filial 1001 (igual gerente)
  if (tokens.supervisor1001) {
    const { data } = await api(tokens.supervisor1001, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    const total = Array.isArray(data) ? data.length : 0;
    log("isolamento", "Supervisor 1001 vê TODA filial 1001", filiais.length === 1 && filiais[0] === "1001" && total >= 5, `${total} pessoas`);
  }

  // Admin vê múltiplas filiais
  if (tokens.admin) {
    const { data } = await api(tokens.admin, "GET", "profiles?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id).filter(Boolean))] : [];
    log("isolamento", "Admin vê 5+ filiais", filiais.length > 5, `${filiais.length} filiais`);
  }

  // Gerente 1001 não vê metas da filial 2001
  if (tokens.gerente1001) {
    const { data } = await api(tokens.gerente1001, "GET", "metas_individuais?select=filial_id&limit=500");
    const filiais = Array.isArray(data) ? [...new Set((data as any[]).map(r => r.filial_id))] : [];
    log("isolamento", "Gerente 1001 não vê metas filial 2001", !filiais.includes("2001"), `filiais: ${filiais.join(",")}`);
  }
}

// ── 4. MUTAÇÕES ──────────────────────────────────────────────────────────────
async function testMutations(tokens: Record<string, Token>) {
  console.log("\n" + "=".repeat(70));
  console.log("4. MUTAÇÕES (CRUD)");
  console.log("=".repeat(70));

  // 4.1 Gerente cria meta
  const adelinoId = "9d1afa55-6d89-4a3a-8c35-fbaf376c473b";
  if (tokens.gerente1001) {
    const { status, data } = await api(tokens.gerente1001, "POST", "metas_individuais", {
      usuario_id: adelinoId, filial_id: "1001", equipe_id: "diurna-7537",
      periodo: "mensal", categoria: "super_desconto", valor_meta: 5000, valor_realizado: 0, valor_projecao: 0,
      data_inicio: "2026-07-01", status: "em_andamento",
    });
    const id = Array.isArray(data) && data[0] ? data[0].id : null;
    log("mutacao", "Gerente cria meta", !!id, `id=${id?.slice(0, 8)}`);
    if (id) {
      // Editar
      const r2 = await api(tokens.gerente1001, "PATCH", `metas_individuais?id=eq.${id}`, { valor_meta: 7500 });
      log("mutacao", "Gerente edita meta", r2.status === 204, `HTTP ${r2.status}`);
      // Excluir
      const r3 = await api(tokens.gerente1001, "DELETE", `metas_individuais?id=eq.${id}`);
      log("mutacao", "Gerente exclui meta", r3.status === 204, `HTTP ${r3.status}`);
    }
  }

  // 4.2 Gerente lança venda
  if (tokens.gerente1001) {
    const hoje = new Date().toISOString().slice(0, 10);
    await api(tokens.gerente1001, "DELETE", `vendas_diarias?usuario_id=eq.${adelinoId}&data=eq.${hoje}&categoria=eq.faturamento`);
    const { status, data } = await api(tokens.gerente1001, "POST", "vendas_diarias", {
      usuario_id: adelinoId, filial_id: "1001", equipe_id: "diurna-7537",
      data: hoje, categoria: "faturamento", valor_venda: 3500, qtd_clientes: 42,
    });
    const id = Array.isArray(data) && data[0] ? data[0].id : null;
    log("mutacao", "Gerente lança venda", !!id, `id=${id?.slice(0, 8)}`);
    if (id) await api(tokens.gerente1001, "DELETE", `vendas_diarias?id=eq.${id}`);
  }

  // 4.3 Gerente cria campanha
  if (tokens.gerente1001) {
    const { status, data } = await api(tokens.gerente1001, "POST", "campanhas", {
      nome: "Teste Auto", status: "rascunho", filial_id: "1001", data_inicio: new Date().toISOString().slice(0, 10),
    });
    const id = Array.isArray(data) && data[0] ? data[0].id : null;
    log("mutacao", "Gerente cria campanha", !!id, `id=${id?.slice(0, 8)}`);
    if (id) await api(tokens.gerente1001, "DELETE", `campanhas?id=eq.${id}`);
  }

  // 4.4 Gerente cria quick_link
  if (tokens.gerente1001) {
    const { status, data } = await api(tokens.gerente1001, "POST", "quick_links", {
      label: "Teste Auto", url: "https://example.com", icone: "link", cor: "#3b82f6",
      ativo: true, ordem: 99, perfis_visiveis: ["admin", "gerente"], categoria: "geral",
    });
    const id = Array.isArray(data) && data[0] ? data[0].id : null;
    log("mutacao", "Gerente cria quick_link", !!id, `id=${id?.slice(0, 8)}`);
    if (id) await api(tokens.gerente1001, "DELETE", `quick_links?id=eq.${id}`);
  }

  // 4.5 Gerente cria integração WhatsApp
  if (tokens.gerente1001) {
    const { status, data } = await api(tokens.gerente1001, "POST", "integrations", {
      nome: "WhatsApp Teste", tipo: "whatsapp", status: "ativo",
      config: { phone: "+5585999999999" }, filial_id: "1001",
      usuario_id: "03c581c9-d15e-42db-9405-2700d5d0b421",
      perfis_autorizados: ["admin", "gerente"], sync_enabled: true, sync_interval_min: 30, ativo: true,
    });
    const id = Array.isArray(data) && data[0] ? data[0].id : null;
    log("mutacao", "Gerente cria integração WhatsApp", !!id, `id=${id?.slice(0, 8)}`);
    if (id) await api(tokens.gerente1001, "DELETE", `integrations?id=eq.${id}`);
  }

  // 4.6 Gerente cria integração Telegram
  if (tokens.gerente1001) {
    const { status, data } = await api(tokens.gerente1001, "POST", "integrations", {
      nome: "Telegram Teste", tipo: "telegram", status: "ativo",
      config: { bot_token: "xxx" }, filial_id: "1001",
      usuario_id: "03c581c9-d15e-42db-9405-2700d5d0b421",
      perfis_autorizados: ["admin", "gerente"], sync_enabled: true, sync_interval_min: 60, ativo: true,
    });
    const id = Array.isArray(data) && data[0] ? data[0].id : null;
    log("mutacao", "Gerente cria integração Telegram", !!id, `id=${id?.slice(0, 8)}`);
    if (id) await api(tokens.gerente1001, "DELETE", `integrations?id=eq.${id}`);
  }

  // 4.7 BLOQUEIO: Vendedor altera perfil de outro
  if (tokens.vendedor1001 && tokens.admin) {
    await api(tokens.vendedor1001, "PATCH", "profiles?id=eq.ac4c051c-4697-44a9-806d-92b37cd1da99", { nome: "HACKED" });
    const { data } = await api(tokens.admin, "GET", "profiles?select=nome&id=eq.ac4c051c-4697-44a9-806d-92b37cd1da99");
    const nome = Array.isArray(data) && data[0] ? data[0].nome : null;
    log("bloqueio", "Vendedor não altera perfil de outro", nome !== "HACKED", `nome: ${nome}`);
  }

  // 4.8 BLOQUEIO: Vendedor cria user_roles
  if (tokens.vendedor1001) {
    const { status } = await api(tokens.vendedor1001, "POST", "user_roles", { user_id: "03c581c9-d15e-42db-9405-2700d5d0b421", role: "admin" });
    log("bloqueio", "Vendedor não cria user_roles", status >= 400, `HTTP ${status}`);
  }

  // 4.9 BLOQUEIO: Supervisor cria user_roles
  if (tokens.supervisor1001) {
    const { status } = await api(tokens.supervisor1001, "POST", "user_roles", { user_id: "03c581c9-d15e-42db-9405-2700d5d0b421", role: "admin" });
    log("bloqueio", "Supervisor não cria user_roles", status >= 400, `HTTP ${status}`);
  }

  // 4.10 LIBERADO: Gerente lê audit_log
  if (tokens.gerente1001) {
    const { status, data } = await api(tokens.gerente1001, "GET", "audit_log?select=id&limit=5");
    log("liberado", "Gerente lê audit_log", status === 200, `${Array.isArray(data) ? data.length : 0} logs`);
  }

  // 4.11 LIBERADO: Gerente lê ai_config
  if (tokens.gerente1001) {
    const { status, data } = await api(tokens.gerente1001, "GET", "ai_config?select=id,provider,model&limit=5");
    log("liberado", "Gerente lê ai_config", status === 200, `${Array.isArray(data) ? data.length : 0} configs`);
  }

  // 4.12 LIBERADO: Admin lê todos user_roles
  if (tokens.admin) {
    const { status, data } = await api(tokens.admin, "GET", "user_roles?select=user_id,role&limit=200");
    log("liberado", "Admin lê todos user_roles", status === 200, `${Array.isArray(data) ? data.length : 0} roles`);
  }
}

// ── 5. PLANILHA INTERNA ──────────────────────────────────────────────────────
async function testPlanilha(tokens: Record<string, Token>) {
  console.log("\n" + "=".repeat(70));
  console.log("5. PLANILHA INTERNA (DADOS DO SUPABASE)");
  console.log("=".repeat(70));

  if (tokens.admin) {
    // Total de vendas no período
    const { data } = await api(tokens.admin, "GET", "vendas_diarias?select=id,filial_id,valor_venda&limit=500");
    const total = Array.isArray(data) ? data.length : 0;
    const soma = Array.isArray(data) ? data.reduce((s, r) => s + Number((r as any).valor_venda || 0), 0) : 0;
    log("planilha", "Vendas no período", total > 0, `${total} lançamentos, R$ ${soma.toFixed(2)}`);

    // Metas
    const { data: metas } = await api(tokens.admin, "GET", "metas_individuais?select=id,categoria,valor_meta&limit=500");
    log("planilha", "Metas cadastradas", Array.isArray(metas) && metas.length > 0, `${Array.isArray(metas) ? metas.length : 0} metas`);

    // Profiles (vendedores)
    const { data: profiles } = await api(tokens.admin, "GET", "profiles?select=id,nome,filial_id&limit=500");
    log("planilha", "Vendedores cadastrados", Array.isArray(profiles) && profiles.length > 0, `${Array.isArray(profiles) ? profiles.length : 0} pessoas`);

    // Filtro por vendedor — selecionar Adelino (id numérico 1)
    const { data: vendasAdelino } = await api(tokens.admin, "GET", "vendas_diarias?select=id&usuario_id=eq.9d1afa55-6d89-4a3a-8c35-fbaf376c473b&limit=500");
    log("planilha", "Filtro por vendedor (Adelino)", Array.isArray(vendasAdelino), `${Array.isArray(vendasAdelino) ? vendasAdelino.length : 0} vendas`);

    // Categorias
    const cats = ["faturamento", "marcas_exclusivas", "genericos", "super_desconto"];
    for (const cat of cats) {
      const { data: catData } = await api(tokens.admin, "GET", `metas_individuais?select=id&categoria=eq.${cat}&limit=500`);
      log("planilha", `Categoria: ${cat}`, Array.isArray(catData), `${Array.isArray(catData) ? catData.length : 0} metas`);
    }
  }
}

// ── 6. ROTAS WEB ─────────────────────────────────────────────────────────────
async function testRoutes() {
  console.log("\n" + "=".repeat(70));
  console.log("6. ROTAS WEB (VERCEL)");
  console.log("=".repeat(70));

  const rotas = [
    { url: `${APP_URL}/`, name: "Landing page" },
    { url: `${APP_URL}/planilha-interna`, name: "Planilha Interna" },
    { url: `${APP_URL}/admin/login`, name: "Admin Login" },
    { url: `${APP_URL}/tv`, name: "TV Mode" },
  ];

  for (const r of rotas) {
    const status = await checkUrl(r.url);
    log("rota", r.name, status === 200, `HTTP ${status}`);
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(70));
  console.log("TESTE GERAL COMPLETO — ORION / PAGUE MENOS");
  console.log("=".repeat(70));

  const tokens = await testLogin();
  await testTableAccess(tokens);
  await testIsolamento(tokens);
  await testMutations(tokens);
  await testPlanilha(tokens);
  await testRoutes();

  // RELATÓRIO FINAL
  console.log("\n" + "=".repeat(70));
  console.log("RELATÓRIO FINAL");
  console.log("=".repeat(70));

  const cats = ["login", "leitura", "isolamento", "mutacao", "bloqueio", "liberado", "planilha", "rota"];
  let totalPass = 0;
  let totalFail = 0;

  for (const cat of cats) {
    const catResults = results.filter(r => r.category === cat);
    if (catResults.length === 0) continue;
    const pass = catResults.filter(r => r.pass).length;
    const fail = catResults.length - pass;
    totalPass += pass;
    totalFail += fail;
    console.log(`  ${cat.toUpperCase()}: ${pass}/${catResults.length} ✅${fail > 0 ? ` | ${fail} ❌` : ""}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log(`  TOTAL: ${totalPass}/${results.length} passaram | ${totalFail} falharam`);
  console.log("=".repeat(70));

  if (totalFail > 0) {
    console.log("\nFALHAS:");
    results.filter(r => !r.pass).forEach(r => console.log(`  ❌ [${r.category}] ${r.name}: ${r.detail}`));
  }
}

main().catch(err => { console.error("Erro fatal:", err); process.exit(2); });
