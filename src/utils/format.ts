export function brl(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function brlMoeda(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—";
  return `R$ ${brl(value, digits)}`;
}

export function pct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function numero(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
