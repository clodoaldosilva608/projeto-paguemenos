-- =====================================================================
-- Migration: Configuração da IA (versão autocontida)
-- Cria tabelas ai_config, ai_logs, ai_prompt_versions + função has_role
-- =====================================================================

-- 0) Função auxiliar has_role (cria se não existir)
-- A coluna role em user_roles é do tipo app_role (enum), por isso precisamos do cast.
CREATE OR REPLACE FUNCTION public.has_role(_role text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = (_role::app_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_roles text[], _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles::app_role[])
  );
$$;

-- 1) Tabela principal de configuração da IA (single-row ativa)
CREATE TABLE IF NOT EXISTS public.ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean NOT NULL DEFAULT true,

  -- Card 3 — Provedor
  provider text NOT NULL DEFAULT 'lovable'
    CHECK (provider IN ('lovable','openai','google','anthropic','azure','openrouter')),

  -- Card 4 — Modelo
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',

  -- URL base do provedor
  base_url text NOT NULL DEFAULT 'https://ai.gateway.lovable.dev/v1/chat/completions',

  -- Link do painel do provedor
  provider_panel_url text NOT NULL DEFAULT 'https://lovable.dev',

  -- Card 2 — Chave da API
  api_key_ciphertext text,

  -- Card 5 — Prompt Mestre (system prompt)
  system_prompt text NOT NULL DEFAULT 'Você é o assistente IA do Orion — plataforma de gestão de metas e vendas para redes de farmácia (Pague Menos). Responda em português do Brasil, seja direto, útil e amigável. Ofereça sugestões práticas para: aumentar ticket médio, atingir metas mensais, motivar equipes, organizar rotina do vendedor, analisar performance por filial e trabalhar campanhas.',

  -- Card 6 — Especialização da IA (assistant prompt)
  assistant_prompt text NOT NULL DEFAULT 'Você é um assistente inteligente especializado em farmácias, gestão farmacêutica, indicadores comerciais, atendimento ao cliente, medicamentos, produtos de saúde, vendas consultivas, metas, estoque, treinamentos, liderança de equipes, gestão operacional e suporte aos colaboradores.

Sempre responda de forma profissional, clara, objetiva e humanizada.

Utilize exclusivamente dados reais existentes no banco de dados da aplicação.

Nunca invente números.

Nunca gere indicadores fictícios.

Nunca apresente exemplos simulados em ambiente de produção.

Caso não existam dados suficientes, informe isso claramente.

Sempre priorize boas práticas farmacêuticas, excelência no atendimento, melhoria contínua e apoio à tomada de decisão.',

  -- Card 7 — Estilo das Respostas
  tom text NOT NULL DEFAULT 'profissional'
    CHECK (tom IN ('profissional','farmaceutico','consultivo','empatico','objetivo','comercial','tecnico','humanizado')),
  nivel_detalhes text NOT NULL DEFAULT 'medio'
    CHECK (nivel_detalhes IN ('baixo','medio','alto')),
  criatividade text NOT NULL DEFAULT 'media'
    CHECK (criatividade IN ('baixa','media','alta')),
  temperature numeric NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  idioma text NOT NULL DEFAULT 'pt-BR',

  -- Card 1 — Status
  status text NOT NULL DEFAULT 'desconectado'
    CHECK (status IN ('conectado','desconectado','erro')),
  last_validation timestamptz,
  last_error text,
  last_tested_by uuid,

  -- Auditoria
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);

-- Garante apenas UMA linha ativa por vez
CREATE UNIQUE INDEX IF NOT EXISTS ai_config_active_singleton
  ON public.ai_config ((true)) WHERE ativo = true;

-- 2) Versionamento de prompts (Card 5 — Histórico)
CREATE TABLE IF NOT EXISTS public.ai_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.ai_config(id) ON DELETE CASCADE,
  system_prompt text NOT NULL,
  assistant_prompt text NOT NULL,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  observacao text
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_config ON public.ai_prompt_versions(config_id, criado_em DESC);

-- 3) Logs de uso da IA (Card 9)
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  pergunta text NOT NULL,
  resposta text,
  tempo_ms integer,
  modelo text,
  provedor text,
  status text NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok','erro','timeout','rate_limit')),
  erro text,
  metadata jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON public.ai_logs(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user ON public.ai_logs(user_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON public.ai_logs(status);

-- 4) Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.handle_ai_config_updated()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_config_updated ON public.ai_config;
CREATE TRIGGER trg_ai_config_updated
  BEFORE UPDATE ON public.ai_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_ai_config_updated();

-- 5) RLS
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- ai_config: apenas admin pode ler/escrever
DROP POLICY IF EXISTS ai_config_admin_all ON public.ai_config;
CREATE POLICY ai_config_admin_all ON public.ai_config
  FOR ALL TO authenticated
  USING (public.has_role('admin'::text, auth.uid()))
  WITH CHECK (public.has_role('admin'::text, auth.uid()));

-- ai_prompt_versions: apenas admin
DROP POLICY IF EXISTS ai_prompt_versions_admin_all ON public.ai_prompt_versions;
CREATE POLICY ai_prompt_versions_admin_all ON public.ai_prompt_versions
  FOR ALL TO authenticated
  USING (public.has_role('admin'::text, auth.uid()))
  WITH CHECK (public.has_role('admin'::text, auth.uid()));

-- ai_logs: admin vê todos, usuário comum vê apenas os próprios
DROP POLICY IF EXISTS ai_logs_admin_all ON public.ai_logs;
CREATE POLICY ai_logs_admin_all ON public.ai_logs
  FOR ALL TO authenticated
  USING (public.has_role('admin'::text, auth.uid()))
  WITH CHECK (public.has_role('admin'::text, auth.uid()));

DROP POLICY IF EXISTS ai_logs_owner_select ON public.ai_logs;
CREATE POLICY ai_logs_owner_select ON public.ai_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6) Seed inicial: linha ativa padrão
INSERT INTO public.ai_config (ativo, provider, model)
VALUES (true, 'lovable', 'google/gemini-2.5-flash')
ON CONFLICT DO NOTHING;
