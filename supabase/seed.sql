-- ================================================================
-- ORION · Pague Menos — Seed para ambiente local
-- ================================================================
-- Este arquivo é executado automaticamente por `supabase db reset`
-- DEPOIS das migrations. Popula dados de demonstração para testes.
--
-- ⚠️ ATENÇÃO: credenciais abaixo são para AMBIENTE LOCAL apenas.
-- Em produção, crie usuários via painel do Supabase Auth.
-- ================================================================

-- ----------------------------------------------------------------
-- 0) Helpers / variáveis
-- ----------------------------------------------------------------
-- Os IDs de auth.users são fixos para que os profiles referenciem corretamente.
-- Em ambientes locais o Supabase CLI cria auth.users com IDs aleatórios,
-- então fazemos INSERT INTO auth.users diretamente (mesmo padrão da migration 4).

-- ----------------------------------------------------------------
-- 1) Usuários de demonstração (auth.users + profiles + roles)
-- ----------------------------------------------------------------
-- Admin já foi criado pela migration 20260717132507 (clodoaldo608@gmail.com / senha: 54321)
-- Aqui criamos os demais funcionários + gerente + supervisor + vendedores.

DO $$
DECLARE
  v_admin_id uuid;
  v_gerente_id uuid;
  v_supervisor_id uuid;
  v_vend1_id uuid;
  v_vend2_id uuid;
  v_vend3_id uuid;
  v_vend4_id uuid;
  v_vend5_id uuid;
  v_vend6_id uuid;
