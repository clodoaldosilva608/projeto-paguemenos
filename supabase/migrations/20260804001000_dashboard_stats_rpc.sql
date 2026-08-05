-- ============================================================
-- Fase 6.4: RPC get_dashboard_stats
-- Auditoria 2026-08-04, item M4
--
-- PROBLEMA: getDashboardStats carregava 500k rows de vendas em memória
-- para fazer reduce no Node. Em 100k usuários causaria OOM.
--
-- SOLUÇÃO: função SQL que faz toda agregação no banco, retornando
-- apenas um JSON com os números finais. Reduz tráfego de rede de
-- 500k rows para 1 row.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT json_build_object(
    'usuarios', json_build_object(
      'total', (SELECT count(*) FROM public.profiles),
      'porPerfil', (
        SELECT json_object_agg(role, cnt) FROM (
          SELECT role, count(*) AS cnt
          FROM public.user_roles
          GROUP BY role
        ) r
      )
    ),
    'filiais', (SELECT count(*) FROM public.filiais),
    'equipes', (SELECT count(*) FROM public.equipes),
    'vendas', json_build_object(
      'hoje', COALESCE((
        SELECT SUM(valor_venda) FROM public.vendas_diarias
        WHERE data = CURRENT_DATE
      ), 0),
      'mes', COALESCE((
        SELECT SUM(valor_venda) FROM public.vendas_diarias
        WHERE data >= date_trunc('month', CURRENT_DATE)::date
      ), 0),
      'totalRegistrosMes', (
        SELECT count(*) FROM public.vendas_diarias
        WHERE data >= date_trunc('month', CURRENT_DATE)::date
      ),
      'ticketMedioHoje', COALESCE((
        SELECT SUM(valor_venda) / NULLIF(SUM(qtd_clientes), 0)
        FROM public.vendas_diarias
        WHERE data = CURRENT_DATE AND qtd_clientes > 0
      ), 0)
    ),
    'metas', (SELECT count(*) FROM public.metas_individuais),
    'campanhas', json_build_object(
      'total', (SELECT count(*) FROM public.campanhas),
      'ativas', (SELECT count(*) FROM public.campanhas WHERE status = 'ativa'),
      'rascunho', (SELECT count(*) FROM public.campanhas WHERE status = 'rascunho')
    ),
    'invitesPendentes', (
      SELECT count(*) FROM public.invites
      WHERE status = 'pendente' AND expira_em > now()
    ),
    'treinamentos', (SELECT count(*) FROM public.treinamentos WHERE ativo = true),
    'auditoriaHoje', (
      SELECT count(*) FROM public.audit_log
      WHERE criado_em >= CURRENT_DATE
    ),
    'aiLogs', (SELECT count(*) FROM public.ai_logs),
    'gerado_em', now()
  );
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_stats() IS
  'Criada em 2026-08-04 (Fase 6.4). Substitui getDashboardStats que carregava 500k rows em memória. Faz toda agregação no banco.';
