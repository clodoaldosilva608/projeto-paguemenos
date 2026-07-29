import { useCallback, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatIA } from "@/lib/ia.functions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface IAMessage { role: "user" | "assistant"; content: string }

// Sugestões dinâmicas por perfil
const SUGESTOES_POR_PERFIL: Record<string, string[]> = {
  vendedor: [
    "📊 Como estão minhas metas deste mês?",
    "💰 Registrei 3 vendas de R$ 80 hoje",
    "🎯 Dica para bater minha meta de faturamento",
    "💡 Como aumentar meu ticket médio?",
    "🤝 Como abordar cliente que só quer preço?",
    "📈 Analise meu desempenho neste mês",
  ],
  supervisor: [
    "👥 Como está o desempenho da equipe?",
    "📊 Quem está abaixo da meta?",
    "🎯 Sugestões de treinamento para a equipe",
    "📈 Ranking de vendedores neste mês",
    "💡 Ideias de campanha para genéricos",
  ],
  gerente: [
    "📊 Panorama geral da loja",
    "🏆 Quem são os top 3 vendedores?",
    "⚠️ Quem precisa de atenção?",
    "📈 Projeção de fechamento do mês",
    "💡 Estratégias para melhorar o faturamento",
    "🎯 Meta de Marcas Exclusivas está adequada?",
  ],
  admin: [
    "📊 Resumo executivo de todas as filiais",
    "🔐 Status do sistema e auditoria",
    "🏆 Ranking geral de vendedores",
    "📈 Análise de tendências do mês",
    "💡 Recomendações estratégicas",
  ],
};

