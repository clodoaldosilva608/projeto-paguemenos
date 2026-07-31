// Popula a tabela login_matricula com os 6 vendedores e suas matrículas.
//
// As credenciais são lidas de variáveis de ambiente (NUNCA hardcoded):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY  (server-only)
//
// Carrega de .env automaticamente.
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
loadEnv({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[FATAL] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env");
  process.exit(1);
}

const credenciais = [
  // Adelino — já inserido no teste
  { user_id: "9d1afa55-6d89-4a3a-8c35-fbaf376c473b", primeiro_nome: "adelino", matricula: "700207473" },
  // Alicia
  { user_id: "62e7d900-6aa7-46e8-a6c2-f3c5a7a7c15f", primeiro_nome: "alicia", matricula: "70211738" },
  // Clodoaldo Conceição
  { user_id: "311bed0a-c557-44b9-beb0-8b5e050ca230", primeiro_nome: "clodoaldo", matricula: "71214306" },
  // Elielton
  { user_id: "9ddaf38e-46f0-4eb6-89b0-d1d014f9abfa", primeiro_nome: "elielton", matricula: "70213458" },
  // Fabio
  { user_id: "de11f4c9-ef62-4fea-8f86-fb0a0d4feb7a", primeiro_nome: "fabio", matricula: "70210130" },
  // Mieko
  { user_id: "9932fb75-9219-4e96-8dde-7ec8bdfa224e", primeiro_nome: "mieko", matricula: "70214316" },
];

async function main() {
  console.log("=== Populando tabela login_matricula com 6 vendedores ===\n");
  let ok = 0, falha = 0;

  for (const c of credenciais) {
    // Verificar se já existe
    const checkResp = await fetch(
      `${SUPABASE_URL}/rest/v1/login_matricula?select=id&user_id=eq.${c.user_id}`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } },
    );
    const checkData = await checkResp.json();
    if (checkData.length > 0) {
      console.log(`  ⚠️  ${c.primeiro_nome} já tem credencial — pulando`);
      continue;
    }

    // Inserir
    const r = await fetch(`${SUPABASE_URL}/rest/v1/login_matricula`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ ...c, ativo: true }),
    });
    if (r.ok) {
      console.log(`  ✅ ${c.primeiro_nome} → matrícula ${c.matricula}`);
      ok++;
    } else {
      const t = await r.text();
      console.log(`  ❌ ${c.primeiro_nome} → ${t.slice(0, 100)}`);
      falha++;
    }
  }

  console.log(`\n=== Resumo: ✅ ${ok} inseridos, ❌ ${falha} falhas ===`);

  // Agora atualizar as senhas dos usuários para suas matrículas (via Admin API)
  console.log("\n=== Definindo matrícula como senha (Admin API) ===\n");
  let senhasOk = 0, senhasFalha = 0;

  for (const c of credenciais) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${c.user_id}`, {
      method: "PUT",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: c.matricula, email_confirm: true }),
    });
    if (r.ok) {
      console.log(`  ✅ ${c.primeiro_nome} → senha definida`);
      senhasOk++;
    } else {
      const t = await r.text();
      console.log(`  ❌ ${c.primeiro_nome} → ${t.slice(0, 100)}`);
      senhasFalha++;
    }
    // Pausa para evitar rate limit
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\n=== Senhas: ✅ ${senhasOk} atualizadas, ❌ ${senhasFalha} falhas ===`);
  console.log("\n🎉 Configuração completa!");
  console.log("\n📋 Credenciais de login dos vendedores:");
  for (const c of credenciais) {
    console.log(`  Login: ${c.primeiro_nome}  |  Senha: ${c.matricula}`);
  }
}

main();
