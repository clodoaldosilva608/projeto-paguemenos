-- Migration: Isolamento por filial_id em todas as tabelas de dados
-- Garante que usuários só vejam dados da sua própria filial
-- Admin master bypassa (service role) e gerente/supervisor veem apenas sua filial

-- =====================================================================
-- Função helper: get_user_filial_id() — retorna filial_id do usuário logado
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_user_filial_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT filial_id FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_filial_id() IS 'Retorna filial_id do usuário logado. NULL se não tem filial atribuída.';

-- =====================================================================
-- PROFILES: usuário vê apenas colegas da mesma filial (ou a si mesmo)
-- =====================================================================
DROP POLICY IF EXISTS profiles_select_own_filial ON public.profiles;
CREATE POLICY profiles_select_own_filial ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()  -- pode ver a si mesmo
    OR public.get_user_filial_id() IS NULL  -- sem filial (admin master) vê todos
    OR filial_id = public.get_user_filial_id()  -- vê apenas colegas da mesma filial
    OR public.has_role('admin'::text, auth.uid())  -- admin vê todos
  );

-- =====================================================================
-- VENDAS_DIARIAS: usuário vê apenas vendas da sua filial
-- =====================================================================
DROP POLICY IF EXISTS vendas_diarias_owner_all ON public.vendas_diarias;
CREATE POLICY vendas_diarias_owner_all ON public.vendas_diarias
  FOR ALL TO authenticated
  USING (
    -- Dono vê suas próprias vendas
    usuario_id = auth.uid()
    -- Admin vê tudo
    OR public.has_role('admin'::text, auth.uid())
    -- Gerente/supervisor vê apenas vendas da SUA filial
    OR (
      public.has_any_role(ARRAY['gerente'::text, 'supervisor'::text], auth.uid())
      AND filial_id = public.get_user_filial_id()
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid())
  );

-- =====================================================================
-- METAS_INDIVUAIS: usuário vê apenas metas da sua filial
-- =====================================================================
DROP POLICY IF EXISTS metas_individuais_select_all ON public.metas_individuais;
CREATE POLICY metas_individuais_select_all ON public.metas_individuais
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.has_role('admin'::text, auth.uid())
    OR (
      public.has_any_role(ARRAY['gerente'::text, 'supervisor'::text], auth.uid())
      AND filial_id = public.get_user_filial_id()
    )
  );

DROP POLICY IF EXISTS metas_individuais_owner_all ON public.metas_individuais;
CREATE POLICY metas_individuais_owner_all ON public.metas_individuais
  FOR ALL TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.has_role('admin'::text, auth.uid())
    OR (
      public.has_any_role(ARRAY['gerente'::text, 'supervisor'::text], auth.uid())
      AND filial_id = public.get_user_filial_id()
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid())
  );

-- =====================================================================
-- CAMPANHAS: filtrar por filial_id (se a coluna existir)
-- =====================================================================
-- Campanhas podem ser globais (filial_id IS NULL) ou por filial
DROP POLICY IF EXISTS campanhas_select_filial ON public.campanhas;
CREATE POLICY campanhas_select_filial ON public.campanhas
  FOR SELECT TO authenticated
  USING (
    -- Campanhas globais (sem filial) são visíveis para todos
    filial_id IS NULL
    OR public.has_role('admin'::text, auth.uid())
    OR filial_id = public.get_user_filial_id()
  );

-- =====================================================================
-- LOGIN_MATRICULA: apenas admin vê todas, gerente vê da sua filial
-- =====================================================================
DROP POLICY IF EXISTS login_matricula_admin_all ON public.login_matricula;
CREATE POLICY login_matricula_admin_all ON public.login_matricula
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()  -- vê a própria credencial
    OR public.has_role('admin'::text, auth.uid())  -- admin vê todas
    OR (
      public.has_any_role(ARRAY['gerente'::text, 'supervisor'::text], auth.uid())
      AND user_id IN (
        SELECT id FROM public.profiles WHERE filial_id = public.get_user_filial_id()
      )
    )
  );

-- =====================================================================
-- Comentários
-- =====================================================================
COMMENT ON POLICY profiles_select_own_filial IS 'Usuário vê apenas perfis da sua filial (ou a si mesmo). Admin vê todos.';
COMMENT ON POLICY vendas_diarias_owner_all IS 'Vendas isoladas por filial. Gerente/supervisor vê apenas vendas da sua filial.';
COMMENT ON POLICY metas_individuais_owner_all IS 'Metas isoladas por filial. Gerente/supervisor vê apenas metas da sua filial.';
