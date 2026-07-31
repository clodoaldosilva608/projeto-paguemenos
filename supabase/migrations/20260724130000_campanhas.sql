-- =====================================================================
-- Migration: Tabela campanhas (criação, edição, ativar/desativar)
-- Schema extraído do banco de produção em 27/07/2026
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','ativa','encerrada')),
  data_inicio date,
  data_fim date,
  premio text,
  regras text,
  criado_por uuid,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_status ON public.campanhas(status);

CREATE OR REPLACE FUNCTION public.handle_campanhas_updated()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campanhas_updated ON public.campanhas;
CREATE TRIGGER trg_campanhas_updated
  BEFORE UPDATE ON public.campanhas
  FOR EACH ROW EXECUTE FUNCTION public.handle_campanhas_updated();

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver; apenas admin/gerente pode criar/editar
DROP POLICY IF EXISTS campanhas_select_all ON public.campanhas;
CREATE POLICY campanhas_select_all ON public.campanhas
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS campanhas_admin_modify ON public.campanhas;
CREATE POLICY campanhas_admin_modify ON public.campanhas
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));
