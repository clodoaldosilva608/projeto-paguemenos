// Tipos de filtro compartilhados por client e server — sem dependências de banco.
export type PeriodoRapido = "7d" | "3d" | "mes" | "custom";

export interface DashboardFilters {
  inicio: string;
  fim: string;
  vendedorId: number | null;
  periodo: PeriodoRapido;
}

export interface DashboardFilterInput {
  inicio?: string;
  fim?: string;
  vendedor?: string;
  periodo?: string;
}
