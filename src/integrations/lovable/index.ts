// Lovable removido completamente do projeto (2026-08-05)
// Esta pasta existe apenas para compatibilidade de imports — não faz nada.
export const lovable = {
  auth: {
    signInWithOAuth: async () => ({ error: new Error("OAuth removido") }),
  },
};
