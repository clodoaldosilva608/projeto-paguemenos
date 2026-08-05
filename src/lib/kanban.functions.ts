// @ts-nocheck — tipos do Supabase serão regenerados após aplicar migration
// ============================================================
// KANBAN — Server Functions
// Enterprise Kanban para Orion (2026-08-05)
//
// Features:
// 1. Multi-board (CRUD completo)
// 2. Cards (CRUD + drag & drop)
// 3. Atividades (histórico)
// 4. Métricas de funil
// 5. IA suggestions (sugestão de movimentação)
// 6. Templates (criar board from template)
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { z } from "zod";

// ============================================================================
// TIPOS
// ============================================================================

export interface BoardColuna {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  wip_limit: number | null;
  tipo: string; // 'entrada' | 'andamento' | 'fechado' | 'pos' | 'financeiro'
}

export interface Board {
  id: string;
  company_id: string;
  filial_id: string | null;
  equipe_id: string | null;
  nome: string;
  descricao: string | null;
  tipo: string;
  colunas_config: BoardColuna[];
  template_origem: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Card {
  id: string;
  board_id: string;
  company_id: string;
  filial_id: string | null;
  coluna_id: string;
  titulo: string;
  descricao: string | null;
  cliente_id: string | null;
  vendedor_id: string | null;
  prioridade: string;
  etiquetas: string[];
  valor: number;
  data_prazo: string | null;
  ordem: number;
  metadata: Record<string, any>;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface CardAtividade {
  id: string;
  card_id: string;
  usuario_id: string | null;
  acao: string;
  de_coluna_id: string | null;
  para_coluna_id: string | null;
  comentario: string | null;
  criado_em: string;
}

// ============================================================================
// 1. LISTAR BOARDS — lista boards do tenant/filial
// ============================================================================

export const listarBoards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Buscar perfil do usuário para filtrar por filial
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("filial_id")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const isAdmin = roles?.some((r: any) => r.role === "admin");
    const isGerente = roles?.some((r: any) => r.role === "gerente");

    let query = (supabaseAdmin as any)
      .from("boards")
      .select("*")
      .eq("ativo", true)
      .order("criado_em", { ascending: false });

    // Vendedor/supervisor só vê boards da sua filial
    if (!isAdmin && !isGerente && profile?.filial_id) {
      query = query.eq("filial_id", profile.filial_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return { boards: data || [] };
  });

// ============================================================================
// 2. OBTER BOARD — board completo com cards
// ============================================================================

const obterBoardSchema = z.object({
  board_id: z.string().uuid(),
});

export const obterBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => obterBoardSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Buscar board
    const { data: board, error: boardErr } = await supabaseAdmin
      .from("boards")
      .select("*")
      .eq("id", data.board_id)
      .eq("ativo", true)
      .maybeSingle();

    if (boardErr) throw new Error(boardErr.message);
    if (!board) throw new Error("Board não encontrado");

    // Buscar cards do board
    const { data: cards, error: cardsErr } = await supabaseAdmin
      .from("cards")
      .select("*")
      .eq("board_id", data.board_id)
      .eq("ativo", true)
      .order("coluna_id", { ascending: true })
      .order("ordem", { ascending: true });

    if (cardsErr) throw new Error(cardsErr.message);

    // Buscar nomes dos vendedores atribuídos
    const vendedorIds = (cards || [])
      .map((c: any) => c.vendedor_id)
      .filter(Boolean);
    const uniqueIds = [...new Set(vendedorIds)];

    let vendedorMap: Record<string, string> = {};
    if (uniqueIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nome")
        .in("id", uniqueIds);
      vendedorMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p.nome;
        return acc;
      }, {});
    }

    return {
      board,
      cards: cards || [],
      vendedores: vendedorMap,
    };
  });

// ============================================================================
// 3. CRIAR BOARD FROM TEMPLATE
// ============================================================================

