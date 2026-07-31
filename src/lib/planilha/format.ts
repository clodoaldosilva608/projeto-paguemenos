// Funções puras de formatação para a Planilha Interna.
export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}
export function fmtPct(v: number, digits = 1): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + "%";
}
export function fmtData(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
export function fmtInt(v: number): string {
  return v.toLocaleString("pt-BR");
}
export function statusDe(pct: number): "Dentro da Meta" | "Atenção" | "Fora da Meta" {
  if (pct >= 70) return "Dentro da Meta";
  if (pct >= 30) return "Atenção";
  return "Fora da Meta";
}
export function corDe(pct: number): string {
  if (pct >= 100) return "#16a34a";
  if (pct >= 70) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  if (pct >= 30) return "#f97316";
  return "#dc2626";
}

export const CATEGORIAS = ["Faturamento", "Marcas Exclusivas", "Genéricos", "Super Desconto"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const CATEGORIA_PARA_SLUG: Record<Categoria, string> = {
  Faturamento: "faturamento",
  "Marcas Exclusivas": "marcas_exclusivas",
  Genéricos: "genericos",
  "Super Desconto": "super_desconto",
};
export const SLUG_PARA_CATEGORIA: Record<string, Categoria> = {
  faturamento: "Faturamento",
  marcas_exclusivas: "Marcas Exclusivas",
  genericos: "Genéricos",
  super_desconto: "Super Desconto",
};

export const CATEGORIA_CORES: Record<Categoria, string> = {
  Faturamento: "#1a56c5",
  "Marcas Exclusivas": "#f59e0b",
  Genéricos: "#16a34a",
  "Super Desconto": "#dc2626",
};

export const CATEGORIA_ICONES: Record<Categoria, string> = {
  Faturamento: "🛒",
  "Marcas Exclusivas": "🏷️",
  Genéricos: "💊",
  "Super Desconto": "💰",
};
