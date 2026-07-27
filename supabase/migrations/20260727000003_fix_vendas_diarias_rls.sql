-- =====================================================================
-- Migration corretiva: RLS da tabela vendas_diarias
-- A migration original (20260724100000) usava 'user_id' em vez de 'usuario_id'
-- Esta migration recria a policy com o nome correto da coluna.
-- =====================================================================

DROP POLICY IF EXISTS vendas_diarias_owner_all ON public.vendas_diarias;

CREATE POLICY vendas_diarias_owner_all ON public.vendas_diarias
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid() OR public.has_role('admin'::text, auth.uid()) OR public.has_role('gerente'::text, auth.uid()))
  WITH CHECK (usuario_id = auth.uid() OR public.has_role('admin'::text, auth.uid()) OR public.has_role('gerente'::text, auth.uid()));
