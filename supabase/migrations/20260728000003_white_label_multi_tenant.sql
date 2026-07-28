-- =====================================================================
-- Migration: White-Label Multi-Tenant — adiciona company_id nas tabelas
-- =====================================================================
-- Adiciona coluna company_id (text) nas tabelas principais.
-- Quando company_id é NULL, o registro pertence ao tenant padrão (Pague Menos).
-- RLS filtra por company_id: usuário só vê registros da sua empresa.

-- Profiles: qual empresa o usuário pertence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id text;

-- Metas individuais: metas por empresa
ALTER TABLE public.metas_individuais ADD COLUMN IF NOT EXISTS company_id text;

-- Vendas diárias: vendas por empresa
ALTER TABLE public.vendas_diarias ADD COLUMN IF NOT EXISTS company_id text;

-- Campanhas: campanhas por empresa
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS company_id text;

-- Filiais: filiais por empresa
ALTER TABLE public.filiais ADD COLUMN IF NOT EXISTS company_id text;

-- Equipes: equipes por empresa
ALTER TABLE public.equipes ADD COLUMN IF NOT EXISTS company_id text;

-- Login matricula: credenciais por empresa
ALTER TABLE public.login_matricula ADD COLUMN IF NOT EXISTS company_id text;

-- Índices para company_id
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_metas_individuais_company ON public.metas_individuais(company_id);
CREATE INDEX IF NOT EXISTS idx_vendas_diarias_company ON public.vendas_diarias(company_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_company ON public.campanhas(company_id);
CREATE INDEX IF NOT EXISTS idx_filiais_company ON public.filiais(company_id);
CREATE INDEX IF NOT EXISTS idx_equipes_company ON public.equipes(company_id);

-- Definir company_id padrão 'paguemenos' para registros existentes
UPDATE public.profiles SET company_id = 'paguemenos' WHERE company_id IS NULL;
UPDATE public.metas_individuais SET company_id = 'paguemenos' WHERE company_id IS NULL;
UPDATE public.vendas_diarias SET company_id = 'paguemenos' WHERE company_id IS NULL;
UPDATE public.campanhas SET company_id = 'paguemenos' WHERE company_id IS NULL;
UPDATE public.filiais SET company_id = 'paguemenos' WHERE company_id IS NULL;
UPDATE public.equipes SET company_id = 'paguemenos' WHERE company_id IS NULL;
UPDATE public.login_matricula SET company_id = 'paguemenos' WHERE company_id IS NULL;

-- Set default para novos registros
ALTER TABLE public.profiles ALTER COLUMN company_id SET DEFAULT 'paguemenos';
ALTER TABLE public.metas_individuais ALTER COLUMN company_id SET DEFAULT 'paguemenos';
ALTER TABLE public.vendas_diarias ALTER COLUMN company_id SET DEFAULT 'paguemenos';
ALTER TABLE public.campanhas ALTER COLUMN company_id SET DEFAULT 'paguemenos';
ALTER TABLE public.filiais ALTER COLUMN company_id SET DEFAULT 'paguemenos';
ALTER TABLE public.equipes ALTER COLUMN company_id SET DEFAULT 'paguemenos';
ALTER TABLE public.login_matricula ALTER COLUMN company_id SET DEFAULT 'paguemenos';

-- Criar função helper para obter company_id do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS text AS $$
DECLARE
  cid text;
BEGIN
  SELECT company_id INTO cid FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(cid, 'paguemenos');
END;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Atualizar policies de RLS para filtrar por company_id
-- Profiles: usuário vê apenas profiles da sua empresa
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role('admin'::text, auth.uid()));

-- Metas individuais: filtrar por company_id
DROP POLICY IF EXISTS metas_individuais_owner_all ON public.metas_individuais;
CREATE POLICY metas_individuais_owner_all ON public.metas_individuais
  FOR ALL TO authenticated
  USING (
    (usuario_id = auth.uid() OR public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    (usuario_id = auth.uid() OR public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))
    AND company_id = public.get_user_company_id()
  );

-- Vendas diárias: filtrar por company_id
DROP POLICY IF EXISTS vendas_diarias_owner_all ON public.vendas_diarias;
CREATE POLICY vendas_diarias_owner_all ON public.vendas_diarias
  FOR ALL TO authenticated
  USING (
    (usuario_id = auth.uid() OR public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    (usuario_id = auth.uid() OR public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid()))
    AND company_id = public.get_user_company_id()
  );

-- Campanhas: filtrar por company_id
DROP POLICY IF EXISTS campanhas_select_all ON public.campanhas;
CREATE POLICY campanhas_select_all ON public.campanhas
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS campanhas_admin_modify ON public.campanhas;
CREATE POLICY campanhas_admin_modify ON public.campanhas
  FOR ALL TO authenticated
  USING (
    public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid())
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.has_any_role(ARRAY['admin'::text, 'gerente'::text], auth.uid())
    AND company_id = public.get_user_company_id()
  );
