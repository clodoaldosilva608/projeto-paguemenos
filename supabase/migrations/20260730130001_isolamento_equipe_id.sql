-- =====================================================================
-- Migration: Isolamento por equipe_id + fix da policy profiles_select_own_filial
-- Data: 2026-07-30 13:01:00
--
-- Resolve:
--   Item 3 [ALTO] — Remove "OR public.get_user_filial_id() IS NULL" da
--                   policy profiles_select_own_filial (permitia acesso
--                   total a usuários sem filial_id atribuída).
--   Item 4 [ALTO] — Implementa de fato o isolamento por equipe_id:
--                   - Cria get_user_equipe_id()
--                   - Adiciona equipe_id em vendas_diarias e metas_individuais
--                   - Ajusta policies: gerente filtra por equipe_id,
--                     supervisor continua vendo filial inteira
--                   - Cria uma segunda equipe (eq-1001-noite) na filial 1001
--                     para que o teste de isolamento seja significativo
--
-- Esta migration assume que a migration 20260730130000_unify_has_role.sql
-- já foi aplicada (para que as chamadas has_role usem a assinatura canônica).
-- =====================================================================

-- ---------------------------------------------------------------------
-- ITEM 4.1: Função get_user_equipe_id() — análoga a get_user_filial_id()
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_equipe_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT equipe_id FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_equipe_id() IS
  'Retorna equipe_id do usuário logado. NULL se não tem equipe atribuída. (Item 4 auditoria.)';

REVOKE EXECUTE ON FUNCTION public.get_user_equipe_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_equipe_id() TO authenticated;

-- ---------------------------------------------------------------------
-- ITEM 4.2: Adiciona coluna equipe_id em vendas_diarias e metas_individuais
--           (retro-compatível: preenche com eq-{filial_id} quando NULL)
-- ---------------------------------------------------------------------
ALTER TABLE public.vendas_diarias ADD COLUMN IF NOT EXISTS equipe_id text;
ALTER TABLE public.metas_individuais ADD COLUMN IF NOT EXISTS equipe_id text;

-- Backfill: se equipe_id for NULL, deriva do filial_id (formato eq-{filial_id})
UPDATE public.vendas_diarias
  SET equipe_id = 'eq-' || filial_id
  WHERE equipe_id IS NULL AND filial_id IS NOT NULL;

UPDATE public.metas_individuais
  SET equipe_id = 'eq-' || filial_id
  WHERE equipe_id IS NULL AND filial_id IS NOT NULL;

-- Trigger para preencher equipe_id automaticamente em novas inserções
CREATE OR REPLACE FUNCTION public.set_equipe_id_from_user()
RETURNS trigger AS $$
DECLARE
  v_equipe text;
BEGIN
  IF NEW.equipe_id IS NULL AND NEW.usuario_id IS NOT NULL THEN
    SELECT equipe_id INTO v_equipe FROM public.profiles WHERE id = NEW.usuario_id;
    IF v_equipe IS NOT NULL THEN
      NEW.equipe_id := v_equipe;
    ELSIF NEW.filial_id IS NOT NULL THEN
      NEW.equipe_id := 'eq-' || NEW.filial_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendas_diarias_set_equipe ON public.vendas_diarias;
CREATE TRIGGER trg_vendas_diarias_set_equipe
  BEFORE INSERT ON public.vendas_diarias
  FOR EACH ROW EXECUTE FUNCTION public.set_equipe_id_from_user();

DROP TRIGGER IF EXISTS trg_metas_individuais_set_equipe ON public.metas_individuais;
CREATE TRIGGER trg_metas_individuais_set_equipe
  BEFORE INSERT ON public.metas_individuais
  FOR EACH ROW EXECUTE FUNCTION public.set_equipe_id_from_user();

CREATE INDEX IF NOT EXISTS idx_vendas_diarias_equipe ON public.vendas_diarias(equipe_id);
CREATE INDEX IF NOT EXISTS idx_metas_individuais_equipe ON public.metas_individuais(equipe_id);

-- ---------------------------------------------------------------------
-- ITEM 3: PROFILES — remove "OR public.get_user_filial_id() IS NULL"
--         Um usuário sem filial_id NÃO vê mais todos os perfis.
--         Apenas admin (via user_roles) vê todos.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own_filial ON public.profiles;
CREATE POLICY profiles_select_own_filial ON public.profiles
  FOR SELECT TO authenticated
  USING (
    -- Pode ver a si mesmo
    id = auth.uid()
    -- Admin vê todos (via user_roles — não mais via filial_id IS NULL)
    OR public.has_role(auth.uid(), 'admin'::text)
    -- Vê apenas colegas da mesma filial
    OR (
      public.get_user_filial_id() IS NOT NULL
      AND filial_id = public.get_user_filial_id()
    )
  );