const criarBoardSchema = z.object({
  template: z.enum(["farmacia_padrao", "farmacia_delivery", "farmacia_hospitalar", "custom"]),
  nome: z.string().min(1).max(100),
  filial_id: z.string().optional(),
  equipe_id: z.string().uuid().optional(),
});

export const criarBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => criarBoardSchema.parse(v))
  .handler(async ({ data, context }) => {
    await ensureAdminInline(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Buscar company_id do usuário
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("company_id")
      .eq("id", context.userId)
      .maybeSingle();

    const companyId = profile?.company_id || "paguemenos";

    // Criar board via RPC
    const { data: boardId, error } = await (supabaseAdmin as any).rpc("criar_board_from_template", {
      p_template: data.template,
      p_nome: data.nome,
      p_filial_id: data.filial_id || null,
      p_equipe_id: data.equipe_id || null,
      p_company_id: companyId,
    });

    if (error) throw new Error(error.message);

    // Log de auditoria
    try {
      await db.from("audit_log").insert({
        actor_user_id: context.userId,
        actor_email: context.claims?.email,
        action: "kanban.board.criar",
        entity: "boards",
        entity_id: boardId?.toString() || null,
        after: { template: data.template, nome: data.nome },
      });
    } catch {}

    return { board_id: boardId };
  });

// ============================================================================
// 4. CRIAR CARD
// ============================================================================

const criarCardSchema = z.object({
  board_id: z.string().uuid(),
  coluna_id: z.string().min(1),
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(2000).optional(),
  vendedor_id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().optional(),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
  etiquetas: z.array(z.string()).default([]),
  valor: z.number().min(0).default(0),
  data_prazo: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

export const criarCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => criarCardSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Buscar company_id e filial_id do board
    const { data: board } = await supabaseAdmin
      .from("boards")
      .select("company_id, filial_id")
      .eq("id", data.board_id)
      .maybeSingle();

    if (!board) throw new Error("Board não encontrado");

    // Buscar última ordem da coluna
    const { data: lastCard } = await supabaseAdmin
      .from("cards")
      .select("ordem")
      .eq("board_id", data.board_id)
      .eq("coluna_id", data.coluna_id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();

    const novaOrdem = (lastCard?.ordem || 0) + 1;

    const { data: card, error } = await supabaseAdmin
      .from("cards")
      .insert({
        board_id: data.board_id,
        company_id: board.company_id,
        filial_id: board.filial_id,
        coluna_id: data.coluna_id,
        titulo: data.titulo,
        descricao: data.descricao || null,
        vendedor_id: data.vendedor_id || null,
        cliente_id: data.cliente_id || null,
        prioridade: data.prioridade,
        etiquetas: data.etiquetas,
        valor: data.valor,
        data_prazo: data.data_prazo || null,
        ordem: novaOrdem,
        metadata: data.metadata,
        criado_por: context.userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Registrar atividade
    try {
      await db.from("card_atividades").insert({
        card_id: card.id,
        company_id: board.company_id,
        usuario_id: context.userId,
        acao: "criou",
        para_coluna_id: data.coluna_id,
        comentario: `Card criado: ${data.titulo}`,
      });
    } catch {}

    return { card };
  });

// ============================================================================
// 5. MOVER CARD — drag & drop
// ============================================================================

const moverCardSchema = z.object({
  card_id: z.string().uuid(),
  para_coluna_id: z.string().min(1),
  nova_ordem: z.number().int().min(0).optional(),
});

export const moverCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => moverCardSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Buscar card atual
    const { data: card, error: cardErr } = await supabaseAdmin
      .from("cards")
      .select("id, board_id, coluna_id, titulo, company_id")
      .eq("id", data.card_id)
      .maybeSingle();

    if (cardErr) throw new Error(cardErr.message);
    if (!card) throw new Error("Card não encontrado");

    const colunaAntiga = card.coluna_id;

    // Atualizar coluna e ordem do card
    const updateData: any = {
      coluna_id: data.para_coluna_id,
      atualizado_em: new Date().toISOString(),
    };

    if (data.nova_ordem !== undefined) {
      updateData.ordem = data.nova_ordem;
    }

    const { error: updateErr } = await supabaseAdmin
      .from("cards")
      .update(updateData)
      .eq("id", data.card_id);

    if (updateErr) throw new Error(updateErr.message);

    // Registrar atividade (só se mudou de coluna)
    if (colunaAntiga !== data.para_coluna_id) {
      try {
        await db.from("card_atividades").insert({
          card_id: data.card_id,
          company_id: card.company_id,
          usuario_id: context.userId,
          acao: "moveu",
          de_coluna_id: colunaAntiga,
          para_coluna_id: data.para_coluna_id,
          comentario: `Moveu "${card.titulo}" de ${colunaAntiga} para ${data.para_coluna_id}`,
        });
      } catch {}
    }

    return { ok: true };
  });

// ============================================================================
// 6. EDITAR CARD
// ============================================================================

const editarCardSchema = z.object({
  card_id: z.string().uuid(),
  titulo: z.string().min(1).max(200).optional(),
  descricao: z.string().max(2000).optional(),
  vendedor_id: z.string().uuid().nullable().optional(),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
  etiquetas: z.array(z.string()).optional(),
  valor: z.number().min(0).optional(),
  data_prazo: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

export const editarCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => editarCardSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { card_id, ...updates } = data;
    const updateData: any = { ...updates, atualizado_em: new Date().toISOString() };

    const { data: card, error } = await supabaseAdmin
      .from("cards")
      .update(updateData)
      .eq("id", card_id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Registrar atividade
    try {
      await db.from("card_atividades").insert({
        card_id,
        company_id: card.company_id,
        usuario_id: context.userId,
        acao: "editou",
        comentario: `Card editado: ${card.titulo}`,
      });
    } catch {}

    return { card };
  });

// ============================================================================
// 7. EXCLUIR CARD (soft delete)
// ============================================================================

const excluirCardSchema = z.object({
  card_id: z.string().uuid(),
});

export const excluirCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => excluirCardSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { error } = await supabaseAdmin
      .from("cards")
      .update({ ativo: false, atualizado_em: new Date().toISOString() })
      .eq("id", data.card_id);

    if (error) throw new Error(error.message);

    // Registrar atividade
    try {
      await db.from("card_atividades").insert({
        card_id: data.card_id,
        company_id: "paguemenos",
        usuario_id: context.userId,
        acao: "arquivou",
      });
    } catch {}

    return { ok: true };
  });

// ============================================================================
// 8. LISTAR ATIVIDADES
// ============================================================================

const listarAtividadesSchema = z.object({
  card_id: z.string().uuid().optional(),
  board_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const listarAtividades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => listarAtividadesSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    let query = (supabaseAdmin as any)
      .from("card_atividades")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(data.limit);

    if (data.card_id) {
      query = query.eq("card_id", data.card_id);
    } else if (data.board_id) {
      // Buscar atividades de todos os cards do board
      const { data: cardIds } = await supabaseAdmin
        .from("cards")
        .select("id")
        .eq("board_id", data.board_id);
      const ids = (cardIds || []).map((c: any) => c.id);
      if (ids.length > 0) {
        query = query.in("card_id", ids);
      }
    }

    const { data: atividades, error } = await query;
    if (error) throw new Error(error.message);

    // Buscar nomes dos usuários
    const userIds = (atividades || [])
      .map((a: any) => a.usuario_id)
      .filter(Boolean);
    const uniqueIds = [...new Set(userIds)];

    let userMap: Record<string, string> = {};
    if (uniqueIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, nome")
        .in("id", uniqueIds);
      userMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p.nome;
        return acc;
      }, {});
    }

    return { atividades: atividades || [], usuarios: userMap };
  });

