-- =====================================================================
-- Migration retroativa: metas_individuais
-- Schema extraído do banco de produção em 27/07/2026
-- Esta migration documenta o schema existente. Como a tabela já existe
-- no banco, usamos CREATE TABLE IF NOT EXISTS para não quebrar.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.metas_individuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  filial_id text DEFAULT '7537',
  periodo text NOT NULL DEFAULT 'mensal'
    CHECK (periodo IN ('mensal', 'diaria', 'semanal', 'trimestral')),
  categoria text NOT NULL DEFAULT 'faturamento'
    CHECK (categoria IN ('faturamento', 'marcas_exclusivas', 'genericos', 'super_desconto')),
  valor_meta numeric NOT NULL DEFAULT 0,
  valor_realizado numeric NOT NULL DEFAULT 0,
  valor_projecao numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada')),
  observacoes text,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metas_individuais_usuario ON public.metas_individuais(usuario_id, periodo);
CREATE INDEX IF NOT EXISTS idx_metas_individuais_filial ON public.metas_individuais(filial_id, data_inicio);
CREATE INDEX IF NOT EXISTS idx_metas_individuais_categoria ON public.metas_individuais(categoria, periodo);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_metas_individuais_updated()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_metas_individuais_updated ON public.metas_individuais;
CREATE TRIGGER trg_metas_individuais_updated
  BEFORE UPDATE ON public.metas_individuais
  FOR EACH ROW EXECUTE FUNCTION public.handle_metas_individuais_updated();

-- RLS: vendedor vê apenas suas metas; admin/gerente vê todas
ALTER TABLE public.metas_individuais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS metas_individuais_owner_all ON public.metas_individuais;
CREATE POLICY metas_individuais_owner_all ON public.metas_individuais
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]))
  WITH CHECK (usuario_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));
