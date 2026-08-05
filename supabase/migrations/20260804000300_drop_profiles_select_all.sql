-- ============================================================
-- Fase 3.2: Dropar profiles_select_all (permissiva demais)
-- Auditoria 2026-08-04, item C5
--
-- PROBLEMA: a migration 20260728000003_white_label_multi_tenant.sql
-- criou a policy profiles_select_all que permite ver TODOS os profiles
-- do mesmo company_id (sem filtro de filial). Esta policy NUNCA foi
-- dropada, derrotando o isolamento por filial adicionado depois.
--
-- Em PostgreSQL, múltiplas policies SELECT são OR'd, então a policy
-- permissiva domina.
--
-- SOLUÇÃO: dropar profiles_select_all. As policies restantes
-- (profiles_select_own_filial, "Users read own profile", "Admins read
-- all profiles") fornecem isolamento adequado.
-- ============================================================

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;

-- Verificar policies restantes em profiles:
-- - profiles_select_own_filial (filtra por filial/equipe)
-- - "Users read own profile" (auth.uid() = id)
-- - "Admins read all profiles" (has_role('admin'))
-- - "Admins update all profiles" (FOR UPDATE)

COMMENT ON POLICY profiles_select_own_filial ON public.profiles IS
  'Substituiu profiles_select_all em 2026-08-04. Filtra por filial/equipe do caller.';
