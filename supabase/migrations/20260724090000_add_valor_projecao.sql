-- =====================================================================
-- Migration: Adiciona coluna valor_projecao na tabela metas_individuais
-- =====================================================================

ALTER TABLE public.metas_individuais
ADD COLUMN IF NOT EXISTS valor_projecao numeric DEFAULT 0;

COMMENT ON COLUMN public.metas_individuais.valor_projecao IS
'Projeção automática de fechamento mensal baseada no ritmo atual de vendas';
