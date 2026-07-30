import { createFileRoute, redirect, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Loader2, ShieldAlert, Home, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

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
