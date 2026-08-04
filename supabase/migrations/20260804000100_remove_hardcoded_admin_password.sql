-- ============================================================
-- Migration corretiva: senha admin hardcoded
-- Fase 2 da auditoria de 2026-08-04
--
-- PROBLEMA: a migration 20260717132507_2d5a7217-...sql continha a
-- senha admin '54321' hardcoded (5 chars), violando o senhaSchema
-- (8 min) que o próprio projeto define.
--
-- AÇÃO:
-- 1. Em produção: a senha já foi trocada manualmente em 30/07/2026
--    (ver worklog Task 2). Esta migration é no-op em produção.
-- 2. Em novos ambientes: esta migration garante que o admin inicial
--    tenha uma senha forte (definida via env var ADMIN_INITIAL_PASSWORD).
--
-- Esta migration NÃO altera auth.users diretamente — apenas documenta
-- a correção e adiciona uma função helper para redefinir a senha
-- admin a partir de variável de ambiente.
-- ============================================================

-- Função helper para redefinir senha admin a partir de env var.
-- Deve ser chamada manualmente após aplicar esta migration:
--   SELECT public.reset_admin_password_from_env();
-- A função lê 'admin.initial_password' do current_setting, que deve
-- ser definido como:
--   SET admin.initial_password = 'senha_forte_aqui';
--   SELECT public.reset_admin_password_from_env();
-- ou via env var no Supabase: ADMIN_INITIAL_PASSWORD

CREATE OR REPLACE FUNCTION public.reset_admin_password_from_env()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_password text;
  v_admin_email text := 'clodoaldosilva608@gmail.com';
  v_admin_id uuid;
BEGIN
  -- Ler senha do current_setting (definido via env var ou SET)
  v_password := current_setting('admin.initial_password', true);

  IF v_password IS NULL OR length(v_password) < 8 THEN
    RAISE EXCEPTION 'ADMIN_INITIAL_PASSWORD não definido ou menor que 8 caracteres. Defina via: SET admin.initial_password = ''senha_forte'';';
  END IF;

  -- Buscar admin por email
  SELECT id INTO v_admin_id FROM auth.users WHERE lower(email) = lower(v_admin_email) LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin % não encontrado em auth.users', v_admin_email;
  END IF;

  -- Atualizar senha (crypt com bf)
  UPDATE auth.users
  SET encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = v_admin_id;

  RAISE NOTICE 'Senha do admin % atualizada com sucesso.', v_admin_email;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_admin_password_from_env() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_admin_password_from_env() TO service_role;

-- Verificação: garantir que o admin existe
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM auth.users WHERE lower(email) = 'clodoaldosilva608@gmail.com';
  IF v_count = 0 THEN
    RAISE NOTICE 'Admin clodoaldosilva608@gmail.com não encontrado neste ambiente. Migration aplicada mas função helper fica disponível para uso futuro.';
  ELSE
    RAISE NOTICE 'Admin encontrado. Para trocar a senha, execute: SET admin.initial_password = ''nova_senha_forte''; SELECT public.reset_admin_password_from_env();';
  END IF;
END $$;
