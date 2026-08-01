import {  DashFooter } from "@/components/planilha/kit";

// ── 13 - Fórmulas ────────────────────────────────────────────────────────────
export const FORMULAS: { grupo: string; itens: { nome: string; formula: string; desc: string }[] }[] = [
  {
    grupo: "KPIs Principais",
    itens: [
      {
        nome: "Vendas do Período (R$)",
        formula:
          `=SOMASES('06 - Histórico de Vendas'!$D:$D;'06 - Histórico de Vendas'!$A:$A;">="&$C$4;'06 - Histórico de Vendas'!$A:$A;"<="&$D$4)`,
        desc: "Soma o valor de todos os lançamentos de venda dentro do período selecionado (Data Início C4 / Data Fim D4). Resultado do payload: R$ 14.100,00.",
      },
      {
        nome: "Realizado por Categoria",
        formula:
          `=SOMASES(Indicadores!$D:$D;Indicadores!$B:$B;$B7)`,
        desc: "Realizado sincronizado da categoria informada em B7 (Faturamento, Marcas Exclusivas, Genéricos, Super Desconto). Total geral: R$ 700.280,00.",
      },
      {
        nome: "Realizado por Vendedor",
        formula:
          `=SOMASES(Indicadores!$D:$D;Indicadores!$A:$A;$B7;Indicadores!$B:$B;$C7)`,
        desc: "Realizado do vendedor + categoria a partir da aba Indicadores. Usado nas abas individuais (07 a 09).",
      },
      {
        nome: "Meta Total",
        formula: `=SOMA(Indicadores!$C:$C)`,
        desc: "Soma de todas as metas sincronizadas por vendedor e categoria. Resultado do payload: R$ 1.014.447,91.",
      },
    ],
  },
  {
    grupo: "Indicadores Derivados",
    itens: [
      {
        nome: "% Atingimento",
        formula: `=SEERRO(Realizado/Meta;0)`,
        desc: "Percentual da meta atingido. SEERRO evita #DIV/0! quando a meta é zero. Formatar como porcentagem.",
      },
      {
        nome: "Projeção de Fechamento",
        formula: `=Realizado/DiasÚteisDecorridos*DiasÚteisTotais`,
        desc: "Projeta o fechamento assumindo o ritmo médio diário atual. Ex.: =E7/DIATRABALHOTOTAL($C$4;HOJE())*DIATRABALHOTOTAL($C$4;$D$4).",
      },
      {
        nome: "Ticket Médio",
        formula: `=SEERRO(Realizado/TotalTransações;0)`,
        desc: "Valor médio por venda: faturamento dividido pelo número de transações do período.",
      },
      {
        nome: "Status da Meta",
        formula: `=IFS(F7>=70%;"Dentro da Meta";F7>=30%;"Atenção";VERDADEIRO;"Fora da Meta")`,
        desc: "Classificação automática: ≥70% Dentro da Meta (verde) · 30–69,99% Atenção (amarelo) · <30% Fora da Meta (vermelho).",
      },
      {
        nome: "Variação vs Período Anterior",
        formula: `=SEERRO((Atual-Anterior)/Anterior;"—")`,
        desc: "Crescimento percentual em relação ao período imediatamente anterior de mesma duração.",
      },
      {
        nome: "Variação Absoluta",
        formula: `=PeríodoAtual-PeríodoAnterior`,
        desc: "Diferença em R$ entre os dois períodos (usada na Análise Comparativa).",
      },
    ],
  },
  {
    grupo: "Rankings e Classificações",
    itens: [
      {
        nome: "Posição no Ranking",
        formula: `=ORDEM(D7;$D$7:$D$9;0)`,
        desc: "Posição do vendedor pelo realizado (0 = ordem decrescente). Em inglês: RANK.",
      },
      {
        nome: "Top N Dias",
        formula: `=QUERY('06 - Histórico de Vendas'!A:F;"select A, sum(F) group by A order by sum(F) desc limit 5";1)`,
        desc: "Google Sheets: retorna os 5 melhores dias por faturamento. No Excel use Tabela Dinâmica ou CLASSIFICAR+SOMASES.",
      },
      {
        nome: "Maior Valor / Nome",
        formula: `=ÍNDICE($B$7:$B$9;CORRESP(MAIOR($D$7:$D$9;1);$D$7:$D$9;0))`,
        desc: "Retorna o nome do vendedor com maior realizado (1º lugar). Troque o 1 por 2 ou 3 para as demais medalhas.",
      },
      {
        nome: "Distribuição por Faixa",
        formula: `=IFS(D7>10000;"Acima de R$ 10.000,00";D7>5000;"De R$ 5.000,01 até R$ 10.000,00";VERDADEIRO;"Até R$ 5.000,00")`,
        desc: "Classifica cada vendedor/venda em faixas de valor para o gráfico de rosca de distribuição.",
      },
    ],
  },
  {
    grupo: "Contagens e Auxiliares",
    itens: [
      {
        nome: "Total de Clientes",
        formula: `=SOMASES('06 - Histórico de Vendas'!$E:$E;'06 - Histórico de Vendas'!$A:$A;">="&$C$4;'06 - Histórico de Vendas'!$A:$A;"<="&$D$4)`,
        desc: "Soma a coluna Qtd. Clientes no período. Resultado do payload: 180 clientes.",
      },
      {
        nome: "Ticket Médio Geral",
        formula: `=SEERRO(TotalVendas/TotalClientes;0)`,
        desc: "Valor total das vendas dividido pelos clientes atendidos: 14.100 ÷ 180 = R$ 78,33.",
      },
      {
        nome: "Vendedores Ativos",
        formula: `=CONT.VALORES(ÚNICO(FILTRO('06 - Histórico de Vendas'!B:B;'06 - Histórico de Vendas'!A:A>=$C$4;'06 - Histórico de Vendas'!A:A<=$D$4)))`,
        desc: "Conta vendedores distintos com lançamentos no período (Google Sheets). Resultado: 3 ativos.",
      },
      {
        nome: "Participação (%)",
        formula: `=SEERRO(ValorDaLinha/TotalGeral;0)`,
        desc: "Percentual de participação de cada categoria/marca/vendedor sobre o total (gráficos de pizza/rosca).",
      },
      {
        nome: "Última Sincronização",
        formula: `=TEXTO(AGORA();"dd/mm/aaaa hh:mm")`,
        desc: "Carimbo de data/hora exibido no cabeçalho. Atualizado pelo botão SINCRONIZAR (Apps Script / recálculo).",
      },
    ],
  },
];

