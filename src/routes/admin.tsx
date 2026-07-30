import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Loader2, ShieldAlert, Home, ChevronRight, Store, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  beforeLoad: () => {
    // Client-side guard será feito no componente (precisa do useAuth)
    // Server-side guard é feito nas server functions via ensureAdmin
  },
  head: () => ({
    meta: [
      { title: "Painel Admin — Orion" },
      { name: "description", content: "Painel administrativo Enterprise para gestão de dados." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminLayout() {
  const { usuario, carregando } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = router.state.location.pathname;

  // A rota /admin/login NÃO deve ter o guard do layout — ela é a página de login
  const isLoginRoute = pathname === "/admin/login";

  // Se for a rota de login, renderizar o Outlet diretamente (sem guard)
  if (isLoginRoute) {
    return <Outlet />;
  }

  // Aguardar carregamento da sessão
  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-400">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado, redirecionar para login
  if (!usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-xl dark:border-red-900 dark:bg-slate-900"
        >
          <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-red-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Acesso restrito</h2>
          <p className="mt-2 text-sm text-slate-500">
            Você precisa estar autenticado para acessar o painel administrativo.
          </p>
          <a
            href="/auth"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Ir para login
          </a>
        </motion.div>
      </div>
    );
  }

  // Se não for admin, mostrar bloqueio
  if (usuario.perfil !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-xl dark:border-red-900 dark:bg-slate-900"
        >
          <ShieldAlert className="mx-auto mb-3 h-12 w-12 text-red-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Perfil sem acesso</h2>
          <p className="mt-2 text-sm text-slate-500">
            Olá, <strong>{usuario.nome.split(" ")[0]}</strong>! Seu perfil{" "}
            <span className="font-bold uppercase text-red-500">{usuario.perfil}</span> não tem
            permissão para acessar o painel administrativo.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Apenas administradores podem gerenciar dados via este painel.
          </p>
          <a
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <Home className="h-4 w-4" /> Voltar para o app
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-64">
        {/* Topbar com breadcrumbs */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/80 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-white/5"
            aria-label="Abrir menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>
          <Breadcrumbs />
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <FilialSeletor />
            <span className="hidden sm:inline">{usuario.email}</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 dark:bg-red-950/50 dark:text-red-300">
              Admin
            </span>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const parts = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link
        to="/admin"
        className="font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400"
      >
        Admin
      </Link>
      {parts.slice(1).map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="capitalize text-slate-500 dark:text-slate-400">
            {part.replace(/-/g, " ")}
          </span>
        </span>
      ))}
    </nav>
  );
}

// ============================================================================
// Seletor de Filial — admin master pode alternar entre filiais
// A filial selecionada é salva no localStorage e usada como filtro nas listagens
// ============================================================================
function FilialSeletor() {
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [selecionada, setSelecionada] = useState<string>(
    () => localStorage.getItem("admin-filial-selecionada") || "todas",
  );
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await (supabase as any)
          .from("filiais")
          .select("id, nome")
          .order("nome");
        if (data) setFiliais(data as any);
      } catch {
        // ignorar — admin pode não ter acesso via client
      }
    })();
  }, []);

  function selecionar(id: string) {
    setSelecionada(id);
    localStorage.setItem("admin-filial-selecionada", id);
    setAberto(false);
    toast.success(
      id === "todas"
        ? "Visualizando todas as filiais"
        : `Filtrando por filial: ${filiais.find((f) => f.id === id)?.nome || id}`,
    );
    // Recarregar a página para aplicar o filtro
    window.location.reload();
  }

  const nomeAtual =
    selecionada === "todas"
      ? "Todas as Filiais"
      : filiais.find((f) => f.id === selecionada)?.nome || "Todas as Filiais";

  return (
    <div className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-white/5"
      >
        <Store className="h-3.5 w-3.5" />
        <span className="hidden max-w-[120px] truncate sm:inline">{nomeAtual}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {aberto && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-800"
            >
              <button
                onClick={() => selecionar("todas")}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/5 ${
                  selecionada === "todas"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                Todas as Filiais
              </button>
              {filiais.map((f) => (
                <button
                  key={f.id}
                  onClick={() => selecionar(f.id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-white/5 ${
                    selecionada === f.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <Store className="h-3.5 w-3.5" />
                  <span className="truncate">{f.nome}</span>
                  <span className="ml-auto text-[10px] text-slate-400">#{f.id}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
