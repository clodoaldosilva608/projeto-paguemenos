import { useState, useCallback } from "react";
export function useRouter() { return { push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }; }
export function usePathname() { return "/planilha-interna"; }
export function useSearchParams() { return new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""); }
export function useTransition() {
  const [p, sp] = useState(false);
  const st = useCallback((cb: () => void) => { sp(true); try { cb(); } finally { sp(false); } }, []);
  return [p, st] as const;
}