// ============================================================================
// 9. MÉTRICAS DE FUNIL
// ============================================================================

const funilSchema = z.object({
  board_id: z.string().uuid(),
});

export const obterFunilMetricas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => funilSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Usar a view vw_kanban_funil
    const { data: metricas, error } = await supabaseAdmin
      .from("vw_kanban_funil")
      .select("*")
      .eq("board_id", data.board_id)
      .order("coluna_ordem", { ascending: true });

    if (error) throw new Error(error.message);

    // Calcular taxa de conversão
    const totalCards = (metricas || []).reduce((sum: number, m: any) => sum + Number(m.total_cards), 0);
    const totalValor = (metricas || []).reduce((sum: number, m: any) => sum + Number(m.valor_total), 0);

    return {
      colunas: metricas || [],
      resumo: {
        total_cards: totalCards,
        valor_pipeline: totalValor,
        cards_atrasados: (metricas || []).reduce((s: number, m: any) => s + Number(m.cards_atrasados), 0),
        cards_urgentes: (metricas || []).reduce((s: number, m: any) => s + Number(m.cards_urgentes), 0),
      },
    };
  });

// ============================================================================
// 10. IA — SUGESTÃO DE MOVIMENTAÇÃO
// ============================================================================

const sugestaoIASchema = z.object({
  board_id: z.string().uuid(),
});

