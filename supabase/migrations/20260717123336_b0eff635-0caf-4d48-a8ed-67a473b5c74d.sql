
-- ================================================================
-- ORION · Schema Auth/RBAC + Convites + Acessos Rápidos
-- ================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'supervisor', 'vendedor');
CREATE TYPE public.invite_status AS ENUM ('pendente', 'aceito', 'expirado', 'revogado');

-- --------- profiles ---------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  iniciais text,
  telefone text,
  cargo text,
  filial_id text,
  equipe_id text,
  avatar_url text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- --------- user_roles ---------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- (Item 6 auditoria 30/07/2026: assinatura canônica has_role(uuid, text).
--  Anteriormente era has_role(uuid, app_role).)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role::app_role
  )
$$;

-- --------- profiles policies ---------
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Non-admins veem colegas da mesma filial (leitura simples)
CREATE POLICY "Same filial can read colleagues" ON public.profiles
  FOR SELECT TO authenticated USING (
    filial_id IS NOT NULL
    AND filial_id = (SELECT p.filial_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- --------- user_roles policies ---------
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- --------- invites ---------
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nome text NOT NULL,
  perfil public.app_role NOT NULL DEFAULT 'vendedor',
  filial_id text,
  equipe_id text,
  cargo text,
  token text NOT NULL UNIQUE,
  status public.invite_status NOT NULL DEFAULT 'pendente',
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  aceito_em timestamptz
);
CREATE INDEX ON public.invites (email);
CREATE INDEX ON public.invites (token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invites" ON public.invites
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Convite pode ser lido publicamente por token (validação no /auth)
GRANT SELECT ON public.invites TO anon;
CREATE POLICY "Anon read invite by token" ON public.invites
  FOR SELECT TO anon USING (true);
CREATE POLICY "Auth read invite by token" ON public.invites
  FOR SELECT TO authenticated USING (true);

-- --------- quick_links ---------
CREATE TABLE public.quick_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  icone text NOT NULL DEFAULT 'link',
  cor text NOT NULL DEFAULT '#25D366',
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  perfis_visiveis public.app_role[] NOT NULL DEFAULT ARRAY['admin','gerente','supervisor','vendedor']::public.app_role[],
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quick_links TO authenticated;
GRANT ALL ON public.quick_links TO service_role;
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read quick_links" ON public.quick_links
  FOR SELECT TO authenticated USING (ativo = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage quick_links" ON public.quick_links
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- --------- trigger de novo usuário ---------
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
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- procura convite pendente para o email
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
  END IF;

  v_iniciais := upper(substring(regexp_replace(v_nome, '\s+', ' ', 'g') from 1 for 1))
             || upper(coalesce(substring(split_part(v_nome, ' ', 2) from 1 for 1), ''));

  INSERT INTO public.profiles (id, nome, email, iniciais, cargo, filial_id, equipe_id)
  VALUES (NEW.id, v_nome, NEW.email, v_iniciais, v_cargo, v_filial, v_equipe);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------- Seed dos funcionários da imagem (como convites pré-aprovados) ---------
INSERT INTO public.invites (email, nome, perfil, filial_id, equipe_id, cargo, token, status, expira_em) VALUES
  ('elielton@orion.com',  'Elielton Silva',    'vendedor', 'f-7537', 'eq-1', 'Vendedor', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days'),
  ('adelino@orion.com',   'Adelino Santos',    'vendedor', 'f-7537', 'eq-1', 'Vendedor', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days'),
  ('mieko@orion.com',     'Mieko Tanaka',      'vendedor', 'f-7537', 'eq-1', 'Vendedor', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days'),
  ('fabio@orion.com',     'Fábio Oliveira',    'vendedor', 'f-7537', 'eq-1', 'Vendedor', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days'),
  ('alicia@orion.com',    'Alícia Ferreira',   'vendedor', 'f-7537', 'eq-1', 'Vendedor', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days'),
  ('clodoaldo@orion.com', 'Clodoaldo Lima',    'vendedor', 'f-7537', 'eq-1', 'Vendedor', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days'),
  ('supervisor@orion.com','Ana Costa',         'supervisor','f-7537','eq-1', 'Supervisora', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days'),
  ('gerente@orion.com',   'Carlos Mendes',     'gerente',  'f-7537', NULL,  'Gerente', encode(gen_random_bytes(24), 'hex'), 'pendente', now() + interval '90 days');

-- Seed de um quick link padrão (WhatsApp) desativado
INSERT INTO public.quick_links (label, url, icone, cor, ativo, ordem)
VALUES ('Grupo WhatsApp da Equipe', 'https://chat.whatsapp.com/', 'message-circle', '#25D366', false, 0);