// Buscar dados reais do usuário no Supabase para contexto da IA
async function buscarContextoReal(usuario: any): Promise<string | undefined> {
  if (!usuario) return undefined;

  const partes = [`Nome: ${usuario.nome}`, `Perfil: ${usuario.perfil}`];
  if (usuario.cargo) partes.push(`Cargo: ${usuario.cargo}`);
  if (usuario.filialId) partes.push(`Filial: ${usuario.filialId}`);

  try {
    // Buscar metas do usuário
    const { data: metas } = await supabase
      .from("metas_individuais")
      .select("categoria, periodo, valor_meta, valor_realizado, valor_projecao")
      .eq("usuario_id", usuario.id)
      .eq("periodo", "mensal");

    if (metas && metas.length > 0) {
      const fat = metas.find((m) => m.categoria === "faturamento");
      if (fat) {
        const pct = fat.valor_meta > 0 ? ((Number(fat.valor_realizado) / Number(fat.valor_meta)) * 100).toFixed(1) : 0;
        partes.push(`\n--- METAS DO MÊS ---`);
        partes.push(`Faturamento: Meta R$ ${Number(fat.valor_meta).toFixed(2)} | Realizado R$ ${Number(fat.valor_realizado).toFixed(2)} | ${pct}%`);
        if (fat.valor_projecao) {
          partes.push(`Projeção: R$ ${Number(fat.valor_projecao).toFixed(2)}`);
        }
      }

      for (const m of metas) {
        if (m.categoria !== "faturamento") {
          const pct = m.valor_meta > 0 ? ((Number(m.valor_realizado) / Number(m.valor_meta)) * 100).toFixed(1) : 0;
          partes.push(`${m.categoria}: Meta R$ ${Number(m.valor_meta).toFixed(2)} | Realizado R$ ${Number(m.valor_realizado).toFixed(2)} | ${pct}%`);
        }
      }
    }

    // Buscar vendas diárias
    const { data: vendas } = await supabase
      .from("vendas_diarias")
      .select("data, valor_venda, qtd_clientes, categoria")
      .eq("usuario_id", usuario.id)
      .order("data", { ascending: false })
      .limit(30);

    if (vendas && vendas.length > 0) {
      const totalVendas = vendas.reduce((s, v) => s + Number(v.valor_venda), 0);
      const totalClientes = vendas.reduce((s, v) => s + Number(v.qtd_clientes), 0);
      const tkm = totalClientes > 0 ? totalVendas / totalClientes : 0;
      partes.push(`\n--- VENDAS LANÇADAS ---`);
      partes.push(`Total de vendas: ${vendas.length} lançamentos`);
      partes.push(`Valor total: R$ ${totalVendas.toFixed(2)}`);
      partes.push(`Total clientes: ${totalClientes}`);
      partes.push(`Ticket médio: R$ ${tkm.toFixed(2)}`);
      partes.push(`Última venda: ${vendas[0]?.data} - R$ ${Number(vendas[0]?.valor_venda).toFixed(2)}`);
    }
  } catch {
    // Silencioso
  }

  // Para gerente/admin, buscar dados de toda a equipe
  if (usuario.perfil === "gerente" || usuario.perfil === "admin" || usuario.perfil === "supervisor") {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("ativo", true);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "vendedor");

      const vendedorIds = (roles || []).map((r) => r.user_id);
      const vendedores = (profiles || []).filter((p) => vendedorIds.includes(p.id));

      const { data: todasMetas } = await supabase
        .from("metas_individuais")
        .select("usuario_id, categoria, valor_meta, valor_realizado, valor_projecao")
        .eq("periodo", "mensal")
        .eq("categoria", "faturamento");

      partes.push(`\n--- DADOS DA EQUIPE (${vendedores.length} vendedores) ---`);

      const nomeMap = new Map(vendedores.map((v) => [v.id, v.nome]));
      const ranking: { nome: string; meta: number; realizado: number; pct: number }[] = [];

      for (const m of todasMetas || []) {
        const nome = nomeMap.get(m.usuario_id);
        if (!nome) continue;
        const meta = Number(m.valor_meta);
        const realizado = Number(m.valor_realizado);
        ranking.push({ nome, meta, realizado, pct: meta > 0 ? (realizado / meta) * 100 : 0 });
      }

      ranking.sort((a, b) => b.pct - a.pct);

      partes.push(`Ranking de vendedores:`);
      ranking.forEach((r, i) => {
        partes.push(`${i + 1}º ${r.nome}: R$ ${r.realizado.toFixed(2)} / R$ ${r.meta.toFixed(2)} (${r.pct.toFixed(1)}%)`);
      });

      const totalMeta = ranking.reduce((s, r) => s + r.meta, 0);
      const totalReal = ranking.reduce((s, r) => s + r.realizado, 0);
      partes.push(`\nTotal loja: Meta R$ ${totalMeta.toFixed(2)} | Realizado R$ ${totalReal.toFixed(2)} | ${(totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0).toFixed(1)}%`);
    } catch {}
  }

  return partes.join("\n");
}

// Detectar comando de lançamento de venda na mensagem
export function detectarComandoVenda(texto: string): { valor: number; clientes: number; categoria: string } | null {
  const lower = texto.toLowerCase();

  // Padrões: "registrei X vendas de R$ Y", "lançar R$ Y com Z clientes", "vendi R$ Y hoje"
  const padroes = [
    /(?:registrei|lançar|lancar|vendi|registrei|fiz)\s*(\d+)?\s*(?:vendas?|lançamentos?)?\s*(?:de|no valor de)?\s*r?\$?\s*([\d.,]+)/i,
    /r?\$?\s*([\d.,]+)\s*(?:com|para|com\s*\d+\s*clientes?)?\s*(\d+)?\s*clientes?/i,
  ];

  for (const padrao of padroes) {
    const match = texto.match(padrao);
    if (match) {
      const valor = parseFloat(match[2]?.replace(/[.,]/g, (m, i) => i === 0 ? "" : ".") || match[1]?.replace(/[.,]/g, (m, i) => i === 0 ? "" : ".") || "0");
      const clientes = parseInt(match[1] || match[2] || "1");

      if (valor > 0) {
        let categoria = "faturamento";
        if (lower.includes("marca")) categoria = "marcas_exclusivas";
        else if (lower.includes("genérico") || lower.includes("generico")) categoria = "genericos";
        else if (lower.includes("desconto") || lower.includes("super")) categoria = "super_desconto";

        return { valor, clientes: clientes > 0 ? clientes : 1, categoria };
      }
    }
  }

  return null;
}

