import { type DashboardData } from "@/lib/planilha/data";
import { AuditoriaTable, type AtividadeLinha } from "@/components/planilha/tabs/auditoria-table";
import { ImportCsvButton } from "@/components/planilha/import-csv";

export function Auditoria({ d }: { d: DashboardData }) {
  const linhas: AtividadeLinha[] = d.auditoria;

  const conta = (a: string) => linhas.filter((l) => l.acao === a).length;
  const porEntidade = (e: string) => linhas.filter((l) => l.entidade === e).length;
  const ultima = linhas[0];

  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="border-l border-[#28518f] pl-5">
            <h1 className="text-xl font-extrabold uppercase text-white">Auditoria e Importação</h1>
            <p className="text-[11px] text-sky-200">
              Trilha completa de alterações na planilha e importação de lançamentos em massa
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard dark bg="#0d3b66" icon="📜" title="Total de Eventos" value={String(linhas.length)} subtitle="Últimos 300 registros" />
        <KpiCard dark bg="#0e7a5f" icon="➕" title="Criações" value={String(conta("criar"))} subtitle="Vendas e funcionários" />
        <KpiCard dark bg="#e08700" icon="✎" title="Edições" value={String(conta("editar"))} subtitle="Alterações de cadastro" />
        <KpiCard dark bg="#b91c1c" icon="🗑" title="Exclusões" value={String(conta("excluir"))} subtitle="Registros removidos" />
        <KpiCard dark bg="#6d28d9" icon="🎯" title="Ajustes de Meta" value={String(conta("meta"))} subtitle="Metas reconfiguradas" />
        <KpiCard dark bg="#0891b2" icon="⬆" title="Importações" value={String(conta("importar"))} subtitle="Cargas em massa" />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel title="Importação de Lançamentos em Massa" icon="⬆" className="xl:col-span-2">
          <div className="flex flex-col gap-3 pt-1">
            <p className="text-[11px] leading-relaxed text-slate-600">
              Carregue um arquivo CSV com múltiplos lançamentos de uma só vez. O sistema valida cada linha,
              reconhece o vendedor por <strong>nome ou matrícula</strong>, normaliza datas e valores, e atualiza
              automaticamente os indicadores de realizado e projeção. Linhas inválidas são reportadas sem
              interromper a importação das demais.
            </p>
            <div className="flex flex-wrap gap-2">
              <ImportCsvButton />
              <a href="/api/export/csv" className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                ⬇ Baixar base atual (.csv)
              </a>
              <a href="/api/atividades" target="_blank" rel="noopener" className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
                🔗 Ver auditoria em JSON
              </a>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-600">
              Data;Vendedor;Categoria;Valor;Clientes<br />
              28/07/2026;Adelino Francisco dos Santos;Faturamento;1500,00;12<br />
              28/07/2026;70211738;Genéricos;820,50;7
            </div>
          </div>
        </Panel>

        <Panel title="Distribuição dos Eventos" icon="📊">
          <div className="flex flex-col gap-2.5 pt-1">
            {[
              { label: "Vendas", valor: porEntidade("venda"), cor: "#1a56c5" },
              { label: "Funcionários", valor: porEntidade("funcionario"), cor: "#6d28d9" },
              { label: "Metas", valor: porEntidade("meta"), cor: "#0e7a5f" },
              { label: "Sistema", valor: porEntidade("sistema"), cor: "#64748b" },
            ].map((e) => {
              const pct = linhas.length > 0 ? (e.valor / linhas.length) * 100 : 0;
              return (
                <div key={e.label}>
                  <div className="mb-1 flex items-center justify-between text-[10.5px]">
                    <span className="font-semibold text-slate-700">{e.label}</span>
                    <span className="font-bold text-slate-800">{e.valor}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: e.cor }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[10px] leading-relaxed text-slate-600">
              {ultima ? (
                <>
                  <strong>Último evento:</strong> {ultima.descricao}
                  <br />
                  <span className="text-slate-400">
                    {new Date(ultima.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </>
              ) : (
                "Nenhuma alteração registrada ainda. Ao criar, editar ou excluir dados, os eventos aparecerão aqui."
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div className="overflow-hidden rounded-lg shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-[#1c4585] bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white">
          <span>Trilha de Auditoria ({linhas.length} eventos)</span>
          <span className="text-sky-200">Todo lançamento, edição, exclusão e meta fica registrado</span>
        </div>
        <AuditoriaTable rows={linhas} />
      </div>

      <DashFooter />
    </div>
  );
}
