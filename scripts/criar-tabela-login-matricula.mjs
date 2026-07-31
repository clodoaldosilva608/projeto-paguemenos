// Cria a tabela login_matricula via conexão Postgres direta (IPv6 forçado)
//
// A connection string é lida de DATABASE_URL no .env (NUNCA hardcoded).
import dns from "node:dns";
dns.setDefaultResultOrder("ipv6first");
import postgres from "postgres";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

const CONN = process.env.DATABASE_URL;
if (!CONN) {
  console.error("[FATAL] DATABASE_URL precisa estar definida no .env (postgresql://postgres:SENHA@host:porta/postgres)");
  process.exit(1);
}

const sql = postgres(CONN, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  idle_timeout: 20,
  connect_timeout: 60,
  fetch_types: false,
});

async function main() {
  console.log("=== Criando tabela login_matricula via Postgres direto (IPv6) ===\n");

  try {
    const [{ now }] = await sql`SELECT now()`;
    console.log("✅ Conectado:", now);

    console.log("\nCriando tabela...");
    await sql`
      CREATE TABLE IF NOT EXISTS public.login_matricula (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        primeiro_nome text NOT NULL,
        matricula text NOT NULL,
        ativo boolean DEFAULT true,
        criado_em timestamptz DEFAULT now(),
        atualizado_em timestamptz DEFAULT now()
      )
    `;
    console.log("✅ Tabela criada!");

    console.log("\nCriando índice...");
    await sql`CREATE INDEX IF NOT EXISTS idx_login_matricula_busca ON public.login_matricula(primeiro_nome, matricula)`;
    console.log("✅ Índice criado!");

    console.log("\nHabilitando RLS...");
    await sql`ALTER TABLE public.login_matricula ENABLE ROW LEVEL SECURITY`;
    console.log("✅ RLS habilitado!");

    console.log("\nCriando policy admin_all...");
    await sql`
      CREATE POLICY login_matricula_admin_all ON public.login_matricula
      FOR ALL TO authenticated
      USING (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))
      WITH CHECK (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))
    `;
    console.log("✅ Policy admin_all criada!");

    console.log("\nCriando policy owner_select...");
    await sql`
      CREATE POLICY login_matricula_owner_select ON public.login_matricula
      FOR SELECT TO authenticated
      USING (user_id = auth.uid())
    `;
    console.log("✅ Policy owner_select criada!");

    const tabelas = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_matricula'`;
    console.log(`\n✅ Verificação: tabela ${tabelas.length > 0 ? "EXISTE" : "NÃO EXISTE"}`);

    const policies = await sql`SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_matricula'`;
    console.log(`✅ Policies: ${policies.length}`);
    for (const p of policies) console.log(`   - ${p.policyname}`);

    console.log("\n🎉 Tabela login_matricula criada!");
  } catch (e) {
    console.error("❌ Erro:", e.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