export const sugerirMovimentacaoIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: unknown) => sugestaoIASchema.parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Buscar config de IA
    const { data: cfg } = await supabaseAdmin
      .from("ai_config")
      .select("api_key_ciphertext, base_url, model, provider")
      .eq("ativo", true)
      .maybeSingle();

    if (!cfg?.api_key_ciphertext) {
      return { sugestoes: [], erro: "IA não configurada" };
    }

    // Buscar board + cards
    const { data: board } = await supabaseAdmin
      .from("boards")
      .select("*")
      .eq("id", data.board_id)
      .maybeSingle();

    const { data: cards } = await supabaseAdmin
      .from("cards")
      .select("*")
      .eq("board_id", data.board_id)
      .eq("ativo", true)
      .order("atualizado_em", { ascending: true })
      .limit(20); // Últimos 20 cards atualizados

    if (!board || !cards || cards.length === 0) {
      return { sugestoes: [] };
    }

    // Preparar contexto para IA
    const colunas = board.colunas_config.map((c: any) => `${c.id}: ${c.nome} (${c.tipo})`).join(", ");
    const cardsResumo = cards.map((c: any) => ({
      id: c.id,
      titulo: c.titulo,
      coluna: c.coluna_id,
      prioridade: c.prioridade,
      valor: c.valor,
      prazo: c.data_prazo,
      atualizado: c.atualizado_em,
    }));

    const prompt = `Você é o assistente IA do Kanban do Orion. Analise os cards e sugira movimentações.

Colunas do board: ${colunas}

Cards (JSON):
${JSON.stringify(cardsResumo, null, 2)}

Regras:
1. Se um card está parado há mais de 3 dias em uma coluna de "andamento", sugira mover para a próxima coluna ou para uma coluna de "follow-up".
2. Se um card tem prioridade "urgente" e prazo vencido, alerte.
3. Se um card tem valor alto e está em coluna inicial, sugira priorizar.

Responda APENAS em JSON: {"sugestoes":[{"card_id":"...","acao":"mover|alertar|priorizar","de_coluna":"...","para_coluna":"...","motivo":"..."}]}`;

    try {
      const { fetchWithRetry } = await import("@/lib/fetch-with-timeout");
      const resp = await fetchWithRetry(cfg.base_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.api_key_ciphertext}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: "system", content: "Você é um assistente especializado em gestão de pipeline de vendas." },
            { role: "user", content: prompt },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      }, { retries: 1, timeout: 30_000, backoff: 1000 });

      if (!resp.ok) {
        return { sugestoes: [], erro: `IA erro: ${resp.status}` };
      }

      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content || "";

      // Extrair JSON da resposta
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return { sugestoes: parsed.sugestoes || [] };
      }

      return { sugestoes: [] };
    } catch (e: any) {
      return { sugestoes: [], erro: e.message };
    }
  });

// Helper inline (não depende de import)
async function ensureAdminInline(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "gerente"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado. Necessário perfil admin ou gerente.");
}
