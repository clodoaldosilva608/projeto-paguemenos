-- 1) audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  metadata jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text));

CREATE INDEX idx_audit_log_criado_em ON public.audit_log (criado_em DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log (action);
CREATE INDEX idx_audit_log_actor ON public.audit_log (actor_user_id);

-- 2) Seed admin user clodoaldo608@gmail.com (password: 54321)
-- Uses direct auth.users insert; safe with ON CONFLICT.
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'clodoaldo608@gmail.com';
  v_password text := '54321';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(), jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('nome','Clodoaldo Conceição Silva'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id, jsonb_build_object('sub', v_user_id::text, 'email', v_email), 'email', v_user_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, ativo)
  VALUES (v_user_id, 'Clodoaldo Conceição Silva', v_email, 'CC', 'Administrador', true)
  ON CONFLICT (id) DO UPDATE SET ativo = true, nome = EXCLUDED.nome;

  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;