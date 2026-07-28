import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/api-criar-tabelas")({
  component: CriarTabelasPage,
});

const SQL_STATEMENTS = [
  "CREATE TABLE public.filiais (id text PRIMARY KEY, nome text NOT NULL, endereco text, cidade text, estado text, telefone text, ativo boolean DEFAULT true, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())",
  "CREATE TABLE public.equipes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, filial_id text REFERENCES public.filiais(id) ON DELETE SET NULL, turno text DEFAULT 'manha', lider_id uuid, ativo boolean DEFAULT true, criado_em timestamptz DEFAULT now(), atualizado_em timestamptz DEFAULT now())",
  "ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY",
  "ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY",
  "CREATE POLICY filiais_all ON public.filiais FOR ALL TO authenticated USING (true) WITH CHECK (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))",
  "CREATE POLICY equipes_all ON public.equipes FOR ALL TO authenticated USING (true) WITH CHECK (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))",
  "INSERT INTO public.filiais (id, nome, endereco, cidade, estado, ativo) VALUES ('7537', 'Pague Menos - Filial 7537', 'Av. Principal, 1000', 'Sao Paulo', 'SP', true) ON CONFLICT (id) DO NOTHING",
  "INSERT INTO public.equipes (nome, filial_id, turno, ativo) VALUES ('Equipe Turno Manha', '7537', 'manha', true) ON CONFLICT DO NOTHING",
];

function CriarTabelasPage() {
  const [copiado, setCopiado] = useState<number | null>(null);

  function copiar(i: number) {
    navigator.clipboard.writeText(SQL_STATEMENTS[i] + ";");
    setCopiado(i);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-xl font-bold">📋 SQL para criar tabelas Equipes e Filiais</h1>
        <p className="mb-4 text-sm text-slate-400">
          Copie cada comando abaixo (um por vez) e cole no{" "}
          <a href="https://supabase.com/dashboard/project/wfvihysxlzkwwrwobmpv/sql/new" target="_blank" rel="noreferrer" className="text-blue-400 underline">
            Supabase Studio → SQL Editor
          </a>{" "}
          → clique Run.
        </p>
        <div className="space-y-3">
          {SQL_STATEMENTS.map((sql, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="text-xs font-bold uppercase text-slate-400">Passo {i + 1}</span>
                <button
                  onClick={() => copiar(i)}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500"
                >
                  {copiado === i ? "✅ Copiado!" : "📋 Copiar"}
                </button>
              </div>
              <pre className="overflow-x-auto p-3 text-xs text-slate-300">
                <code>{sql};</code>
              </pre>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          ✅ Após aplicar todos os 8 passos, as páginas de <strong>Equipes</strong> e <strong>Filiais</strong> no Orion
          estarão funcionais com a Filial 7537 e a Equipe Turno Manhã já cadastradas.
        </div>
      </div>
    </div>
  );
}
