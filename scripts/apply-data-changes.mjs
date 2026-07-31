// apply-data-changes.mjs
// Aplica APENAS as mudanças de dados necessárias para o teste de isolamento
// por equipe_id (item 4.7 da auditoria). As mudanças de schema (criação de
// get_user_equipe_id(), DROP/CREATE policies, ADD COLUMN equipe_id) devem ser
// aplicadas via Dashboard usando os arquivos:
//   - supabase/migrations/20260730130000_unify_has_role.sql
//   - supabase/migrations/20260730130001_isolamento_equipe_id.sql
//
// Uso: node --env-file=.env scripts/apply-data-changes.mjs

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
loadEnv({ path: resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[FATAL] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function main() {
  console.log("=== Aplicando mudanças de dados para teste de isolamento ===\n");

  // 1) Criar equipe eq-1001-noite (filial 1001, turno noite) se não existir
  console.log("1) Criando equipe 'Equipe Turno Noite' (filial 1001, turno noite)...");
  const checkEquipe = await fetch(
    `${SUPABASE_URL}/rest/v1/equipes?select=id,nome,filial_id,turno&filial_id=eq.1001&turno=eq.noite`,
    { headers }
  );
  const existing = await checkEquipe.json();
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`   ✅ Equipe já existe: ${JSON.stringify(existing[0])}`);
  } else {
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/equipes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nome: "Equipe Turno Noite", filial_id: "1001", turno: "noite", ativo: true }),
    });
    if (!insertResp.ok) {
      const t = await insertResp.text();
      console.error(`   ❌ Erro: ${insertResp.status} ${t.slice(0, 300)}`);
      process.exit(1);
    }
    const created = await insertResp.json();
    console.log(`   ✅ Equipe criada: ${JSON.stringify(created[0])}`);
  }

  // 2) Mover joao1001 para equipe_id = 'eq-1001-noite'
  console.log("\n2) Movendo joao1001 para equipe eq-1001-noite...");
  const findJoao = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,nome,email,filial_id,equipe_id&email=eq.joao1001@pmenos.com.br`,
    { headers }
  );
  const joaoRows = await findJoao.json();
  if (!Array.isArray(joaoRows) || joaoRows.length === 0) {
    console.error("   ❌ joao1001 não encontrado");
    process.exit(1);
  }
  const joao = joaoRows[0];
  console.log(`   Antes: ${joao.nome} | filial=${joao.filial_id} | equipe=${joao.equipe_id}`);

  const patchResp = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${joao.id}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ equipe_id: "eq-1001-noite" }),
    }
  );
  if (!patchResp.ok) {
    const t = await patchResp.text();
    console.error(`   ❌ Erro PATCH: ${patchResp.status} ${t.slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`   ✅ Após: joao1001 | filial=1001 | equipe=eq-1001-noite`);

  // 3) Mover vendas_diarias do joao1001 para equipe eq-1001-noite (apenas se a coluna existir)
  console.log("\n3) Atualizando equipe_id nas vendas_diarias do joao1001 (se coluna existir)...");
  const patchVendas = await fetch(
    `${SUPABASE_URL}/rest/v1/vendas_diarias?usuario_id=eq.${joao.id}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ equipe_id: "eq-1001-noite" }),
    }
  );
  if (patchVendas.ok) {
    console.log(`   ✅ Vendas atualizadas (status ${patchVendas.status})`);
  } else {
    const t = await patchVendas.text();
    console.log(`   ⚠️ Vendas não atualizadas: ${patchVendas.status} ${t.slice(0, 200)}`);
    console.log("      (esperado se a coluna equipe_id ainda não foi adicionada —");
    console.log("       aplique a migration 20260730130001_isolamento_equipe_id.sql via Dashboard)");
  }

  // 4) Mover metas_individuais do joao1001 (similar)
  console.log("\n4) Atualizando equipe_id nas metas_individuais do joao1001 (se coluna existir)...");
  const patchMetas = await fetch(
    `${SUPABASE_URL}/rest/v1/metas_individuais?usuario_id=eq.${joao.id}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ equipe_id: "eq-1001-noite" }),
    }
  );
  if (patchMetas.ok) {
    console.log(`   ✅ Metas atualizadas (status ${patchMetas.status})`);
  } else {
    const t = await patchMetas.text();
    console.log(`   ⚠️ Metas não atualizadas: ${patchMetas.status} ${t.slice(0, 200)}`);
  }

  // 5) Verificação final
  console.log("\n5) Verificação final — relendo profiles da filial 1001...");
  const verify = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=nome,email,filial_id,equipe_id&filial_id=eq.1001&order=nome.asc`,
    { headers }
  );
  const profiles = await verify.json();
  if (Array.isArray(profiles)) {
    console.log(`\n   ${profiles.length} profiles na filial 1001:`);
    for (const p of profiles) {
      console.log(`   - ${p.nome} | equipe=${p.equipe_id}`);
    }
  }

  console.log("\n=== Mudanças de dados concluídas ===");
  console.log("\n📌 PRÓXIMO PASSO OBRIGATÓRIO:");
  console.log("   Aplique via Supabase Dashboard → SQL Editor as migrations:");
  console.log("   1. supabase/migrations/20260730130000_unify_has_role.sql");
  console.log("   2. supabase/migrations/20260730130001_isolamento_equipe_id.sql");
  console.log("   Depois rode: bun run src/scripts/verify-isolation.ts");
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e.message);
  process.exit(1);
});
