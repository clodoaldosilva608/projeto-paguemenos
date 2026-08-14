-- ============================================================
-- Fase 6.3: Adicionar UNIQUE em profiles.email
-- Auditoria 2026-08-04, item A6
--
-- PROBLEMA: profiles.email era text livre, sem UNIQUE constraint.
-- Embora auth.users.email seja unique, profiles.email podia ser
-- duplicado por INSERT manual via service role.
--
-- PRÉ-REQUISITO: rodar a query de verificação abaixo ANTES de aplicar.
-- Se houver duplicatas, resolver manualmente antes.
-- ============================================================

-- === VERIFICAÇÃO PRÉVIA ===
-- Descomente para rodar antes e verificar duplicatas:
-- SELECT email, count(*) FROM public.profiles
-- GROUP BY email HAVING count(*) > 1;
-- Se retornar vazio, pode aplicar a constraint.

-- === PROFILES.EMAIL ===
-- Usar lower(email) para case-insensitive (auth.users.email é lowercased)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (lower(email));

COMMENT ON INDEX idx_profiles_email_unique IS
  'Adicionado em 2026-08-04 (Fase 6.3). Garante que profiles.email seja único (case-insensitive).';
