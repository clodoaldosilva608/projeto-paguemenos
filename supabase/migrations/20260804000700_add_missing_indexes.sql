-- ============================================================
-- Fase 6.1: Adicionar índices ausentes identificados na auditoria
-- Auditoria 2026-08-04, item M2
--
-- Estes índices são CRÍTICOS para 100k usuários:
-- - profiles.filial_id: usado em TODA policy RLS de vendas/metas/campanhas
-- - audit_log.entity_id: lookup por entidade (atualmente full scan)
-- - vendas_diarias.data: relatórios por período
-- - powerbi_tokens.token: validação de token no endpoint público
-- ============================================================

-- === PROFILES ===
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON public.profiles (lower(email));

CREATE INDEX IF NOT EXISTS idx_profiles_filial_id
  ON public.profiles (filial_id);

CREATE INDEX IF NOT EXISTS idx_profiles_equipe_id
  ON public.profiles (equipe_id);

CREATE INDEX IF NOT EXISTS idx_profiles_company_filial
  ON public.profiles (company_id, filial_id);

-- === AUDIT_LOG ===
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id
  ON public.audit_log (entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_desc
  ON public.audit_log (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user_id
  ON public.audit_log (actor_user_id);

-- === VENDAS_DIARIAS ===
CREATE INDEX IF NOT EXISTS idx_vendas_diarias_data
  ON public.vendas_diarias (data);

CREATE INDEX IF NOT EXISTS idx_vendas_diarias_cat_filial_data
  ON public.vendas_diarias (categoria, filial_id, data);

CREATE INDEX IF NOT EXISTS idx_vendas_diarias_usuario_data
  ON public.vendas_diarias (usuario_id, data DESC);

-- === METAS_INDIVIDUAIS ===
CREATE INDEX IF NOT EXISTS idx_metas_status_periodo
  ON public.metas_individuais (status, periodo);

CREATE INDEX IF NOT EXISTS idx_metas_usuario_periodo
  ON public.metas_individuais (usuario_id, periodo);

-- === POWERBI_TOKENS ===
-- UNIQUE INDEX garante que não haja tokens duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_powerbi_tokens_token
  ON public.powerbi_tokens (token);

CREATE INDEX IF NOT EXISTS idx_powerbi_tokens_active
  ON public.powerbi_tokens (ativo, user_id);

-- === QUICK_LINKS ===
CREATE INDEX IF NOT EXISTS idx_quick_links_active_ordem
  ON public.quick_links (ativo, ordem);

-- === CAMPANHAS ===
CREATE INDEX IF NOT EXISTS idx_campanhas_filial_dates
  ON public.campanhas (filial_id, data_inicio, data_fim);

CREATE INDEX IF NOT EXISTS idx_campanhas_status
  ON public.campanhas (status);

-- === LOGIN_MATRICULA ===
CREATE INDEX IF NOT EXISTS idx_login_matricula_user_id
  ON public.login_matricula (user_id);

-- Já existe unique (primeiro_nome, matricula) — mantém

-- === TREINAMENTOS ===
CREATE INDEX IF NOT EXISTS idx_treinamentos_active_ordem
  ON public.treinamentos (ativo, ordem);

-- === EQUIPES ===
CREATE INDEX IF NOT EXISTS idx_equipes_lider_id
  ON public.equipes (lider_id);

CREATE INDEX IF NOT EXISTS idx_equipes_filial_id
  ON public.equipes (filial_id);

-- === AI_LOGS ===
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at
  ON public.ai_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id
  ON public.ai_logs (user_id);

-- === INVITES ===
CREATE INDEX IF NOT EXISTS idx_invites_email_status
  ON public.invites (email, status);

CREATE INDEX IF NOT EXISTS idx_invites_expira_em
  ON public.invites (expira_em);

-- === MEMBERS ===
-- Já existe unique (company_id, user_uuid) e idx_members_company
-- Adicionar índice em user_uuid para lookup reverso
CREATE INDEX IF NOT EXISTS idx_members_user_uuid
  ON public.members (user_uuid);

COMMENT ON INDEX idx_profiles_filial_id IS
  'Adicionado em 2026-08-04 (Fase 6.1). Crítico para RLS de vendas/metas que filtra por filial_id do caller.';
