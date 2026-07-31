"use client";

import { fmtBRL, fmtData, fmtPct, statusDe } from "@/lib/planilha/format";
import { StatusPill } from "@/components/planilha/kit";
import { SortableTable, type Column } from "@/components/planilha/ui/sortable-table";
import { EditSaleButton, DeleteSaleButton, type VendedorLite } from "@/components/planilha/data-manager";

const CATEGORIA_SLUG: Record<string, string> = {
  Faturamento: "faturamento",
  "Marcas Exclusivas": "marcas_exclusivas",
  "Genéricos": "genericos",
  "Super Desconto": "super_desconto",
};

export type VendaLinha = {
  id: number;
  data: string;
  vendedorId: number;
  vendedorNome: string;
  categoria: string;
  valor: number;
  clientes: number;
  ticketMedio: number;
};

export type IndicadorLinha = {
  id: number;
  vendedorNome: string;
  categoria: string;
  meta: number;
  realizado: number;
  projecao: number;
  atingimento: number;
};

export function VendasTable({ rows, vendedores }: { rows: VendaLinha[]; vendedores: VendedorLite[] }) {
  const columns: Column<VendaLinha>[] = [
    { key: "id", label: "#", sortable: true, value: (r) => r.id, render: (_r, i) => <span className="text-slate-400">{i + 1}</span> },
    { key: "data", label: "Data", sortable: true, value: (r) => r.data, render: (r) => fmtData(r.data) },
    { key: "vendedor", label: "Vendedor", sortable: true, value: (r) => r.vendedorNome, render: (r) => r.vendedorNome },
    { key: "categoria", label: "Categoria", sortable: true, value: (r) => r.categoria, render: (r) => r.categoria },
    { key: "valor", label: "Valor (R$)", align: "right", sortable: true, value: (r) => r.valor, render: (r) => <span className="font-semibold">{fmtBRL(r.valor)}</span> },
    { key: "clientes", label: "Clientes", align: "right", sortable: true, value: (r) => r.clientes, render: (r) => r.clientes },
    { key: "ticket", label: "Ticket Médio", align: "right", sortable: true, value: (r) => r.ticketMedio, render: (r) => fmtBRL(r.ticketMedio) },
    {
      key: "acoes", label: "Ações", align: "center", render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <EditSaleButton
            venda={{ id: r.id, data: r.data, vendedorId: r.vendedorId, categoria: CATEGORIA_SLUG[r.categoria] ?? "faturamento", valor: r.valor, clientes: r.clientes }}
            vendedores={vendedores}
          />
          <DeleteSaleButton venda={{ id: r.id, data: r.data, vendedorId: r.vendedorId, categoria: r.categoria, valor: r.valor, clientes: r.clientes }} />
        </div>
      ),
    },
  ];
  return (
    <SortableTable
      columns={columns}
      rows={rows}
      initialSort={{ key: "data", dir: "desc" }}
      searchFields={(r) => [r.vendedorNome, r.categoria, fmtData(r.data), String(r.valor)]}
      searchPlaceholder="Buscar por vendedor, categoria, data ou valor..."
      emptyLabel="Nenhum lançamento no período selecionado"
    />
  );
}

export function IndicadoresTable({ rows }: { rows: IndicadorLinha[] }) {
  const columns: Column<IndicadorLinha>[] = [
    { key: "vendedor", label: "Vendedor", sortable: true, value: (r) => r.vendedorNome, render: (r) => r.vendedorNome },
    { key: "categoria", label: "Categoria", sortable: true, value: (r) => r.categoria, render: (r) => r.categoria },
    { key: "meta", label: "Meta (R$)", align: "right", sortable: true, value: (r) => r.meta, render: (r) => fmtBRL(r.meta) },
    { key: "realizado", label: "Realizado (R$)", align: "right", sortable: true, value: (r) => r.realizado, render: (r) => <span className="font-semibold">{fmtBRL(r.realizado)}</span> },
    { key: "projecao", label: "Projeção (R$)", align: "right", sortable: true, value: (r) => r.projecao, render: (r) => fmtBRL(r.projecao) },
    { key: "atingimento", label: "% Atingimento", align: "center", sortable: true, value: (r) => r.atingimento, render: (r) => <span className="font-bold">{fmtPct(r.atingimento)}</span> },
    { key: "status", label: "Status", align: "center", render: (r) => <StatusPill status={statusDe(r.atingimento)} /> },
  ];
  return (
    <SortableTable
      rows={rows}
      initialSort={{ key: "atingimento", dir: "desc" }}
      searchFields={(r) => [r.vendedorNome, r.categoria]}
      searchPlaceholder="Buscar indicador por vendedor ou categoria..."
      columns={columns}
    />
  );
}
