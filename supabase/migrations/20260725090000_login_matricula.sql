-- =====================================================================
-- Migration: Login por Matrícula (primeiro_nome + matricula)
-- Permite que vendedores façam login usando primeiro nome + matrícula
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.login_matricula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  primeiro_nome text NOT NULL,
  matricula text NOT NULL,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now(),
  UNIQUE (primeiro_nome, matricula)
);

CREATE INDEX IF NOT EXISTS idx_login_matricula_busca ON public.login_matricula(primeiro_nome, matricula);

CREATE OR REPLACE FUNCTION public.handle_login_matricula_updated()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_login_matricula_updated ON public.login_matricula;
CREATE TRIGGER trg_login_matricula_updated
  BEFORE UPDATE ON public.login_matricula
  FOR EACH ROW EXECUTE FUNCTION public.handle_login_matricula_updated();

ALTER TABLE public.login_matricula ENABLE ROW LEVEL SECURITY;

-- Admin e gerente podem ver/editar todos; vendedor só vê o próprio
DROP POLICY IF EXISTS login_matricula_admin_all ON public.login_matricula;
CREATE POLICY login_matricula_admin_all ON public.login_matricula
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));

DROP POLICY IF EXISTS login_matricula_owner_select ON public.login_matricula;
CREATE POLICY login_matricula_owner_select ON public.login_matricula
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
