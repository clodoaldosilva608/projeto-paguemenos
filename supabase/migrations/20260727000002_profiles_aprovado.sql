-- =====================================================================
-- Migration: Adiciona colunas de aprovação em profiles
-- Schema extraído do banco de produção em 27/07/2026
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aprovado_por uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz;

COMMENT ON COLUMN public.profiles.aprovado IS 'Indica se o usuário foi aprovado pelo admin para acessar o sistema';
COMMENT ON COLUMN public.profiles.aprovado_por IS 'ID do admin que aprovou o usuário';
COMMENT ON COLUMN public.profiles.aprovado_em IS 'Data/hora da aprovação';
