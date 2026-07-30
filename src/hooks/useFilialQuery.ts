import { useFilial } from "@/contexts/FilialContext";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook que retorna o filtro de filial para usar em queries Supabase.
 *
 * Comportamento:
 * - Admin com "Todas as Filiais": retorna undefined (não filtra)
 * - Admin com filial específica selecionada: retorna o filial_id
 * - Gerente: retorna equipe_id (filtra por equipe)
 * - Supervisor/Vendedor/Farmacêutica: retorna filial_id (filtra por filial)
 *
 * Uso:
 * const filtro = useFilialQuery();
 * let query = supabase.from("vendas_diarias").select("*");
 * if (filtro.filialId) query = query.eq("filial_id", filtro.filialId);
 * if (filtro.equipeId) query = query.eq("equipe_id", filtro.equipeId);
 */
export function useFilialQuery() {
  const { filialFiltro, isTodasFiliais } = useFilial();
  const { usuario } = useAuth();

  const isAdmin = usuario?.perfil === "admin";
  const isGerente = usuario?.perfil === "gerente";

  // Admin com "Todas" não filtra
  if (isAdmin && isTodasFiliais) {
    return { filialId: undefined, equipeId: undefined };
  }

  // Admin com filial específica selecionada → filtra por filial_id
  if (isAdmin && !isTodasFiliais) {
    return { filialId: filialFiltro, equipeId: undefined };
  }

  // Gerente → filtra por equipe_id (sua equipe)
  if (isGerente) {
    return { filialId: undefined, equipeId: usuario?.equipeId };
  }

  // Supervisor/Vendedor/Farmacêutica → filtra por filial_id (sua filial)
  return { filialId: usuario?.filialId, equipeId: undefined };
}
