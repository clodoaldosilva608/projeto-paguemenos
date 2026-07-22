import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { Usuario, Perfil, Permissao } from "../types/core";
import { gerarPermissoes } from "../data/store";
import { criarUsuarioConfirmado } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";

interface AuthContexto {
  usuario: Usuario | null;
  session: Session | null;
  autenticado: boolean;
  carregando: boolean;
  erro: string | null;
  login: (email: string, senha: string) => Promise<boolean>;
  cadastrar: (email: string, senha: string, nome: string) => Promise<boolean>;
  loginGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  temPermissao: (modulo: string, acao?: keyof Permissao) => boolean;
  refresh: () => Promise<void>;
  // Compat com Topbar antigo; agora no-op (perfil real vem do banco)
  trocarPerfil: (perfil: Perfil) => void;
  perfisDisponiveis: Perfil[];
}

const AuthCtx = createContext<AuthContexto | undefined>(undefined);

function iniciaisDe(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

async function carregarUsuario(session: Session | null): Promise<Usuario | null> {
  if (!session) return null;
  const uid = session.user.id;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
  ]);

  const rolesList = (roles ?? []).map((r) => r.role as Perfil);
  const perfil: Perfil = rolesList.includes("admin")
    ? "admin"
    : rolesList.includes("gerente")
      ? "gerente"
      : rolesList.includes("supervisor")
        ? "supervisor"
        : "vendedor";

  const nome = profile?.nome || session.user.user_metadata?.nome || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Usuário";

  const usuario: Usuario = {
    id: uid,
    nome,
    email: profile?.email || session.user.email || "",
    iniciais: profile?.iniciais || iniciaisDe(nome),
    perfil,
    ativo: profile?.ativo ?? true,
    empresaId: "e-demo",
    filialId: profile?.filial_id || undefined,
    equipeId: profile?.equipe_id || undefined,
    telefone: profile?.telefone || undefined,
    cargo: profile?.cargo || undefined,
    avatar: profile?.avatar_url || undefined,
    permissoes: gerarPermissoes(perfil),
    criadoEm: profile?.criado_em || session.user.created_at || new Date().toISOString(),
    ultimoAcesso: new Date().toISOString(),
    metodoLogin: session.user.app_metadata?.provider === "google" ? "google" : "email",
    navbarVariant: (profile as any)?.navbar_variant || "pill",
    onboardingCompleto: (profile as any)?.onboarding_completo ?? true,
    plano: (profile as any)?.plano || "ativo",
    trialExpiresAt: (profile as any)?.trial_expires_at || null,
    aprovado: (profile as any)?.aprovado ?? false,
  };
  return usuario;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const criarUsuario = useServerFn(criarUsuarioConfirmado);

  const hidratar = useCallback(async (s: Session | null) => {
    try {
      const u = await carregarUsuario(s);
      setUsuario(u);
    } catch (e) {
      console.error("[auth] falha ao carregar perfil", e);
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // hidratação assíncrona fora do callback (evita deadlock)
      setTimeout(() => { void hidratar(s); }, 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void hidratar(data.session).finally(() => setCarregando(false));
    });

    return () => sub.subscription.unsubscribe();
  }, [hidratar]);

  const login = useCallback(async (email: string, senha: string) => {
    setErro(null); setCarregando(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    if (error) { setCarregando(false); setErro(error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message); return false; }
    if (data.user) {
      const { data: profile } = await (supabase as any).from("profiles").select("aprovado").eq("id", data.user.id).maybeSingle();
      if (profile && !profile.aprovado) {
        await supabase.auth.signOut();
        setCarregando(false);
        setErro("Sua conta está aguardando aprovação do gestor.");
        return false;
      }
    }
    setCarregando(false);
    return true;
  }, []);

  const cadastrar = useCallback(async (email: string, senha: string, nome: string) => {
    setErro(null); setCarregando(true);
    try {
      const result = await criarUsuario({ data: { email: email.trim().toLowerCase(), password: senha, nome: nome.trim() } });
      if (!result.ok) { setErro(result.error || "Erro ao criar conta"); setCarregando(false); return false; }
      setCarregando(false);
      setErro(null);
      return "aguardando_aprovacao" as any;
    } catch (e: any) { setErro(e.message || "Erro ao criar conta"); setCarregando(false); return false; }
  }, [criarUsuario]);

  const loginGoogle = useCallback(async () => {
    setErro(null);
    // Usar Supabase nativo
    const { error: googleError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined } });
    if (googleError) { setErro(googleError.message); return false; }
    return true;
    /* antigo:
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    */
    if (false) { setErro(""); return false; }
    return true;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setSession(null);
    if (typeof window !== "undefined") window.localStorage.removeItem("orion-page");
  }, []);

  const temPermissao = useCallback(
    (modulo: string, acao: keyof Permissao = "ler") => {
      if (!usuario) return false;
      if (usuario.perfil === "admin") return true;
      const p = usuario.permissoes.find((pp) => pp.modulo === modulo);
      return p ? Boolean(p[acao]) : false;
    },
    [usuario],
  );

  const refresh = useCallback(async () => { await hidratar(session); }, [hidratar, session]);

  return (
    <AuthCtx.Provider
      value={{
        usuario,
        session,
        autenticado: !!usuario,
        carregando,
        erro,
        login,
        cadastrar,
        loginGoogle,
        logout,
        temPermissao,
        refresh,
        trocarPerfil: (perfil: Perfil) => { if (usuario) { const u = { ...usuario, perfil, permissoes: gerarPermissoes(perfil) }; setUsuario(u); } },
        perfisDisponiveis: (usuario?.perfil === "admin" ? ["admin", "vendedor"] : [usuario?.perfil || "vendedor"]) as Perfil[],
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