export function Formulas() {
  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="border-l border-[#28518f] pl-5">
            <h1 className="text-xl font-extrabold text-white uppercase">Fórmulas de Uso</h1>
            <p className="text-[11px] text-sky-200">
              Todas as fórmulas utilizadas na planilha — referência completa para manutenção e auditoria
            </p>
          </div>
        </div>
        <a
          href="/api/export"
          className="rounded-md bg-[#1a56c5] hover:bg-[#1d63e0] px-4 py-2 text-[11px] font-bold text-white uppercase tracking-wide"
        >
          ⬇ Baixar Planilha (.xlsx)
        </a>
      </div>

      {FORMULAS.map((g) => (
        <div key={g.grupo} className="rounded-lg overflow-hidden shadow-md">
          <div className="bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white border border-[#1c4585]">
            {g.grupo}
          </div>
          <table className="w-full bg-white text-[11px]">
            <thead>
              <tr className="bg-[#12315e] text-white text-[10px] uppercase">
                <th className="px-3 py-2 text-left w-[200px]">Indicador</th>
                <th className="px-3 py-2 text-left">Fórmula</th>
                <th className="px-3 py-2 text-left w-[320px]">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {g.itens.map((f, i) => (
                <tr key={f.nome} className={`border-b border-slate-100 align-top ${i % 2 ? "bg-slate-50" : ""}`}>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{f.nome}</td>
                  <td className="px-3 py-2.5">
                    <code className="block rounded bg-slate-100 border border-slate-200 px-2 py-1.5 text-[10px] text-[#1a56c5] break-all">
                      {f.formula}
                    </code>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <DashFooter />
    </div>
  );
}

// ── 14 - Manual de Uso ───────────────────────────────────────────────────────
export const MANUAL: { titulo: string; icone: string; linhas: string[] }[] = [
  {
    titulo: "1. Visão Geral",
    icone: "📋",
    linhas: [
      "A planilha Orionn — Dashboard Executivo consolida o desempenho comercial da loja em 11 abas.",
      "Abas 01 a 05: dashboards analíticos (Geral, Faturamento, Marcas Exclusivas, Genéricos e Super Desconto).",
      "Aba 06: Histórico de Vendas — é a BASE DE DADOS. Todas as fórmulas leem desta aba.",
      "Abas 07 a 12: painéis individuais de Adelino, Alicia, Clodoaldo, Elielton, Fabio e Mieko.",
      "Aba 13: Gestão de Equipe — cadastro completo, status e desempenho de todos os funcionários.",
      "Aba 14: Auditoria & Importação — trilha de todas as alterações e carga de lançamentos via CSV.",
      "Abas 15 e 16: referência de fórmulas e este manual.",
      "Atalhos: Ctrl+K abre a paleta de comandos · ? mostra o guia de teclado · o botão 🔔 no topo lista as notificações recentes.",
    ],
  },
  {
    titulo: "2. Como Usar os Filtros",
    icone: "🎛️",
    linhas: [
      "Período: escolha um intervalo pré-definido (Últimos 7 dias, Mês atual, etc.). Ele preenche Data Início e Data Fim automaticamente.",
      "Data Início / Data Fim: podem ser ajustadas manualmente para qualquer intervalo.",
      "Vendedor: filtra todos os KPIs, gráficos e tabelas por um vendedor específico (ou Todos).",
      "Loja / Filial: seleciona a unidade quando houver mais de uma filial sincronizada.",
      "Botão SINCRONIZAR: importa os dados mais recentes (Supabase → Google Sheets) e atualiza o carimbo de Última Sincronização.",
    ],
  },
  {
    titulo: "3. Alimentando a Base de Dados (Aba 06)",
    icone: "🗄️",
    linhas: [
      "Cada linha representa um lançamento de venda com: Data, Vendedor, Categoria, Marca (opcional), Valor, Clientes e Transações.",
      "Nunca deixe linhas em branco no meio da base — as fórmulas SOMASES varrem as colunas inteiras.",
      "Categorias válidas: Faturamento, Marcas Exclusivas, Genéricos e Super Desconto (escreva exatamente assim).",
      "Datas no formato dd/mm/aaaa. Valores sem R$ — a formatação de moeda é automática.",
      "Novos vendedores: basta lançar vendas com o novo nome e criar a meta correspondente; os rankings se ajustam sozinhos.",
    ],
  },
  {
    titulo: "4. Metas",
    icone: "🎯",
    linhas: [
      "As metas são cadastradas por categoria (meta da loja) e por vendedor+categoria (metas individuais).",
      "A Meta Total do Dashboard Geral é a soma das metas de todas as categorias.",
      "O % Atingimento compara Realizado ÷ Meta e alimenta o Status automaticamente.",
    ],
  },
  {
    titulo: "5. Interpretando os Indicadores",
    icone: "📊",
    linhas: [
      "REALIZADO: soma das vendas do período filtrado.",
      "PROJEÇÃO: estimativa de fechamento mantendo o ritmo médio diário atual (Realizado ÷ dias decorridos × dias totais).",
      "STATUS: verde (≥70% da meta) = Dentro da Meta · amarelo (30% a 69,99%) = Atenção · vermelho (<30%) = Fora da Meta.",
      "Δ vs PERÍODO ANTERIOR: compara com o intervalo imediatamente anterior de mesma duração (setas verdes = crescimento, vermelhas = queda).",
      "TICKET MÉDIO: Realizado ÷ número de transações.",
      "MEDALHAS (1º, 2º, 3º): posição de cada vendedor no ranking de realizado da aba correspondente.",
    ],
  },
  {
    titulo: "6. Boas Práticas e Manutenção",
    icone: "🛠️",
    linhas: [
      "As abas de dashboard são protegidas (cadeado) — edite apenas a aba 06 e as metas.",
      "Não renomeie as abas: as fórmulas referenciam os nomes exatos (ex.: '06 - Histórico de Vendas').",
      "Faça backup antes de alterações estruturais (Arquivo → Fazer uma cópia).",
      "Para exportar esta planilha em Excel com todas as fórmulas e formatações, use o botão 'Baixar Planilha (.xlsx)'.",
      "Dúvidas sobre uma fórmula específica? Consulte a aba 13 - Fórmulas, que documenta cada cálculo usado.",
    ],
  },
  {
    titulo: "7. Suporte",
    icone: "💬",
    linhas: [
      "Relatório gerado automaticamente pelo Sistema Orionn.",
      "Fonte dos dados: Supabase → Google Sheets → Power BI.",
      "Em caso de divergência de números, execute SINCRONIZAR e confira o carimbo de Última Sincronização no cabeçalho.",
    ],
  },
];

export function Manual() {
  return (
    <div className="min-h-full bg-[#0a1f3d] p-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="border-l border-[#28518f] pl-5">
            <h1 className="text-xl font-extrabold text-white uppercase">Manual de Uso</h1>
            <p className="text-[11px] text-sky-200">
              Guia completo de operação da planilha Orionn — Dashboard Executivo
            </p>
          </div>
        </div>
        <a
          href="/api/export"
          className="rounded-md bg-[#1a56c5] hover:bg-[#1d63e0] px-4 py-2 text-[11px] font-bold text-white uppercase tracking-wide"
        >
          ⬇ Baixar Planilha (.xlsx)
        </a>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {MANUAL.map((s) => (
          <div key={s.titulo} className="rounded-lg bg-white shadow-md overflow-hidden">
            <div className="bg-[#0d2b57] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              <span>{s.icone}</span> {s.titulo}
            </div>
            <ul className="p-4 flex flex-col gap-2">
              {s.linhas.map((l, i) => (
                <li key={i} className="flex gap-2 text-[11px] text-slate-700 leading-relaxed">
                  <span className="text-[#1a56c5] font-bold shrink-0">•</span>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <DashFooter />
    </div>
  );
}
