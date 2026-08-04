-- ============================================================
-- Fase 3.3: Reescrever filiais_all e equipes_all com filtro company_id
-- Auditoria 2026-08-04, item A5
--
-- PROBLEMA: filiais_all e equipes_all tinham USING (true), permitindo
-- que qualquer auth visse TODAS as filiais/equipes de TODOS os tenants.
-- A coluna company_id existe mas nenhuma policy a usava.
--
-- SOLUÇÃO: reescrever policies para filtrar por company_id do caller.
-- ============================================================

-- === FILIAIS ===

DROP POLICY IF EXISTS filiais_all ON public.filiais;

-- SELECT: qualquer auth vê apenas as do seu tenant
CREATE POLICY filiais_select_tenant ON public.filiais
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

-- INSERT/UPDATE/DELETE: apenas admin/gerente do mesmo tenant
CREATE POLICY filiais_modify_admin ON public.filiais
  FOR ALL TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
    AND company_id = public.get_user_company_id()
  );

-- === EQUIPES ===

DROP POLICY IF EXISTS equipes_all ON public.equipes;

CREATE POLICY equipes_select_tenant ON public.equipes
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY equipes_modify_admin ON public.equipes
  FOR ALL TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
    AND company_id = public.get_user_company_id()
  );

COMMENT ON POLICY filiais_select_tenant ON public.filiais IS
  'Substituiu filiais_all em 2026-08-04. Filtra por company_id do caller.';

COMMENT ON POLICY equipes_select_tenant ON public.equipes IS
  'Substituiu equipes_all em 2026-08-04. Filtra por company_id do caller.';
