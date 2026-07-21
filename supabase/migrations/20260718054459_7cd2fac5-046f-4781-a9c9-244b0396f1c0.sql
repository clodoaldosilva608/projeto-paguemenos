
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS onboarding_completo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS navbar_variant text NOT NULL DEFAULT 'pill';

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Recriar trigger de novo usuário com trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.invites%ROWTYPE;
  v_nome text;
  v_iniciais text;
  v_role public.app_role := 'vendedor';
  v_filial text;
  v_equipe text;
  v_cargo text;
  v_plano text := 'ativo';
  v_trial timestamptz := NULL;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  SELECT * INTO v_invite FROM public.invites
    WHERE lower(email) = lower(NEW.email)
      AND status = 'pendente'
      AND expira_em > now()
    ORDER BY criado_em DESC LIMIT 1;

  IF FOUND THEN
    v_role := v_invite.perfil;
    v_filial := v_invite.filial_id;
    v_equipe := v_invite.equipe_id;
    v_cargo := v_invite.cargo;
    IF v_invite.nome IS NOT NULL AND length(trim(v_invite.nome)) > 0 THEN
      v_nome := v_invite.nome;
    END IF;
    UPDATE public.invites SET status = 'aceito', aceito_em = now() WHERE id = v_invite.id;
  ELSE
    -- Sem convite = trial de 14 dias
    v_plano := 'trial';
    v_trial := now() + interval '14 days';
  END IF;

  v_iniciais := upper(substring(regexp_replace(v_nome, '\s+', ' ', 'g') from 1 for 1))
             || upper(coalesce(substring(split_part(v_nome, ' ', 2) from 1 for 1), ''));

  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id, plano, trial_expires_at)
  VALUES (NEW.id, v_nome, NEW.email, v_iniciais, v_cargo, v_filial, v_equipe, v_plano, v_trial);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Quick links: gerentes podem criar/editar
DROP POLICY IF EXISTS "Gerentes manage quick_links" ON public.quick_links;
CREATE POLICY "Gerentes manage quick_links" ON public.quick_links
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::app_role[]));
