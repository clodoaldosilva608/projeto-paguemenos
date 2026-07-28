import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { puxarVendasDoSheet } from "@/lib/sheets.functions";
import { vendasStore } from "@/data/vendasStore";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Poll o Google Sheets configurado a cada `intervalMs`. Faz o merge dos dados
 * no vendasStore respeitando linhas editadas manualmente pelo usuário (origem
 * "manual" nunca é sobrescrita).
 *
 * 🔒 Segurança: a sincronização só roda para admin/gerente. A server fn
 * `puxarVendasDoSheet` exige `ensureGestor`, e o hook checa o perfil aqui
 * para evitar requests desnecessários (e logs de erro) para vendedores.
 */
export function useAutoSync(intervalMs = 60_000) {
  const { autenticado, usuario } = useAuth();
  const puxar = useServerFn(puxarVendasDoSheet);
  const rodando = useRef(false);

  const podeSincronizar = usuario?.perfil === "admin" || usuario?.perfil === "gerente";

  useEffect(() => {
    if (!autenticado || !podeSincronizar || typeof window === "undefined") return;

    const rodar = async () => {
      if (rodando.current) return;
      rodando.current = true;
      try {
        const r: any = await puxar();
        if (r && Array.isArray(r.rows) && r.rows.length > 0) {
          vendasStore.mergeFromSheet(r.rows);
        }
      } catch {
        /* silencioso */
      } finally {
        rodando.current = false;
      }
    };

    void rodar();
    const id = window.setInterval(rodar, intervalMs);
    return () => window.clearInterval(id);
  }, [autenticado, podeSincronizar, puxar, intervalMs]);
}
