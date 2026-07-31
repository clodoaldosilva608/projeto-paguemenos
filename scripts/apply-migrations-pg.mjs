// apply-migrations-pg.mjs
// Aplica migrations SQL diretamente via conexão Postgres.
// Lê DATABASE_URL do .env. Use apenas para migrations (não para uso em runtime).
//
// Uso: node --env-file=.env scripts/apply-migrations-pg.mjs <migration-file.sql> [...]

import fs from "node:fs";
import postgres from "postgres";

// Sem dns.setDefaultResultOrder — deixa o Node resolver naturalmente.

const CONN = process.env.DATABASE_URL;
if (!CONN) {
  console.error("[FATAL] DATABASE_URL precisa estar definida no .env");
  console.error("        Formato: postgresql://postgres:SENHA@host:porta/postgres");
  process.exit(1);
}

const sql = postgres(CONN, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  idle_timeout: 20,
  connect_timeout: 60,
  fetch_types: false,
  prepare: false,
});

async function applyMigration(file) {
  const sqlText = fs.readFileSync(file, "utf8");
  console.log(`\n📋 Aplicando: ${file}`);
  console.log(`   Tamanho: ${sqlText.length} bytes`);

  try {
    // Supabase suporta executar múltiplos statements em uma única query
    // quando prepare: false é setado no postgres.js
    await sql.unsafe(sqlText);
    console.log(`   ✅ Migration aplicada com sucesso`);
  } catch (err) {
    console.error(`   ❌ Erro: ${err.message}`);
    if (err.code) console.error(`      Code: ${err.code}`);
    throw err;
  }
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("Uso: node --env-file=.env scripts/apply-migrations-pg.mjs <migration.sql> [...]");
    process.exit(1);
  }

  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`[FATAL] Arquivo não encontrado: ${f}`);
      process.exit(1);
    }
  }

  for (const f of files) {
    await applyMigration(f);
  }

  console.log("\n=== TODAS MIGRATIONS APLICADAS ===");
  await sql.end();
}

main().catch(async (e) => {
  console.error("\n[FATAL]", e.message);
  try { await sql.end(); } catch {}
  process.exit(1);
});
