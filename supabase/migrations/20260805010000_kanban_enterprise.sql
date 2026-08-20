-- ============================================================
-- KANBAN ENTERPRISE — Orion (Pague Menos)
-- Migration: 6 tabelas + RLS + índices + triggers + templates
-- Data: 2026-08-05
--
-- Features:
-- 1. Multi-board por tenant (company_id + filial_id + equipe_id)
-- 2. Templates de board (Farmácia Padrão, Delivery, Hospitalar)
-- 3. Métricas de funil (via views materializadas)
-- 4. Integração com vendas_diarias (trigger quando card → Fechado)
-- 5. CRM (clientes) + Chat (conversas + mensagens)
-- ============================================================

-- =====================================================================
-- 1. BOARDS — quadros Kanban (um por filial/equipe/tipo)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'paguemenos',
  filial_id text,
  equipe_id uuid,

  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'vendas'
    CHECK (tipo IN ('vendas','atendimento','campanhas','crm','custom')),

  -- Configuração de colunas: [{id, nome, cor, ordem, wip_limit, tipo}]
  colunas_config jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Template de origem (para auditoria)
  template_origem text,

  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boards_company ON public.boards(company_id);
CREATE INDEX IF NOT EXISTS idx_boards_filial ON public.boards(filial_id);
CREATE INDEX IF NOT EXISTS idx_boards_equipe ON public.boards(equipe_id);
CREATE INDEX IF NOT EXISTS idx_boards_ativo ON public.boards(ativo);

-- =====================================================================
-- 2. CARDS — itens do Kanban
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  company_id text NOT NULL DEFAULT 'paguemenos',
  filial_id text,

  -- Coluna atual (ID dentro de colunas_config)
  coluna_id text NOT NULL,

  -- Conteúdo
  titulo text NOT NULL,
  descricao text,

  -- Relacionamentos
  cliente_id uuid,  -- FK para clientes (CRM)
  vendedor_id uuid, -- responsável

  -- Atributos
  prioridade text NOT NULL DEFAULT 'media'
    CHECK (prioridade IN ('baixa','media','alta','urgente')),
  etiquetas text[] DEFAULT '{}',
  valor numeric(14,2) DEFAULT 0,
  data_prazo date,
  ordem int NOT NULL DEFAULT 0,

  -- Campos customizados por tipo de board
  metadata jsonb DEFAULT '{}'::jsonb,

  ativo boolean NOT NULL DEFAULT true,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_board ON public.cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_company ON public.cards(company_id);
