-- ============================================================
-- Kanban: permitir vendedores criarem/editarem boards e cards
-- ============================================================

-- Remover policy antiga (só admin/gerente)
DROP POLICY IF EXISTS boards_modify_admin ON public.boards;

-- Nova policy: qualquer authenticated do tenant pode criar/editar boards
CREATE POLICY boards_modify_tenant ON public.boards
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- Verificação
SELECT 'RLS atualizada: vendedores podem criar boards' AS msg;
