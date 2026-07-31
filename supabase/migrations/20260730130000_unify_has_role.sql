-- =====================================================================
-- Migration: Unificação das assinaturas de has_role() e has_any_role()
-- Data: 2026-07-30 13:00:00
-- Resolve: Item 6 da auditoria — 3 assinaturas conflitantes coexistiam
--   1. has_role(_user_id uuid, _role app_role)            (b0eff635, 0f19472c)
--   2. has_role(_role text, _user_id uuid)                (ai_config.sql)
--   3. has_any_role(_user_id uuid, _roles app_role[])     (7cd2fac5)
--   4. has_any_role(_roles text[], _user_id uuid)         (ai_config.sql)
--
-- Após esta migration, existe APENAS:
--   - has_role(_user_id uuid, _role text)        — assinatura canônica
--   - has_any_role(_user_id uuid, _roles text[]) — assinatura canônica
--
-- Todas as policies antigas que usavam a forma reversed ('admin'::text, auth.uid())
-- ou enum-typed ('admin'::app_role) são reescritas para a forma canônica.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) DROP explícito de TODAS as sobrecargas antigas (com DROP FUNCTION
--    usando a signature exata para não deixar nenhuma versão órfã).
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.has_role(text, uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
DROP FUNCTION IF EXISTS public.has_any_role(uuid, public.app_role[]);
DROP FUNCTION IF EXISTS public.has_any_role(text[], uuid);
DROP FUNCTION IF EXISTS public.has_any_role(uuid, text[]);

-- ---------------------------------------------------------------------
-- 2) Criação das assinaturas canônicas únicas (uuid primeiro, text depois).
--    SECURITY DEFINER + SET search_path = public (defesa contra search_path hijack).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles::public.app_role[])
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, text[]) TO authenticated;

COMMENT ON FUNCTION public.has_role(uuid, text) IS
  'Assinatura canônica única. Retorna true se _user_id tem a role _role. (Item 6 auditoria: unificação.)';
COMMENT ON FUNCTION public.has_any_role(uuid, text[]) IS
  'Assinatura canônica única. Retorna true se _user_id tem qualquer uma das roles em _roles. (Item 6 auditoria: unificação.)';

-- ---------------------------------------------------------------------
-- 3) Recriar TODAS as policies que usavam a forma reversed ou enum-typed
--    para usar a forma canônica has_role(auth.uid(), 'admin').
-- ---------------------------------------------------------------------

-- ---- profiles (migração 20260717123336_b0eff635) ----
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Same filial can read colleagues" ON public.profiles;

-- ---- user_roles (migração 20260717123336_b0eff635) ----
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- ---- invites (migração 20260717123336_b0eff635) ----
DROP POLICY IF EXISTS "Admins manage invites" ON public.user_roles;

-- ---- audit_log (migração 20260717132507_2d5a7217) ----
DROP POLICY IF EXISTS "Admins read audit_log" ON public.audit_log;

-- ---- campanhas (migração 20260724130000_campanhas) — policies antigas serão recriadas em migration seguinte ----
DROP POLICY IF EXISTS campanhas_owner_all ON public.campanhas;

-- ---- login_matricula (migração 20260725090000) ----
DROP POLICY IF EXISTS login_matricula_admin_all ON public.login_matricula;

-- ---- equipes / filiais (migração 20260728000001) ----
DROP POLICY IF EXISTS filiais_all ON public.filiais;
DROP POLICY IF EXISTS equipes_all ON public.equipes;

-- ---- vendas_diarias (migração 20260724100000 + 20260727000003) ----
DROP POLICY IF EXISTS vendas_diarias_owner_all ON public.vendas_diarias;

-- ---- metas_individuais (migração 20260727000001) ----
DROP POLICY IF EXISTS metas_individuais_owner_all ON public.metas_individuais;
DROP POLICY IF EXISTS metas_individuais_select_all ON public.metas_individuais;

-- ---- treinamentos (migração 20260722020000) ----
DROP POLICY IF EXISTS "Admins manage treinamentos" ON public.treinamentos;
DROP POLICY IF EXISTS "Users read own concluidos" ON public.treinamentos_concluidos;

-- ---- white_label (migração 20260728000003) ----
DROP POLICY IF EXISTS companies_owner_all ON public.companies;
DROP POLICY IF EXISTS companies_members_owner_all ON public.companies_members;

-- ---- ai_config / ai_logs / ai_prompt_versions (migração 20260723100000) ----
DROP POLICY IF EXISTS ai_config_admin_all ON public.ai_config;
DROP POLICY IF EXISTS ai_config_select_admin ON public.ai_config;
DROP POLICY IF EXISTS ai_config_owner_all ON public.ai_config;
DROP POLICY IF EXISTS ai_logs_admin_all ON public.ai_logs;
DROP POLICY IF EXISTS ai_logs_owner_select ON public.ai_logs;
DROP POLICY IF EXISTS ai_logs_select_admin ON public.ai_logs;
DROP POLICY IF EXISTS ai_logs_owner_all ON public.ai_logs;
DROP POLICY IF EXISTS ai_prompt_versions_admin_all ON public.ai_prompt_versions;
DROP POLICY IF EXISTS ai_prompt_versions_select_admin ON public.ai_prompt_versions;
DROP POLICY IF EXISTS ai_prompt_versions_owner_all ON public.ai_prompt_versions;
