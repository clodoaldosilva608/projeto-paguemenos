-- ============================================================
-- Fase 3.4: Corrigir members_insert_own
-- Auditoria 2026-08-04, item C9
--
-- PROBLEMA: members_insert_own só validava user_uuid = auth.uid(),
-- sem validar company_id nem role. Combinado com o trigger
-- handle_new_user_membership (que lia role do user_metadata), qualquer
-- usuário podia se auto-promover a admin de qualquer empresa.
--
-- SOLUÇÃO: reescrever policy para validar role='member' e company_id
-- do caller. Admin separado pode criar members com qualquer role.
-- ============================================================

DROP POLICY IF EXISTS members_insert_own ON public.members;
DROP POLICY IF EXISTS members_owner_all ON public.members;

-- INSERT: usuário comum só pode criar membership 'member' no próprio tenant
CREATE POLICY members_insert_own ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_uuid = auth.uid()
    AND role = 'member'
    AND company_id = public.get_user_company_id()
  );

-- INSERT: admin pode criar members com qualquer role no próprio tenant
CREATE POLICY members_insert_admin ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id()
  );

-- SELECT: ver members do próprio tenant
CREATE POLICY members_select_tenant ON public.members
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

-- UPDATE: admin pode atualizar members do próprio tenant
CREATE POLICY members_update_admin ON public.members
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id()
  );

-- DELETE: admin pode remover members do próprio tenant
CREATE POLICY members_delete_admin ON public.members
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND company_id = public.get_user_company_id()
  );

COMMENT ON POLICY members_insert_own ON public.members IS
  'Substituiu members_insert_own em 2026-08-04. Valida role=member E company_id do caller.';
