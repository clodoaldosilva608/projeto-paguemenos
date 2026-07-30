import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook que retorna o filial_id do usuário logado.
 * - Admin master: retorna undefined (vê todas as filiais)
 * - Gerente/supervisor/vendedor: retorna o filial_id (vê apenas sua filial)
 *
 * Uso:
 * const filialId = useFilialFilter();
 * const { data } = await supabase.from("vendas_diarias").select("*").eq("filial_id", filialId);
 */
export function useFilialFilter(): string | undefined {
  const { usuario } = useAuth();

  // Admin master vê todas as filiais (não filtra)
  if (usuario?.perfil === "admin") {
    return undefined;
  }

  // Demais perfis veem apenas dados da sua filial
  return usuario?.filialId;
}

/**
 * Retorna true se o usuário é admin master (vê todas as filiais)
 */
export function useIsAdminMaster(): boolean {
  const { usuario } = useAuth();
  return usuario?.perfil === "admin";
}

/**
 * Retorna true se o usuário pode ver todas as filiais (admin ou gerente)
 * Gerente tem acesso total às ferramentas como um admin, mas apenas da sua filial
 */
export function useCanSeeAllFiliais(): boolean {
  const { usuario } = useAuth();
  return usuario?.perfil === "admin";
}