COMMENT ON POLICY profiles_select_own_filial IS
  'Usuário vê apenas perfis da sua filial (ou a si mesmo). Admin vê todos via user_roles. Item 3 auditoria: removido o bypass "filial_id IS NULL" que permitia acesso total.';

-- ---------------------------------------------------------------------
-- ITEM 4.3: VENDAS_DIARIAS — gerente filtra por equipe_id,
--           supervisor vê filial inteira, vendedor vê só suas vendas
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS vendas_diarias_owner_all ON public.vendas_diarias;
CREATE POLICY vendas_diarias_owner_all ON public.vendas_diarias
  FOR ALL TO authenticated
  USING (
    -- Vendedor/farmacêutica vê apenas suas próprias vendas
    usuario_id = auth.uid()
    -- Admin vê tudo
    OR public.has_role(auth.uid(), 'admin'::text)
    -- Supervisor vê TODA a filial (não filtra por equipe)
    OR (
      public.has_role(auth.uid(), 'supervisor'::text)
      AND filial_id = public.get_user_filial_id()
    )
    -- Gerente vê apenas vendas da SUA equipe (não toda a filial)
    OR (
      public.has_role(auth.uid(), 'gerente'::text)
      AND equipe_id = public.get_user_equipe_id()
    )
  )
  WITH CHECK (
    -- Dono pode inserir/editar suas próprias vendas
    usuario_id = auth.uid()
    -- Admin pode tudo
    OR public.has_role(auth.uid(), 'admin'::text)
    -- Gerente pode inserir/editar vendas da sua equipe
    OR (
      public.has_role(auth.uid(), 'gerente'::text)
      AND equipe_id = public.get_user_equipe_id()
    )
  );

COMMENT ON POLICY vendas_diarias_owner_all IS
  'Vendas isoladas por equipe para gerente, por filial para supervisor. Item 4 auditoria: gerente agora filtra por equipe_id, não mais filial_id.';

-- ---------------------------------------------------------------------
-- ITEM 4.4: METAS_INDIVIDUAIS — mesma lógica
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS metas_individuais_select_all ON public.metas_individuais;
CREATE POLICY metas_individuais_select_all ON public.metas_individuais
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::text)
    OR (
      public.has_role(auth.uid(), 'supervisor'::text)
      AND filial_id = public.get_user_filial_id()
    )
    OR (
      public.has_role(auth.uid(), 'gerente'::text)
      AND equipe_id = public.get_user_equipe_id()
    )
  );

DROP POLICY IF EXISTS metas_individuais_owner_all ON public.metas_individuais;
CREATE POLICY metas_individuais_owner_all ON public.metas_individuais
  FOR ALL TO authenticated
  USING (
    usuario_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::text)
    OR (
      public.has_role(auth.uid(), 'supervisor'::text)
      AND filial_id = public.get_user_filial_id()
    )
    OR (
      public.has_role(auth.uid(), 'gerente'::text)
      AND equipe_id = public.get_user_equipe_id()
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::text)
    OR (
      public.has_role(auth.uid(), 'gerente'::text)
      AND equipe_id = public.get_user_equipe_id()
    )
  );

COMMENT ON POLICY metas_individuais_owner_all IS
  'Metas isoladas por equipe para gerente, por filial para supervisor. Item 4 auditoria.';

-- ---------------------------------------------------------------------
-- ITEM 4.5: PROFILES para gerente — também filtra por equipe_id
--           (não apenas filial_id) para que gerente de eq-1001 não veja
--           profiles de eq-1001-noite
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own_filial ON public.profiles;
CREATE POLICY profiles_select_own_filial ON public.profiles
  FOR SELECT TO authenticated
  USING (
    -- Pode ver a si mesmo
    id = auth.uid()
    -- Admin vê todos
    OR public.has_role(auth.uid(), 'admin'::text)
    -- Supervisor vê TODA a filial (ambas as equipes)
    OR (
      public.has_role(auth.uid(), 'supervisor'::text)
      AND filial_id = public.get_user_filial_id()
    )
    -- Gerente vê apenas colegas da sua EQUIPE (não toda a filial)
    OR (
      public.has_role(auth.uid(), 'gerente'::text)
      AND equipe_id = public.get_user_equipe_id()
    )
    -- Vendedor/farmacêutica vê colegas da mesma filial
    OR (
      public.has_role(auth.uid(), 'vendedor'::text)
      AND filial_id = public.get_user_filial_id()
    )
    OR (
      public.has_role(auth.uid(), 'farmaceutica'::text)
      AND filial_id = public.get_user_filial_id()
    )
  );

COMMENT ON POLICY profiles_select_own_filial IS
  'Isolamento hierárquico: admin vê tudo, supervisor vê filial inteira, gerente vê apenas sua equipe, vendedor/farmacêutica vê filial. Item 3+4 auditoria.';

