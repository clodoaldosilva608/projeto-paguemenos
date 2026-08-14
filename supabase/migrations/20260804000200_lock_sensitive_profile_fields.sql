-- ============================================================
-- Fase 3.1: Bloquear auto-alteração de campos sensíveis em profiles
-- Auditoria 2026-08-04, item C4
--
-- PROBLEMA: a policy "Users update own profile" permite que o usuário
-- altere QUALQUER coluna do próprio profile, incluindo filial_id,
-- equipe_id, company_id, plano, aprovado — controladores de isolamento
-- e cobrança.
--
-- SOLUÇÃO: trigger BEFORE UPDATE que bloqueia alteração desses campos
-- por não-admins.
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_sensitive_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Se a chamada vem de service_role (bypassa RLS), permitir
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Verificar se o caller é admin
  SELECT public.has_role(auth.uid(), 'admin') INTO v_is_admin;

  -- Campos sensíveis que só admin pode alterar
  IF NOT v_is_admin THEN
    IF NEW.filial_id IS DISTINCT FROM OLD.filial_id THEN
      RAISE EXCEPTION 'Não permitido alterar filial_id';
    END IF;
    IF NEW.equipe_id IS DISTINCT FROM OLD.equipe_id THEN
      RAISE EXCEPTION 'Não permitido alterar equipe_id';
    END IF;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Não permitido alterar company_id';
    END IF;
    IF NEW.aprovado IS DISTINCT FROM OLD.aprovado THEN
      RAISE EXCEPTION 'Não permitido alterar aprovado';
    END IF;
    -- plano e trial_expires_at se existirem
    IF NEW.plano IS DISTINCT FROM OLD.plano THEN
      RAISE EXCEPTION 'Não permitido alterar plano';
    END IF;
    IF NEW.trial_expires_at IS DISTINCT FROM OLD.trial_expires_at THEN
      RAISE EXCEPTION 'Não permitido alterar trial_expires_at';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_sensitive_profile ON public.profiles;
CREATE TRIGGER trg_guard_sensitive_profile
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_sensitive_profile_fields();

-- Garantir permissão de execução
REVOKE ALL ON FUNCTION public.guard_sensitive_profile_fields() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_sensitive_profile_fields() TO authenticated;
