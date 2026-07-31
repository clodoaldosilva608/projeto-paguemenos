// Funções puras de formatação — seguras para uso em client e server components.
export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
export function fmtPct(v: number, digits = 2): string {
  return (
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }) + "%"
  );
}
export function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
export function statusDe(pct: number): "Dentro da Meta" | "Atenção" | "Fora da Meta" {
  if (pct >= 70) return "Dentro da Meta";
  if (pct >= 30) return "Atenção";
  return "Fora da Meta";
}

// Categorias (adicionado para compatibilidade com data.ts e componentes do zip)
export const CATEGORIAS = [
  "Faturamento",
  "Marcas Exclusivas",
  "Genéricos",
  "Super Desconto",
] as const;
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
