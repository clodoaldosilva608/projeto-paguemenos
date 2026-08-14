// Definição neutra das abas para consumo por client e server components.
export const TABS = [
  { slug: "dashboard", label: "01 - Dashboard Geral" },
  { slug: "faturamento", label: "02 - Faturamento" },
  { slug: "marcas", label: "03 - Marcas Exclusivas" },
  { slug: "genericos", label: "04 - Genéricos" },
  { slug: "super-desconto", label: "05 - Super Desconto" },
  { slug: "historico", label: "06 - Histórico de Vendas" },
  { slug: "alicia", label: "07 - Alicia Vital" },
  { slug: "clodoaldo", label: "08 - Clodoaldo Conceição" },
  { slug: "adelino", label: "09 - Adelino Francisco" },
  { slug: "elielton", label: "10 - Elielton Pessoa" },
  { slug: "fabio", label: "11 - Fabio Inacio" },
  { slug: "mieko", label: "12 - Mieko Costa" },
  { slug: "equipe", label: "13 - Gestão de Equipe" },
  { slug: "auditoria", label: "14 - Auditoria & Importação" },
  { slug: "formulas", label: "15 - Fórmulas" },
  { slug: "manual", label: "16 - Manual de Uso" },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];
