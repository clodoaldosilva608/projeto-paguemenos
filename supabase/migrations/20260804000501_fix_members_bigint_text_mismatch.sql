-- ============================================================
-- Migration corretiva: Fase 3.4 fix
-- Corrige erro "operator does not exist: bigint = text" em members
--
-- PROBLEMA:
-- - companies.id é BIGINT
-- - members.company_id é BIGINT (FK para companies.id)
-- - filiais.company_id e equipes.company_id são TEXT (slug)
-- - get_user_company_id() retorna TEXT (slug)
--
-- A migration 20260804000500 comparava members.company_id (BIGINT)
-- com get_user_company_id() (TEXT) → erro de tipo.
--
-- SOLUÇÃO:
-- - Para members: usar jwt_company_id() não funciona (retorna slug text).
--   Precisamos buscar o BIGINT do slug via subquery em companies.
--   Ou usar cast: company_id::text = get_user_company_id()
-- - Para filiais/equipes: company_id é text, get_user_company_id() é text → OK.
-- ============================================================

-- Dropar policies incorretas de members (comparação BIGINT = TEXT falha)
DROP POLICY IF EXISTS members_insert_own ON public.members;
DROP POLICY IF EXISTS members_insert_admin ON public.members;
DROP POLICY IF EXISTS members_select_tenant ON public.members;
DROP POLICY IF EXISTS members_update_admin ON public.members;
DROP POLICY IF EXISTS members_delete_admin ON public.members;
DROP POLICY IF EXISTS members_owner_all ON public.members;

-- Helper: retorna company_id (BIGINT) do caller a partir do slug.
-- Fallback: NULL se não encontrado (deny all).
CREATE OR REPLACE FUNCTION public.get_user_company_id_bigint()
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT id FROM public.companies
  WHERE slug = public.get_user_company_id() AND active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_company_id_bigint() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_company_id_bigint() TO authenticated;

-- Recriar policies de members usando get_user_company_id_bigint()
CREATE POLICY members_insert_own ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_uuid = auth.uid()
    AND role = 'member'
    AND company_id = public.get_user_company_id_bigint()
  );

CREATE POLICY members_insert_admin ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id_bigint()
  );

CREATE POLICY members_select_tenant ON public.members
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id_bigint());

CREATE POLICY members_update_admin ON public.members
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id_bigint()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id_bigint()
  );

CREATE POLICY members_delete_admin ON public.members
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id_bigint()
  );

COMMENT ON FUNCTION public.get_user_company_id_bigint() IS
  'Criada em 2026-08-04. Resolve BIGINT vs TEXT mismatch entre members.company_id e get_user_company_id().';
