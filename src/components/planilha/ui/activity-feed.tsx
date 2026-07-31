import { fmtBRL, fmtData } from "@/lib/planilha/format";

export type FeedItem = {
  id: string;
  tipo: "venda" | "auditoria";
  titulo: string;
  detalhe: string;
  quando: string;
  valor?: number;
  icone: string;
  cor: string;
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return <div className="flex h-[160px] items-center justify-center text-[11px] text-slate-400">Nenhuma atividade recente</div>;
  }

  return (
    <div className="relative flex flex-col gap-0 pl-3">
      <div
        className="absolute bottom-2 left-[18px] top-2 w-px origin-top bg-gradient-to-b from-[#1a56c5]/40 via-slate-200 to-transparent"
        style={{ animation: "grow-up 700ms cubic-bezier(0.16,1,0.3,1) both" }}
      />
      {items.map((item, i) => (
        <div
          key={item.id}
          className="group relative flex gap-3 rounded-lg py-2.5 pr-2 rise-left transition-all duration-200 hover:translate-x-1 hover:bg-slate-50"
          style={{ animationDelay: `${i * 95}ms` }}
        >
          <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center">
            {/* halo pulsante apenas no evento mais recente */}
            {i === 0 && (
              <span
                className="absolute inset-0 rounded-full heartbeat"
                style={{ background: item.cor + "33", animationDelay: `${i * 95 + 500}ms` }}
                aria-hidden
              />
            )}
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full text-[12px] shadow-sm ring-2 ring-white transition-transform duration-200 group-hover:scale-110 svg-pop"
              style={{ background: item.cor + "22", color: item.cor, animationDelay: `${i * 95 + 130}ms` }}
            >
              {item.icone}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[11px] font-bold text-slate-800">{item.titulo}</span>
                  {i === 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-px text-[8px] font-bold uppercase tracking-wide text-emerald-700 animate-pulse-soft">
                      novo
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] text-slate-500">{item.detalhe}</div>
              </div>
              {item.valor !== undefined && (
                <span className="shrink-0 text-[11px] font-extrabold text-[#1a56c5] transition-transform duration-200 group-hover:scale-105">
                  {fmtBRL(item.valor)}
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{item.quando}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper server-side para montar o feed a partir dos dados do dashboard
export function montarFeed(
  vendas: { id: number; data: string; vendedorNome: string; categoria: string; valor: number }[],
  auditoria: { id: number; criadoEm: string; acao: string; descricao: string; valorDepois?: string }[],
): FeedItem[] {
  const ACAO_ICON: Record<string, string> = {
    criar: "➕", editar: "✎", excluir: "🗑", meta: "🎯", importar: "⬆", sync: "⟳",
  };
  const ACAO_COR: Record<string, string> = {
    criar: "#16a34a", editar: "#f59e0b", excluir: "#dc2626", meta: "#6d28d9", importar: "#0891b2", sync: "#64748b",
  };

  const fromVendas: FeedItem[] = [...vendas]
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id)
    .slice(0, 6)
    .map((v) => ({
      id: `v-${v.id}`,
      tipo: "venda" as const,
      titulo: v.vendedorNome,
      detalhe: `${v.categoria} · ${fmtData(v.data)}`,
      quando: fmtData(v.data),
      valor: v.valor,
      icone: "🛒",
      cor: "#1a56c5",
    }));

  const fromAudit: FeedItem[] = auditoria.slice(0, 6).map((a) => ({
    id: `a-${a.id}`,
    tipo: "auditoria" as const,
    titulo: a.descricao,
    detalhe: a.valorDepois || a.acao,
    quando: new Date(a.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
    icone: ACAO_ICON[a.acao] ?? "•",
    cor: ACAO_COR[a.acao] ?? "#64748b",
  }));

  // Intercala priorizando auditoria recente se existir, senão vendas
  return [...fromAudit, ...fromVendas].slice(0, 8);
}
