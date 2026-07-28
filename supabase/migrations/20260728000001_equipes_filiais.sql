-- =====================================================================
-- Migration: Tabelas equipes e filiais
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.filiais (
  id text PRIMARY KEY,
  nome text NOT NULL,
  endereco text,
  cidade text,
  estado text,
  telefone text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  filial_id text REFERENCES public.filiais(id) ON DELETE SET NULL,
  turno text DEFAULT 'manha' CHECK (turno IN ('manha','tarde','noite','integral')),
  lider_id uuid,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipes_filial ON public.equipes(filial_id);

CREATE OR REPLACE FUNCTION public.handle_equipes_filiais_updated()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_filiais_updated ON public.filiais;
CREATE TRIGGER trg_filiais_updated
  BEFORE UPDATE ON public.filiais
  FOR EACH ROW EXECUTE FUNCTION public.handle_equipes_filiais_updated();

DROP TRIGGER IF EXISTS trg_equipes_updated ON public.equipes;
CREATE TRIGGER trg_equipes_updated
  BEFORE UPDATE ON public.equipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_equipes_filiais_updated();

ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS filiais_all ON public.filiais;
CREATE POLICY filiais_all ON public.filiais
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()));

DROP POLICY IF EXISTS equipes_all ON public.equipes;
CREATE POLICY equipes_all ON public.equipes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()));

-- Seed: Filial 7537
INSERT INTO public.filiais (id, nome, endereco, cidade, estado, ativo)
VALUES ('7537', 'Pague Menos - Filial 7537', 'Av. Principal, 1000', 'São Paulo', 'SP', true)
ON CONFLICT (id) DO NOTHING;

-- Seed: Equipe Turno Manhã
INSERT INTO public.equipes (nome, filial_id, turno, ativo)
VALUES ('Equipe Turno Manhã', '7537', 'manha', true)
ON CONFLICT DO NOTHING;