CREATE INDEX IF NOT EXISTS idx_cards_filial ON public.cards(filial_id);
CREATE INDEX IF NOT EXISTS idx_cards_vendedor ON public.cards(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_cards_cliente ON public.cards(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cards_coluna ON public.cards(board_id, coluna_id, ordem);
CREATE INDEX IF NOT EXISTS idx_cards_prazo ON public.cards(data_prazo) WHERE data_prazo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cards_prioridade ON public.cards(prioridade) WHERE prioridade IN ('alta','urgente');

-- =====================================================================
-- 3. CARD_ATIVIDADES — histórico de movimentações (auditoria)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.card_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  company_id text NOT NULL DEFAULT 'paguemenos',

  usuario_id uuid,
  acao text NOT NULL
    CHECK (acao IN ('criou','moveu','comentou','atribuiu','arquivou','restaurou','editou','fechou')),

  de_coluna_id text,
  para_coluna_id text,
  comentario text,
  metadata jsonb DEFAULT '{}'::jsonb,

  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_atividades_card ON public.card_atividades(card_id);
CREATE INDEX IF NOT EXISTS idx_card_atividades_company ON public.card_atividades(company_id);
CREATE INDEX IF NOT EXISTS idx_card_atividades_usuario ON public.card_atividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_card_atividades_criado ON public.card_atividades(criado_em DESC);

-- =====================================================================
-- 4. CLIENTES — CRM (cadastro de clientes)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'paguemenos',
  filial_id text,

  nome text NOT NULL,
  email text,
  telefone text,
  cpf text,
  data_nascimento date,

  endereco jsonb DEFAULT '{}'::jsonb,
  observacoes text,

  -- Segmentação
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,

  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_company ON public.clientes(company_id);
CREATE INDEX IF NOT EXISTS idx_clientes_filial ON public.clientes(filial_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON public.clientes(telefone) WHERE telefone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_cpf ON public.clientes(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_tags ON public.clientes USING gin(tags);

-- =====================================================================
-- 5. CONVERSAS — chat vendedor ↔ cliente
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL DEFAULT 'paguemenos',
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  vendedor_id uuid,

  canal text NOT NULL DEFAULT 'in_app'
    CHECK (canal IN ('in_app','whatsapp','sms','email')),
  status text NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta','fechada','arquivada')),

  ultima_mensagem_em timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,

  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversas_company ON public.conversas(company_id);
CREATE INDEX IF NOT EXISTS idx_conversas_card ON public.conversas(card_id);
CREATE INDEX IF NOT EXISTS idx_conversas_cliente ON public.conversas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_vendedor ON public.conversas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_conversas_status ON public.conversas(status);

-- =====================================================================
-- 6. MENSAGENS — mensagens do chat
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.conversas(id) ON DELETE CASCADE,
  company_id text NOT NULL DEFAULT 'paguemenos',

  remetente_id uuid,
  remetente_tipo text NOT NULL DEFAULT 'vendedor'
    CHECK (remetente_tipo IN ('vendedor','cliente','ia','sistema')),

  conteudo text NOT NULL,
  anexos jsonb DEFAULT '[]'::jsonb,
  lida boolean NOT NULL DEFAULT false,

  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON public.mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_company ON public.mensagens(company_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON public.mensagens(remetente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_criado ON public.mensagens(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_nao_lidas ON public.mensagens(conversa_id) WHERE lida = false;

-- =====================================================================
-- 7. RLS — Row Level Security (multi-tenant isolation)
-- =====================================================================

-- BOARDS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY boards_select_tenant ON public.boards
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY boards_modify_admin ON public.boards
  FOR ALL TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','gerente']::text[])
    AND company_id = public.get_user_company_id()
  );

-- CARDS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY cards_select_tenant ON public.cards
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY cards_insert_tenant ON public.cards
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY cards_update_tenant ON public.cards
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY cards_delete_tenant ON public.cards
  FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id());

-- CARD_ATIVIDADES
ALTER TABLE public.card_atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY card_atividades_select_tenant ON public.card_atividades
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY card_atividades_insert_tenant ON public.card_atividades
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

-- CLIENTES
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY clientes_select_tenant ON public.clientes
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY clientes_modify_tenant ON public.clientes
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- CONVERSAS
ALTER TABLE public.conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversas_select_tenant ON public.conversas
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY conversas_modify_tenant ON public.conversas
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- MENSAGENS
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY mensagens_select_tenant ON public.mensagens
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY mensagens_insert_tenant ON public.mensagens
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY mensagens_update_tenant ON public.mensagens
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- =====================================================================
-- 8. TRIGGERS — updated_at + integração vendas
-- =====================================================================

-- Trigger: atualizar updated_at em boards
CREATE OR REPLACE FUNCTION public.handle_boards_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_boards_updated ON public.boards;
CREATE TRIGGER trg_boards_updated
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.handle_boards_updated();

-- Trigger: atualizar updated_at em cards
CREATE OR REPLACE FUNCTION public.handle_cards_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cards_updated ON public.cards;
CREATE TRIGGER trg_cards_updated
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_cards_updated();

-- Trigger: atualizar updated_at em clientes
CREATE OR REPLACE FUNCTION public.handle_clientes_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_updated ON public.clientes;
CREATE TRIGGER trg_clientes_updated
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.handle_clientes_updated();

-- Trigger: INTEGRAÇÃO VENDAS — quando card move para coluna "Fechado"
-- Cria registro em vendas_diarias automaticamente
CREATE OR REPLACE FUNCTION public.handle_card_fechado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_board_record record;
  v_coluna_fechada text;
  v_vendedor_id uuid;
  v_filial_id text;
  v_categoria text;
BEGIN
  -- Só agir se a coluna mudou
  IF NEW.coluna_id = OLD.coluna_id THEN
    RETURN NEW;
  END IF;

  -- Buscar config do board para verificar se a coluna destino é "fechado"
  SELECT * INTO v_board_record FROM public.boards WHERE id = NEW.board_id;

  -- Verificar se a coluna destino tem tipo='fechado'
  SELECT col->>'tipo' INTO v_coluna_fechada
  FROM jsonb_array_elements(v_board_record.colunas_config) AS col
  WHERE col->>'id' = NEW.coluna_id AND col->>'tipo' = 'fechado';

  IF v_coluna_fechada IS NOT NULL AND NEW.valor > 0 THEN
    -- Determinar vendedor e filial
    v_vendedor_id := COALESCE(NEW.vendedor_id, NEW.criado_por);
    v_filial_id := COALESCE(NEW.filial_id, v_board_record.filial_id);
    v_categoria := COALESCE(NEW.metadata->>'categoria', 'faturamento');

    -- Criar registro em vendas_diarias
    INSERT INTO public.vendas_diarias (
      usuario_id, filial_id, equipe_id, data,
      categoria, valor_venda, qtd_clientes,
      observacao, company_id
    ) VALUES (
      v_vendedor_id,
      v_filial_id,
      NULL,
      CURRENT_DATE,
      v_categoria,
      NEW.valor,
      1,
      'Venda fechada via Kanban — Card: ' || NEW.titulo,
      NEW.company_id
    )
    ON CONFLICT DO NOTHING; -- Evita duplicação

    -- Atualizar metadata do card com data de fechamento
    NEW.metadata = jsonb_set(
      NEW.metadata,
      '{data_fechamento}',
      to_jsonb(now()::text)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_card_fechado ON public.cards;
CREATE TRIGGER trg_card_fechado
  BEFORE UPDATE OF coluna_id ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.handle_card_fechado();

-- =====================================================================
-- 9. TEMPLATES DE BOARD — 3 padrões pré-configurados
-- =====================================================================

-- Função: criar board a partir de template
CREATE OR REPLACE FUNCTION public.criar_board_from_template(
  p_template text,
  p_nome text DEFAULT NULL,
  p_filial_id text DEFAULT NULL,
  p_equipe_id uuid DEFAULT NULL,
  p_company_id text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_board_id uuid;
  v_nome text := COALESCE(p_nome, 'Novo Board');
  v_company text := COALESCE(p_company_id, public.get_user_company_id());
  v_colunas jsonb;
BEGIN
  -- Selecionar template
  v_colunas := CASE p_template
    WHEN 'farmacia_padrao' THEN '[
      {"id":"col1","nome":"Novo Lead","cor":"#3b82f6","ordem":0,"wip_limit":null,"tipo":"entrada"},
      {"id":"col2","nome":"Em Atendimento","cor":"#f59e0b","ordem":1,"wip_limit":10,"tipo":"andamento"},
      {"id":"col3","nome":"Proposta Enviada","cor":"#8b5cf6","ordem":2,"wip_limit":5,"tipo":"andamento"},
      {"id":"col4","nome":"Fechado","cor":"#22c55e","ordem":3,"wip_limit":null,"tipo":"fechado"},
      {"id":"col5","nome":"Pós-Venda","cor":"#06b6d4","ordem":4,"wip_limit":null,"tipo":"pos"}
    ]'::jsonb

    WHEN 'farmacia_delivery' THEN '[
      {"id":"col1","nome":"Pedido Recebido","cor":"#3b82f6","ordem":0,"wip_limit":null,"tipo":"entrada"},
      {"id":"col2","nome":"Confirmando Endereço","cor":"#f59e0b","ordem":1,"wip_limit":15,"tipo":"andamento"},
      {"id":"col3","nome":"Separando Itens","cor":"#8b5cf6","ordem":2,"wip_limit":10,"tipo":"andamento"},
      {"id":"col4","nome":"Saiu para Entrega","cor":"#ec4899","ordem":3,"wip_limit":8,"tipo":"andamento"},
      {"id":"col5","nome":"Entregue","cor":"#22c55e","ordem":4,"wip_limit":null,"tipo":"fechado"},
      {"id":"col6","nome":"Pagamento Pendente","cor":"#ef4444","ordem":5,"wip_limit":null,"tipo":"financeiro"},
      {"id":"col7","nome":"Pós-Venda","cor":"#06b6d4","ordem":6,"wip_limit":null,"tipo":"pos"}
    ]'::jsonb

    WHEN 'farmacia_hospitalar' THEN '[
      {"id":"col1","nome":"Prescrição Recebida","cor":"#3b82f6","ordem":0,"wip_limit":null,"tipo":"entrada"},
      {"id":"col2","nome":"Validação Farmacêutica","cor":"#f59e0b","ordem":1,"wip_limit":8,"tipo":"andamento"},
      {"id":"col3","nome":"Preparo","cor":"#8b5cf6","ordem":2,"wip_limit":5,"tipo":"andamento"},
      {"id":"col4","nome":"Aguardando Retirada","cor":"#ec4899","ordem":3,"wip_limit":null,"tipo":"andamento"},
      {"id":"col5","nome":"Entregue","cor":"#22c55e","ordem":4,"wip_limit":null,"tipo":"fechado"},
      {"id":"col6","nome":"Acompanhamento","cor":"#06b6d4","ordem":5,"wip_limit":null,"tipo":"pos"}
    ]'::jsonb

    ELSE '[
      {"id":"col1","nome":"A Fazer","cor":"#3b82f6","ordem":0,"wip_limit":null,"tipo":"entrada"},
      {"id":"col2","nome":"Em Progresso","cor":"#f59e0b","ordem":1,"wip_limit":10,"tipo":"andamento"},
      {"id":"col3","nome":"Concluído","cor":"#22c55e","ordem":2,"wip_limit":null,"tipo":"fechado"}
    ]'::jsonb
  END CASE;

  INSERT INTO public.boards (
    company_id, filial_id, equipe_id,
    nome, tipo, colunas_config, template_origem, ativo
  ) VALUES (
    v_company, p_filial_id, p_equipe_id,
    v_nome, 'vendas', v_colunas, p_template, true
  ) RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_board_from_template(text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_board_from_template(text, text, text, uuid, text) TO authenticated;

-- =====================================================================
-- 10. VIEW — MÉTRICAS DE FUNIL
-- =====================================================================
CREATE OR REPLACE VIEW public.vw_kanban_funil AS
SELECT
  b.id AS board_id,
  b.nome AS board_nome,
  b.company_id,
  b.filial_id,
  col.id AS coluna_id,
  col.nome AS coluna_nome,
  col.cor AS coluna_cor,
  col.ordem AS coluna_ordem,
  col.tipo AS coluna_tipo,
  col.wip_limit,
  COUNT(c.id) AS total_cards,
  COALESCE(SUM(c.valor), 0) AS valor_total,
  COUNT(c.id) FILTER (WHERE c.prioridade = 'urgente') AS cards_urgentes,
  COUNT(c.id) FILTER (WHERE c.data_prazo < CURRENT_DATE AND c.data_prazo IS NOT NULL) AS cards_atrasados,
  COUNT(c.id) FILTER (WHERE c.vendedor_id IS NOT NULL) AS cards_atribuidos
FROM public.boards b
CROSS JOIN LATERAL jsonb_array_elements(b.colunas_config) AS col
LEFT JOIN public.cards c ON c.board_id = b.id AND c.coluna_id = col.id AND c.ativo = true
WHERE b.ativo = true
GROUP BY b.id, b.nome, b.company_id, b.filial_id, col.id, col.nome, col.cor, col.ordem, col.tipo, col.wip_limit
ORDER BY b.id, col.ordem;

COMMENT ON VIEW public.vw_kanban_funil IS 'View de métricas de funil Kanban — criada em 2026-08-05';

-- =====================================================================
-- VERIFICAÇÃO
-- =====================================================================
SELECT 'Kanban: 6 tabelas + RLS + índices + triggers + templates + view criados' AS msg;