BEGIN
  -- Pega o ID do admin já criado
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'clodoaldo608@gmail.com';

  ---------------------------------------------------------------
  -- GERENTE
  ---------------------------------------------------------------
  v_gerente_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_gerente_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'gerente@orion.com', crypt('gerente123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Carlos Mendes'),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_gerente_id,
    jsonb_build_object('sub', v_gerente_id::text, 'email', 'gerente@orion.com'),
    'email', v_gerente_id::text, now(), now(), now()
  );

  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_gerente_id, 'Carlos Mendes', 'gerente@orion.com', 'CM', 'Gerente Regional', 'f-7537', NULL, 'ativo', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_gerente_id, 'gerente')
  ON CONFLICT (user_id, role) DO NOTHING;

  ---------------------------------------------------------------
  -- SUPERVISOR
  ---------------------------------------------------------------
  v_supervisor_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_supervisor_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'supervisor@orion.com', crypt('supervisor123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Ana Costa'),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), v_supervisor_id,
    jsonb_build_object('sub', v_supervisor_id::text, 'email', 'supervisor@orion.com'),
    'email', v_supervisor_id::text, now(), now(), now()
  );

  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_supervisor_id, 'Ana Costa', 'supervisor@orion.com', 'AC', 'Supervisora', 'f-7537', 'eq-1', 'ativo', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_supervisor_id, 'supervisor')
  ON CONFLICT (user_id, role) DO NOTHING;

  ---------------------------------------------------------------
  -- VENDEDORES (6) — dados do mockData.ts do projeto
  ---------------------------------------------------------------
  -- 1. Elielton Silva
  v_vend1_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_vend1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'elielton@orion.com', crypt('vendedor123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Elielton Silva'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_vend1_id, jsonb_build_object('sub', v_vend1_id::text, 'email', 'elielton@orion.com'), 'email', v_vend1_id::text, now(), now(), now());
  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_vend1_id, 'Elielton Silva', 'elielton@orion.com', 'ES', 'Vendedor', 'f-7537', 'eq-1', 'ativo', true)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_vend1_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 2. Adelino Santos
  v_vend2_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_vend2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'adelino@orion.com', crypt('vendedor123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Adelino Santos'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_vend2_id, jsonb_build_object('sub', v_vend2_id::text, 'email', 'adelino@orion.com'), 'email', v_vend2_id::text, now(), now(), now());
  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_vend2_id, 'Adelino Santos', 'adelino@orion.com', 'AS', 'Vendedor', 'f-7537', 'eq-1', 'ativo', true)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_vend2_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Mieko Tanaka
  v_vend3_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_vend3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'mieko@orion.com', crypt('vendedor123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Mieko Tanaka'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_vend3_id, jsonb_build_object('sub', v_vend3_id::text, 'email', 'mieko@orion.com'), 'email', v_vend3_id::text, now(), now(), now());
  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_vend3_id, 'Mieko Tanaka', 'mieko@orion.com', 'MT', 'Vendedora', 'f-7537', 'eq-1', 'ativo', true)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_vend3_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 4. Fábio Oliveira
  v_vend4_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_vend4_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'fabio@orion.com', crypt('vendedor123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Fábio Oliveira'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_vend4_id, jsonb_build_object('sub', v_vend4_id::text, 'email', 'fabio@orion.com'), 'email', v_vend4_id::text, now(), now(), now());
  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_vend4_id, 'Fábio Oliveira', 'fabio@orion.com', 'FO', 'Vendedor', 'f-7537', 'eq-1', 'ativo', true)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_vend4_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 5. Alícia Ferreira
  v_vend5_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_vend5_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'alicia@orion.com', crypt('vendedor123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Alícia Ferreira'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_vend5_id, jsonb_build_object('sub', v_vend5_id::text, 'email', 'alicia@orion.com'), 'email', v_vend5_id::text, now(), now(), now());
  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_vend5_id, 'Alícia Ferreira', 'alicia@orion.com', 'AF', 'Vendedora', 'f-7537', 'eq-1', 'ativo', true)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_vend5_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 6. Clodoaldo Lima (vendedor — diferente do admin clodoaldo608@gmail.com)
  v_vend6_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    v_vend6_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'clodoaldo@orion.com', crypt('vendedor123', gen_salt('bf')),
    now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('nome','Clodoaldo Lima'),
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_vend6_id, jsonb_build_object('sub', v_vend6_id::text, 'email', 'clodoaldo@orion.com'), 'email', v_vend6_id::text, now(), now(), now());
  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, ativo)
  VALUES (v_vend6_id, 'Clodoaldo Lima', 'clodoaldo@orion.com', 'CL', 'Vendedor', 'f-7537', 'eq-1', 'ativo', true)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_vend6_id, 'vendedor')
  ON CONFLICT (user_id, role) DO NOTHING;

  ---------------------------------------------------------------
  -- Marca convites existentes como aceitos (foram criados via migration 1)
  ---------------------------------------------------------------
  UPDATE public.invites
    SET status = 'aceito', aceito_em = now()
    WHERE email IN (
      'elielton@orion.com', 'adelino@orion.com', 'mieko@orion.com',
      'fabio@orion.com', 'alicia@orion.com', 'clodoaldo@orion.com',
      'supervisor@orion.com', 'gerente@orion.com'
    ) AND status = 'pendente';

  ---------------------------------------------------------------
  -- Quick links padrão (gerentes/admins podem editar)
  ---------------------------------------------------------------
  INSERT INTO public.quick_links (label, url, icone, cor, ativo, ordem, perfis_visiveis)
  VALUES
    ('Sistema PDV', 'https://pdv.orion.com', 'cash-register', '#2563eb', true, 1, ARRAY['admin','gerente','supervisor']::public.app_role[]),
    ('Grupo WhatsApp da Equipe', 'https://chat.whatsapp.com/orion-team', 'message-circle', '#25D366', true, 2, ARRAY['admin','gerente','supervisor','vendedor']::public.app_role[]),
    ('Portal do Fornecedor', 'https://fornecedor.orion.com', 'truck', '#f59e0b', true, 3, ARRAY['admin','gerente']::public.app_role[]),
    ('Manual de Operações', 'https://wiki.orion.com/manual', 'book-open', '#10b981', true, 4, ARRAY['admin','gerente','supervisor','vendedor']::public.app_role[]),
    ('Solicitar Férias', 'https://rh.orion.com/ferias', 'calendar-off', '#8b5cf6', true, 5, ARRAY['admin','gerente','supervisor','vendedor']::public.app_role[])
  ON CONFLICT DO NOTHING;

  ---------------------------------------------------------------
  -- Log de auditoria — bootstrap do ambiente local
  ---------------------------------------------------------------
  INSERT INTO public.audit_log (actor_user_id, actor_email, action, entity, entity_id, metadata)
  VALUES (
    v_admin_id,
    'clodoaldo608@gmail.com',
    'local_seed.executed',
    'system',
    'local',
    jsonb_build_object(
      'environment', 'local',
      'users_created', 7,
      'quick_links_created', 5,
      'executed_at', now()
    )
  );

END $$;

-- ----------------------------------------------------------------
-- 2) Confere contagem final (rodar manualmente após seed)
-- ----------------------------------------------------------------
-- SELECT 'users' AS tabela, count(*) FROM auth.users
-- UNION ALL SELECT 'profiles', count(*) FROM public.profiles
-- UNION ALL SELECT 'user_roles', count(*) FROM public.user_roles
-- UNION ALL SELECT 'invites', count(*) FROM public.invites
-- UNION ALL SELECT 'quick_links', count(*) FROM public.quick_links
-- UNION ALL SELECT 'audit_log', count(*) FROM public.audit_log;
