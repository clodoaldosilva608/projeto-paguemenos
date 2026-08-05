// Lovable Cloud Auth integration — DESATIVADA (2026-08-05)
//
// O erro "Unregistered API key" vinha do @lovable.dev/cloud-auth-js quando
// ele tentava validar algo com a Lovable Cloud API. Como não usamos mais
// o Lovable OAuth (usamos Supabase nativo), a integração foi removida.
//
// Mantemos o export `lovable` como no-op para compatibilidade com código
// que ainda referencia `lovable.auth.signInWithOAuth`.

export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string, _opts?: any) => {
      console.warn("[lovable] OAuth desativado — use supabase.auth.signInWithOAuth direto");
      return { error: new Error("Lovable OAuth desativado") };
    },
  },
};

