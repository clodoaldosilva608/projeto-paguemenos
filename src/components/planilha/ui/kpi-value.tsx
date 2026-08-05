"use client";

import { AnimatedNumber } from "@/components/planilha/ui/animated-number";

export type KpiFormat = "brl" | "pct" | "int" | "plain";

function formatByType(type: KpiFormat) {
  return (n: number) => {
    if (type === "brl") {
      return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
    }
    if (type === "pct") {
      return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
    }
    if (type === "int") {
      return String(Math.round(n));
    }
    return String(n);
  };
}

// Wrapper client para valores de KPI animados (sem receber funções do server).
export function KpiValue({
  value,
  format = "plain",
  fallback,
}: {
  value: number;
  format?: KpiFormat;
  fallback: string;
}) {
  return <AnimatedNumber value={value} format={formatByType(format)} />;
}
