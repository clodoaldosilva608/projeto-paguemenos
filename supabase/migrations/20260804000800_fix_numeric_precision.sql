-- ============================================================
-- Fase 6.2: Corrigir tipos numeric para numeric(14,2)
-- Auditoria 2026-08-04, item M1
--
-- PROBLEMA: colunas monetárias usavam numeric sem precisão, permitindo
-- centavos fracionários (ex: 100.00000001) que se propagam em agregações.
--
-- SOLUÇÃO: converter para numeric(14,2) — suporta até 999 trilhões
-- com 2 casas decimais (suficiente para BRL).
--
-- ATENÇÃO: rodar em janela de baixo tráfego (madrugada).
-- ALTER TYPE pode lockar a tabela brevemente.
-- ============================================================

-- === VENDAS_DIARIAS ===
ALTER TABLE public.vendas_diarias
  ALTER COLUMN valor_venda TYPE numeric(14,2)
  USING valor_venda::numeric(14,2);

-- === METAS_INDIVIDUAIS ===
ALTER TABLE public.metas_individuais
  ALTER COLUMN valor_meta TYPE numeric(14,2)
  USING valor_meta::numeric(14,2);

ALTER TABLE public.metas_individuais
  ALTER COLUMN valor_realizado TYPE numeric(14,2)
  USING valor_realizado::numeric(14,2);

ALTER TABLE public.metas_individuais
  ALTER COLUMN valor_projecao TYPE numeric(14,2)
  USING valor_projecao::numeric(14,2);

-- === VENDAS_DIARIAS.ticket_medio (se existir) ===
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vendas_diarias'
      AND column_name = 'ticket_medio'
  ) THEN
    ALTER TABLE public.vendas_diarias
      ALTER COLUMN ticket_medio TYPE numeric(14,2)
      USING ticket_medio::numeric(14,2);
  END IF;
END $$;

COMMENT ON COLUMN public.vendas_diarias.valor_venda IS
  'Tipo alterado para numeric(14,2) em 2026-08-04 (Fase 6.2). Antes era numeric sem precisão.';
