-- =====================================================================
-- Migration: SaaS Multi-Tenant — companies, members, JWT function, trigger
-- =====================================================================
-- Cria tabelas companies e members, função jwt_company_id() que extrai
-- company_id do JWT com fallback para 'paguemenos', e trigger no auth.users
-- para criar membership automaticamente.
--
-- Compatível com a migration anterior (20260728000003_white_label_multi_tenant.sql)
-- que adicionou company_id text nas tabelas de negócio.
--
-- Estratégia: company_id é TEXT (slug), não bigint. Isso mantém compatibilidade
-- com as policies existentes que comparam company_id = get_user_company_id().
-- A função jwt_company_id() retorna o mesmo TEXT slug.

-- =====================================================================
-- 1. Tabela: companies
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  primary_color TEXT DEFAULT '#1B4F8C',
  secondary_color TEXT DEFAULT '#D64541',
  app_name TEXT DEFAULT 'PagueMenos',
  logo_url TEXT,
  custom_domain TEXT,
  active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insere o tenant padrão PagueMenos se não existir
INSERT INTO public.companies (slug, name, primary_color, secondary_color, app_name)
VALUES ('paguemenos', 'Pague Menos', '#1B4F8C', '#D64541', 'PagueMenos')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- 2. Tabela: members (pivot auth.users ↔ companies)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- admin | gerente | member
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_uuid)
);

CREATE INDEX IF NOT EXISTS idx_members_user ON public.members(user_uuid);
CREATE INDEX IF NOT EXISTS idx_members_company ON public.members(company_id);

-- RLS em members: usuário vê apenas seus próprios memberships
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_select_own ON public.members;
CREATE POLICY members_select_own ON public.members
  FOR SELECT TO authenticated
  USING (user_uuid = auth.uid());

DROP POLICY IF EXISTS members_insert_own ON public.members;
CREATE POLICY members_insert_own ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (user_uuid = auth.uid());

-- =====================================================================
-- 3. Função: jwt_company_id() — extrai company_id do JWT com fallback
-- =====================================================================
-- Retorna o TEXT slug da empresa do usuário logado.
-- Prioridade:
--   1. JWT claim 'company_id' (se Orion setar via custom claims)
--   2. Tabela members (se usuário tem membership)
--   3. profiles.company_id (compatibilidade com migration anterior)
--   4. Fallback: 'paguemenos' (NUNCA retorna NULL — evita lockout)
CREATE OR REPLACE FUNCTION public.jwt_company_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    -- 1. JWT claim (se Orion injetar company_id nos metadados do usuário)
    (auth.jwt() -> 'user_metadata' ->> 'company_id'),
    -- 2. Membership na tabela members
    (
      SELECT c.slug FROM public.companies c
      INNER JOIN public.members m ON m.company_id = c.id
      WHERE m.user_uuid = auth.uid()
      LIMIT 1
    ),
    -- 3. profiles.company_id (compatibilidade)
    (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    ),
    -- 4. Fallback hardcoded — NUNCA retorna NULL
    'paguemenos'
  )
$$;

-- =====================================================================
-- 4. Função: get_tenant_config(slug) — retorna config do tenant
-- =====================================================================
-- Usada pelo middleware/backend para buscar cores, logo, appName
CREATE OR REPLACE FUNCTION public.get_tenant_config(tenant_slug TEXT)
RETURNS TABLE (
  id BIGINT,
  slug TEXT,
  name TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  app_name TEXT,
  logo_url TEXT,
  custom_domain TEXT,
  active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, slug, name, primary_color, secondary_color, app_name, logo_url, custom_domain, active
  FROM public.companies
  WHERE slug = COALESCE(tenant_slug, 'paguemenos')
  LIMIT 1
$$;

-- =====================================================================
-- 5. Trigger: criar membership automaticamente no signup
-- =====================================================================
-- Quando um user é criado no auth.users com user_metadata.company_id,
-- cria membership na tabela members automaticamente.
CREATE OR REPLACE FUNCTION public.handle_new_user_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_slug TEXT;
  v_company_id BIGINT;
  v_role TEXT;
BEGIN
  -- Extrai company_id (slug) dos metadados do usuário
  v_company_slug := NEW.raw_user_meta_data ->> 'company_id';
  v_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'admin');

  -- Se tem company_id nos metadados, cria membership
  IF v_company_slug IS NOT NULL THEN
    SELECT id INTO v_company_id FROM public.companies WHERE slug = v_company_slug AND active = true;
    IF v_company_id IS NOT NULL THEN
      INSERT INTO public.members (company_id, user_uuid, role)
      VALUES (v_company_id, NEW.id, v_role)
      ON CONFLICT (company_id, user_uuid) DO UPDATE SET role = EXCLUDED.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_membership ON auth.users;
CREATE TRIGGER on_auth_user_created_membership
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_membership();

-- =====================================================================
-- 6. Atualiza get_user_company_id() para usar jwt_company_id()
-- =====================================================================
-- Mantém compatibilidade: get_user_company_id() agora delega para jwt_company_id()
DROP FUNCTION IF EXISTS public.get_user_company_id();
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.jwt_company_id();
$$;

-- =====================================================================
-- 7. RLS em companies: leitura pública (para middleware buscar config)
-- =====================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS companies_select_all ON public.companies;
CREATE POLICY companies_select_all ON public.companies
  FOR SELECT TO authenticated, anon
  USING (active = true);

-- =====================================================================
-- 8. Comment
-- =====================================================================
COMMENT ON TABLE public.companies IS 'Tenants (empresas) do SaaS multi-tenant';
COMMENT ON TABLE public.members IS 'Pivot entre auth.users e companies';
COMMENT ON FUNCTION public.jwt_company_id() IS 'Extrai company_id (slug) do JWT com fallback para paguemenos';
COMMENT ON FUNCTION public.get_tenant_config(TEXT) IS 'Retorna config do tenant por slug';
