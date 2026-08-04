-- ============================================================
-- Fase 3.5: Reescrever handle_new_user_membership
-- Auditoria 2026-08-04, item C3
--
-- PROBLEMA: o trigger handle_new_user_membership lia 'role' do
-- raw_user_meta_data (controlável pelo atacante) e criava membership
-- com essa role. Qualquer usuário podia se auto-promover a admin
-- passando user_metadata.role = 'admin' no signup.
--
-- SOLUÇÃO: reescrever trigger para:
-- 1. Forçar role='member' (ignorar metadata.role)
-- 2. Validar company_id contra convite ativo (futuro)
-- 3. Não atualizar role em ON CONFLICT
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_membership()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_slug TEXT;
  v_company_id BIGINT;
BEGIN
  -- 🔒 Segurança: NUNCA ler role do user_metadata (controlável pelo atacante).
  -- Sempre criar como 'member'. Promoção para admin deve ser manual via admin.
  v_company_slug := NEW.raw_user_meta_data ->> 'company_id';

  IF v_company_slug IS NOT NULL THEN
    SELECT id INTO v_company_id FROM public.companies
    WHERE slug = v_company_slug AND active = true;

    IF v_company_id IS NOT NULL THEN
      -- 🔒 Forçar role='member'. ON CONFLICT DO NOTHING (não atualizar role).
      INSERT INTO public.members (company_id, user_uuid, role)
      VALUES (v_company_id, NEW.id, 'member')
      ON CONFLICT (company_id, user_uuid) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger já existe (criado em migration 20260729000001), só recria a função.
-- O trigger continuará chamando a nova versão da função.

COMMENT ON FUNCTION public.handle_new_user_membership() IS
  'Reescrita em 2026-08-04. Força role=member, ignora user_metadata.role.';
