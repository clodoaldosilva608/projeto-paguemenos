-- =====================================================================
-- Migration: Tabela vendas_diarias
-- Permite que cada vendedor lance suas próprias vendas diárias
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.vendas_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  filial_id text DEFAULT '7537',
  data date NOT NULL,
  categoria text NOT NULL DEFAULT 'faturamento'
    CHECK (categoria IN ('faturamento','marcas_exclusivas','genericos','super_desconto')),
  valor_venda numeric NOT NULL DEFAULT 0,
  qtd_clientes integer NOT NULL DEFAULT 0,
  ticket_medio numeric GENERATED ALWAYS AS (
    CASE WHEN qtd_clientes > 0 THEN valor_venda / qtd_clientes ELSE 0 END
  ) STORED,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  -- Garante 1 lançamento por usuário/dia/categoria
  UNIQUE (usuario_id, data, categoria)
);

CREATE INDEX IF NOT EXISTS idx_vendas_diarias_user_data ON public.vendas_diarias(usuario_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_diarias_filial_data ON public.vendas_diarias(filial_id, data DESC);

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.handle_vendas_diarias_updated()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendas_diarias_updated ON public.vendas_diarias;
CREATE TRIGGER trg_vendas_diarias_updated
  BEFORE UPDATE ON public.vendas_diarias
  FOR EACH ROW EXECUTE FUNCTION public.handle_vendas_diarias_updated();

-- RLS: vendedor vê/edita apenas suas próprias vendas; admin/gerente vê todas
ALTER TABLE public.vendas_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendas_diarias_owner_all ON public.vendas_diarias;
CREATE POLICY vendas_diarias_owner_all ON public.vendas_diarias
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::text) OR public.has_role(auth.uid(), 'gerente'::text))
  WITH CHECK (usuario_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::text) OR public.has_role(auth.uid(), 'gerente'::text));