export function useIAChat() {
  const { usuario } = useAuth();
  const [msgs, setMsgs] = useState<IAMessage[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [contextoDados, setContextoDados] = useState<string | undefined>(undefined);
  const call = useServerFn(chatIA);

  // Carregar contexto real ao montar
  useEffect(() => {
    if (usuario) {
      void buscarContextoReal(usuario).then(setContextoDados);
    }
  }, [usuario]);

  const sugestoes = usuario
    ? SUGESTOES_POR_PERFIL[usuario.perfil] || SUGESTOES_POR_PERFIL.vendedor
    : SUGESTOES_POR_PERFIL.vendedor;

  const enviar = useCallback(async (texto: string) => {
    const t = texto.trim();
    if (!t || carregando) return;

    // Detectar comando de lançamento de venda
    const comando = detectarComandoVenda(t);
    if (comando && usuario) {
      // Lançar venda automaticamente
      const hoje = new Date().toISOString().slice(0, 10);
      try {
        const { error } = await supabase.from("vendas_diarias").insert({
          usuario_id: usuario.id,
          filial_id: usuario.filialId || "7537",
          data: hoje,
          categoria: comando.categoria,
          valor_venda: comando.valor,
          qtd_clientes: comando.clientes,
        });

        if (error) throw new Error(error.message);

        // Sincronizar meta mensal
        const anoMes = hoje.slice(0, 7);
        const { data: vendasMes } = await supabase
          .from("vendas_diarias")
          .select("valor_venda")
          .eq("usuario_id", usuario.id)
          .eq("categoria", comando.categoria)
          .gte("data", `${anoMes}-01`)
          .lte("data", `${anoMes}-31`);

        const totalRealizado = (vendasMes || []).reduce((s, v) => s + Number(v.valor_venda), 0);
        await supabase
          .from("metas_individuais")
          .update({
            valor_realizado: totalRealizado,
            status: totalRealizado > 0 ? "em_andamento" : "pendente",
            atualizado_em: new Date().toISOString(),
          })
          .eq("usuario_id", usuario.id)
          .eq("periodo", "mensal")
          .eq("categoria", comando.categoria)
          .eq("data_inicio", `${anoMes}-01`);

        const tkm = (comando.clientes > 0 ? comando.valor / comando.clientes : 0).toFixed(2);
        const respostaIA = `✅ **Venda lançada com sucesso!**

📊 **Resumo do lançamento:**
- Valor: R$ ${comando.valor.toFixed(2)}
- Clientes: ${comando.clientes}
- Ticket médio: R$ ${tkm}
- Categoria: ${comando.categoria.replace(/_/g, " ")}
- Data: ${new Date().toLocaleDateString("pt-BR")}

💰 Sua meta de ${comando.categoria.replace(/_/g, " ")} foi atualizada automaticamente.

💡 Quer ver como está sua meta agora? Clique em "Metas" no menu!`;

        setMsgs((m) => [
          ...m,
          { role: "user", content: t },
          { role: "assistant", content: respostaIA },
        ]);

        // Recarregar contexto
        void buscarContextoReal(usuario).then(setContextoDados);
        return;
      } catch (e: any) {
        setMsgs((m) => [
          ...m,
          { role: "user", content: t },
          { role: "assistant", content: `❌ Erro ao lançar venda: ${e.message}` },
        ]);
        return;
      }
    }

    // Enviar para IA normalmente
    const novos: IAMessage[] = [...msgs, { role: "user", content: t }];
    setMsgs(novos);
    setCarregando(true);
    try {
      const r = await call({ data: { messages: novos, contexto: contextoDados } });
      setMsgs((m) => [...m, { role: "assistant", content: r.text }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${e?.message ?? "Erro na IA"}` }]);
    } finally {
      setCarregando(false);
    }
  }, [msgs, carregando, usuario, call, contextoDados]);

  const limpar = useCallback(() => setMsgs([]), []);

  return { msgs, carregando, enviar, limpar, sugestoes, usuario };
}
