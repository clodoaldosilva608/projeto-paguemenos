// =============================================================
// ORION · Hook reativo para o store de vendas
// =============================================================
import { useSyncExternalStore, useCallback } from "react";
import { vendasStore, subscribeVendas } from "../data/vendasStore";

let snap = 0;

export function useVendasStore() {
  const getSnapshot = useCallback(() => snap, []);
  const subscribe = useCallback((cb: () => void) => {
    return subscribeVendas(() => {
      snap += 1;
      cb();
    });
  }, []);
  const version = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  return { store: vendasStore, version };
}
