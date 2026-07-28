-- Migration: Tabelas sheets_config e powerbi_tokens
CREATE TABLE IF NOT EXISTS public.sheets_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sheet_url text,
  sheet_name text DEFAULT 'Vendas',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  auto_sync boolean DEFAULT false,
  sync_interval_seconds int DEFAULT 120,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.powerbi_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL,
  escopo text DEFAULT 'proprio',
  expires_at timestamptz,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheets_config_user ON public.sheets_config(user_id);
CREATE INDEX IF NOT EXISTS idx_powerbi_tokens_user ON public.powerbi_tokens(user_id);

ALTER TABLE public.sheets_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.powerbi_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sheets_config_owner ON public.sheets_config;
CREATE POLICY sheets_config_owner ON public.sheets_config
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS powerbi_tokens_owner ON public.powerbi_tokens;
CREATE POLICY powerbi_tokens_owner ON public.powerbi_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
