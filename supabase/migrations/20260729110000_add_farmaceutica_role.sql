-- Migration: Adiciona role 'farmacêutica' ao enum app_role
-- A farmacêutica pode lançar vendas mas não tem metas explícitas nem poder gerencial/supervisor

-- Adiciona novo valor ao ENUM app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'farmaceutica';

-- Comentário para documentação
COMMENT ON TYPE public.app_role IS 'Papéis de usuário: admin, gerente, supervisor, vendedor, farmaceutica. A farmacêutica pode lançar vendas mas não tem metas nem poder gerencial.';

-- Não precisa atualizar RLS — as policies existentes já usam has_role/has_any_role
-- e a farmacêutica não terá role admin/gerente/supervisor, então automaticamente:
-- - Não acessa páginas admin (Usuários, Convites, Acessos, Auditoria, Integrações)
-- - Não pode editar/excluir credenciais de outros
-- - Não pode acessar TV Mode (precisa admin/gerente/supervisor)
-- - Pode lançar vendas (RLS de vendas_diarias permite insert pelo próprio usuário)
-- - Pode ver próprio dashboard (sem metas atribuídas = dashboard vazio)
