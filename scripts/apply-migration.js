#!/usr/bin/env node
/**
 * Script para aplicar migrations do Supabase via REST API.
 * 
 * Usa o endpoint /rest/v1/rpc com uma função temporária para executar SQL.
 * Como fallback, tenta criar a função exec_sql via service role.
 * 
 * Uso: node scripts/apply-migration.js <migration-file.sql>
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wfvihysxlzkwwrwobmpv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_HetybEr5FvTi8aabdMS0Lg_7ihJjxOg';

async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Uso: node scripts/apply-migration.js <migration-file.sql>');
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf8');
  console.log(`📋 Aplicando migration: ${migrationFile}`);
  console.log(`   Tamanho: ${sql.length} bytes\n`);

  // Tentar criar função exec_sql temporária e executar
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION public._exec_sql(sql_text TEXT)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_text;
    END;
    $$;
  `;

  // Primeiro tenta criar a função via endpoint SQL
  console.log('1. Criando função temporária _exec_sql...');
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql_text: createFnSQL }),
    });
    
    if (!resp.ok) {
      console.log(`   ⚠️ Não foi possível criar via RPC (esperado).`);
      console.log(`   → Você precisa aplicar a migration manualmente no Supabase Dashboard:`);
      console.log(`     1. Acesse: https://supabase.com/dashboard/project/wfvihysxlzkwwrwobmpv/sql/new`);
      console.log(`     2. Cole o conteúdo do arquivo: ${migrationFile}`);
      console.log(`     3. Clique em "Run"`);
      console.log(`\n📄 Conteúdo da migration:\n`);
      console.log(sql);
      return;
    }
    
    console.log('   ✓ Função criada');
    
    // Agora executar a migration
    console.log('2. Executando migration...');
    const resp2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql_text: sql }),
    });
    
    if (resp2.ok) {
      console.log('   ✓ Migration aplicada com sucesso!');
    } else {
      const err = await resp2.text();
      console.error('   ❌ Erro:', err);
    }
    
    // Limpar função temporária
    console.log('3. Limpando função temporária...');
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/_exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql_text: 'DROP FUNCTION IF EXISTS public._exec_sql(TEXT);' }),
    });
    console.log('   ✓ Limpo');
    
  } catch (e) {
    console.error('❌ Erro:', e.message);
  }
}

main();
