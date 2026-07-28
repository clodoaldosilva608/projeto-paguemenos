import { createServerFn } from "@tanstack/react-start";
import postgres from "postgres";

export const criarTabelasEquipesFiliais = createServerFn({ method: "POST" })
  .handler(async () => {
    const sql = postgres(
      "postgresql://postgres.wfvihysxlzkwwrwobmpv:Silva88677488@aws-0-wfvihysxlzkwwrwobmpv.pooler.supabase.com:6543/postgres",
      { ssl: { rejectUnauthorized: false }, max: 1, idle_timeout: 20, connect_timeout: 30, fetch_types: false },
    );

    const results: string[] = [];
    try {
      await sql`CREATE TABLE IF NOT EXISTS public.filiais (id text PRIMARY KEY, nome text NOT NULL, endereco text, cidade text, estado text, telefone text, ativo boolean DEFAULT true, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())`;
      results.push("✅ Tabela filiais criada");

      await sql`CREATE TABLE IF NOT EXISTS public.equipes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, filial_id text REFERENCES public.filiais(id) ON DELETE SET NULL, turno text DEFAULT 'manha', lider_id uuid, ativo boolean DEFAULT true, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())`;
      results.push("✅ Tabela equipes criada");

      await sql`ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY`;
      results.push("✅ RLS filiais");
      await sql`ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY`;
      results.push("✅ RLS equipes");

      try { await sql`CREATE POLICY filiais_all ON public.filiais FOR ALL TO authenticated USING (true) WITH CHECK (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))`; results.push("✅ Policy filiais"); } catch (e: any) { results.push(`⚠️ Policy filiais: ${e.message}`); }
      try { await sql`CREATE POLICY equipes_all ON public.equipes FOR ALL TO authenticated USING (true) WITH CHECK (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))`; results.push("✅ Policy equipes"); } catch (e: any) { results.push(`⚠️ Policy equipes: ${e.message}`); }

      await sql`INSERT INTO public.filiais (id, nome, endereco, cidade, estado, ativo) VALUES ('7537', 'Pague Menos - Filial 7537', 'Av. Principal, 1000', 'Sao Paulo', 'SP', true) ON CONFLICT (id) DO NOTHING`;
      results.push("✅ Filial 7537");
      await sql`INSERT INTO public.equipes (nome, filial_id, turno, ativo) VALUES ('Equipe Turno Manha', '7537', 'manha', true) ON CONFLICT DO NOTHING`;
      results.push("✅ Equipe Turno Manhã");

      return { ok: true, results };
    } catch (e: any) {
      return { ok: false, error: e.message, results };
    } finally {
      await sql.end();
    }
  });