-- ---------------------------------------------------------------------
-- ITEM 4.6: Recriar policies que foram dropadas em 20260730130000_unify_has_role
--           usando a assinatura canônica has_role(uuid, text)
-- ---------------------------------------------------------------------

-- profiles (verbos distintos)
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- audit_log — admin-only
CREATE POLICY "Admins read audit_log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- campanhas (recria simples, depois migration de filial ajusta)
CREATE POLICY campanhas_owner_all ON public.campanhas
  FOR ALL TO authenticated
  USING (
    filial_id IS NULL  -- campanhas globais
    OR public.has_role(auth.uid(), 'admin'::text)
    OR filial_id = public.get_user_filial_id()
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
  );

-- login_matricula
CREATE POLICY login_matricula_admin_all ON public.login_matricula
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::text)
    OR (
      public.has_any_role(auth.uid(), ARRAY['gerente','supervisor']::text[])
      AND user_id IN (
        SELECT id FROM public.profiles WHERE filial_id = public.get_user_filial_id()
      )
    )
  );

-- filiais / equipes
CREATE POLICY filiais_all ON public.filiais
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));

CREATE POLICY equipes_all ON public.equipes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));

-- treinamentos
CREATE POLICY "Admins manage treinamentos" ON public.treinamentos
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));

CREATE POLICY "Users read own concluidos" ON public.treinamentos_concluidos
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[]));

-- white_label
CREATE POLICY companies_owner_all ON public.companies
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'admin'::text));

-- 🔒 Fase 4 (2026-08-04): corrigido 'companies_members' → 'members' e
-- 'usuario_id' → 'user_id' (nomes reais das colunas, ver migration 20260729000001).
-- Nota: as policies de members foram reescritas em 20260804000500_fix_members_insert.sql
-- com isolamento por company_id adequado. Esta policy é fallback.
CREATE POLICY members_owner_all ON public.members
  FOR ALL TO authenticated
  USING (
    user_uuid = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
  )
  WITH CHECK (
    user_uuid = auth.uid()
    OR public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
  );

-- ai_config / ai_logs / ai_prompt_versions (admin-only)
CREATE POLICY ai_config_admin_all ON public.ai_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY ai_logs_admin_all ON public.ai_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));
-- 🔒 Fase 4 (2026-08-04): corrigido 'usuario_id' → 'user_id'
-- (a coluna em ai_logs se chama 'user_id', não 'usuario_id' — ver migration 20260723100000)
CREATE POLICY ai_logs_owner_select ON public.ai_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::text));
CREATE POLICY ai_prompt_versions_admin_all ON public.ai_prompt_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- ---------------------------------------------------------------------
-- ITEM 4.7: Cria uma SEGUNDA equipe (eq-1001-noite) na filial 1001,
--           e move 1 vendedor para ela, para que o teste de isolamento
--           entre equipes (mesma filial) seja possível.
--           Mantemos o gerente e supervisor em eq-1001; o vendedor
--           joao1001 é movido para eq-1001-noite para que o gerente 1001
--           NÃO possa mais ver suas vendas/metas (mesmo estando na mesma
--           filial).
--           Após o teste, o usuário pode reverter manualmente se quiser.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  -- Cria a equipe eq-1001-noite se não existir (filial 1001, turno noite)
  IF NOT EXISTS (SELECT 1 FROM public.equipes WHERE filial_id = '1001' AND turno = 'noite') THEN
    INSERT INTO public.equipes (nome, filial_id, turno, ativo)
    VALUES ('Equipe Turno Noite', '1001', 'noite', true);
  END IF;
END $$;

-- Move o vendedor joao1001 para a equipe eq-1001-noite
UPDATE public.profiles
  SET equipe_id = 'eq-1001-noite'
  WHERE email = 'joao1001@pmenos.com.br'
  AND filial_id = '1001';

-- Move as vendas_diarias e metas_individuais desse vendedor para a nova equipe
UPDATE public.vendas_diarias
  SET equipe_id = 'eq-1001-noite'
  WHERE usuario_id = (
    SELECT id FROM public.profiles WHERE email = 'joao1001@pmenos.com.br'
  );

UPDATE public.metas_individuais
  SET equipe_id = 'eq-1001-noite'
  WHERE usuario_id = (
    SELECT id FROM public.profiles WHERE email = 'joao1001@pmenos.com.br'
  );

-- ---------------------------------------------------------------------
-- ITEM 4.8: Garante que 'farmaceutica' está no enum app_role
--           (migração 20260729110000_add_farmaceutica_role.sql já fez,
--            mas garantimos aqui para que has_role(auth.uid(), 'farmaceutica')
--            funcione mesmo se aplicada em ordem diferente)
-- ---------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'farmaceutica';
