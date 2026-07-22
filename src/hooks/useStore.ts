import { useSyncExternalStore, useCallback } from "react";
import { store, subscribeStore } from "../data/store";

let snap = 0;

/**
 * Hook reativo do DataStore.
 * Qualquer mutação (add/update/delete) notifica e re-renderiza consumidores.
 */
export function useStore() {
  const getSnapshot = useCallback(() => {
    // Incrementado indiretamente via subscribe; usamos contador global
    return snap;
  }, []);

  const subscribe = useCallback((onStoreChange: () => void) => {
    return subscribeStore(() => {
      snap += 1;
      onStoreChange();
    });
  }, []);

  const version = useSyncExternalStore(subscribe, getSnapshot, () => 0);

  return { store, version };
}
