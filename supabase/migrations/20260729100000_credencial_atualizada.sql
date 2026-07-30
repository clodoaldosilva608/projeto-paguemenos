-- Migration: Adiciona coluna credencial_atualizada para controle de primeiro acesso
-- Quando false, o usuário vê um banner recomendando atualizar a credencial

-- Adiciona coluna na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS credencial_atualizada boolean NOT NULL DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN public.profiles.credencial_atualizada IS 'Indica se o usuário já atualizou sua credencial inicial. False = mostrar banner de atualização.';

-- Índice para consultas rápidas (ex: buscar usuários que precisam atualizar)
CREATE INDEX IF NOT EXISTS idx_profiles_credencial_atualizada
ON public.profiles(credencial_atualizada)
WHERE credencial_atualizada = false;

-- RLS: usuário pode ler e atualizar apenas o próprio campo credencial_atualizada
-- (mas a atualização real da senha é feita via server function com supabaseAdmin)

-- Policy: usuário lê próprio profile (já deve existir, mas garantimos)
DROP POLICY IF EXISTS profiles_update_own_credencial ON public.profiles;
CREATE POLICY profiles_update_own_credencial ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
