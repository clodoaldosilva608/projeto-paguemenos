import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  icone: string;
  cor: string;
  ativo: boolean;
  ordem: number;
}

export function useQuickLinks(includeInactive = false) {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("quick_links").select("id,label,url,icone,cor,ativo,ordem").order("ordem", { ascending: true });
    if (!includeInactive) q = q.eq("ativo", true);
    const { data } = await q;
    setLinks((data ?? []) as QuickLink[]);
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => { void load(); }, [load]);

  return { links, loading, reload: load };
}
