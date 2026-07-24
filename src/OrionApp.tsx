import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./contexts/AuthContext";
import OrionNavBar from "./components/OrionNavBar";
import {
  NavbarBottomDock,
  NavbarSidebarFloat,
  NavbarTopMinimal,
} from "./components/navbars/NavbarVariants";
import {
  NavBottomFlutuante, NavFABInteligente, NavPerfilDinamico,
  NavDockAnimado, NavMorphing, NavQuickActions, NavInteligente,
} from "./components/navbars/NavVariants";
import Topbar from "./components/Topbar";
import QuickAccessLauncher from "./components/QuickAccessLauncher";
import IAAssistantFAB from "./components/IAAssistantFAB";
import { AdminTour } from "./components/tour/AdminTour";
import { DashboardFuncionarioPage } from "./components/pages/DashboardFuncionarioPage";
import { CurriculoPage } from "./components/pages/CurriculoPage";
import { DocumentosPage } from "./components/pages/DocumentosPage";
import { TourFAB } from "./components/tour/AdminTour";
import TrialBanner from "./components/TrialBanner";
import { useAutoSync } from "./hooks/useAutoSync";

import type { Pagina } from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import GoalsView from "./components/GoalsView";
import RankingView from "./components/RankingView";
import ReportsView from "./components/ReportsView";
import CampanhasPage from "./components/pages/CampanhasPage";
import GamificacaoPage from "./components/pages/GamificacaoPage";
import EquipesPage from "./components/pages/EquipesPage";
import FiliaisPage from "./components/pages/FiliaisPage";
import AdminPage from "./components/pages/AdminPage";
import ConfiguracoesPage from "./components/pages/ConfiguracoesPage";
import AuditoriaPage from "./components/pages/AuditoriaPage";
import IAPage from "./components/pages/IAPage";
import IAConfigPage from "./components/pages/IAConfigPage";
import DashboardAdminPage from "./components/pages/DashboardAdminPage";
import FuncionariosPage from "./components/pages/FuncionariosPage";
import MinhasMetasPage from "./components/pages/MinhasMetasPage";
import RelatorioVendasPage from "./components/pages/RelatorioVendasPage";

export default function OrionApp() {
  const { autenticado, usuario, carregando, estaImpersonando, impersonarVendedor, voltarParaAdmin } = useAuth();
  const navigate = useNavigate();
  useAutoSync(120_000); // sincroniza com Google Sheets a cada 2min

  const [tourAberto, setTourAberto] = useState(false);
  const [pagina, setPagina] = useState<Pagina>(() => {
    if (typeof window === "undefined") return "dashboard";
    return (window.localStorage.getItem("orion-page") as Pagina) || "dashboard";
  });

  // Handler para o botão "Acessar como" no DashboardAdminPage
  const handleImpersonate = async (userId: string, nome: string) => {
    try {
      await impersonarVendedor(userId, nome);
      setPagina("dashboard");
    } catch (e: any) {
      console.error("[impersonate] erro:", e.message);
    }
  };

  // Handler para o botão "Voltar" (sair do modo impersonate)
  const handleVoltarAdmin = () => {
    voltarParaAdmin();
    setPagina("dashboard");
  };

  useEffect(() => {
    if (!carregando && !autenticado) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [autenticado, carregando, navigate]);

  // Onboarding guard: se ainda não completou, envia para /welcome
  useEffect(() => {
    if (autenticado && usuario && usuario.onboardingCompleto === false) {
      navigate({ to: "/welcome" });
    }
  }, [autenticado, usuario, navigate]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("orion-page", pagina);
  }, [pagina]);
  useEffect(() => {
    if (pagina === "tour") {
      const t = setTimeout(() => setTourAberto(true), 300);
      return () => clearTimeout(t);
    }
  }, [pagina]);

  if (carregando)
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div className="font-display text-2xl">Orion</div>
      </div>
    );
  if (!autenticado) return null;

  const paginasVendedor: Pagina[] = [
    "dashboard",
    "minhas-metas",
    "ranking",
    "relatorios",
    "relatorio-vendas",
    "gamificacao",
    "ia",
    "dashboard-funcionario",
    "curriculo",
    "campanhas",
    "documentos",
  ];
  const paginaEfetiva: Pagina =
    usuario?.perfil === "vendedor" && !paginasVendedor.includes(pagina) ? "dashboard" : pagina;

  const renderPagina = () => {
    // Nota: quando admin/gerente está impersonando um vendedor, usuario.perfil
    // passa a ser "vendedor", então o switch abaixo já renderiza as páginas
    // do vendedor naturalmente (DashboardView, MinhasMetasPage, RankingView, etc.)
    // O banner amarelo + botão "Voltar" continuam visíveis no topo.
    switch (paginaEfetiva) {
      case "dashboard":
        // Admin/gerente vê painel da equipe; vendedor vê dashboard próprio
        return usuario?.perfil === "admin" || usuario?.perfil === "gerente"
          ? <DashboardAdminPage onImpersonate={handleImpersonate} />
          : <DashboardView />;
      case "metas":
      case "colaboradores":
        return <GoalsView />;
      case "minhas-metas":
        return <MinhasMetasPage />;
      case "ranking":
        return <RankingView />;
      case "relatorios":
        return <ReportsView />;
      case "relatorio-vendas":
        return <RelatorioVendasPage />;
      case "campanhas":
        return <CampanhasPage />;
      case "gamificacao":
        return <GamificacaoPage />;
      case "equipes":
        return <EquipesPage />;
      case "filiais":
        return <FiliaisPage />;
      case "usuarios":
        return <AdminPage />;
      case "configuracoes":
        return <ConfiguracoesPage />;
      case "auditoria":
        return <AuditoriaPage />;
      case "ia":
        return <IAPage />;
      case "ia-config":
        return <IAConfigPage />;
      case "dashboard-funcionario":
        return <DashboardFuncionarioPage />;
      case "curriculo":
        return <CurriculoPage />;
      case "documentos":
        return <DocumentosPage />;
      case "funcionarios":
        return <FuncionariosPage />;
      default:
        return <DashboardView />;
    }
  };

  const variant = usuario?.navbarVariant || "pill";
  const renderNavbar = () => {
    switch (variant) {
      case "bottom-dock":
        return <NavbarBottomDock paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "sidebar-float":
        return <NavbarSidebarFloat paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "top-minimal":
        return <NavbarTopMinimal paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "nav-bottom-flutuante":
        return <NavBottomFlutuante paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "nav-fab-inteligente":
        return <NavFABInteligente paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "nav-perfil-dinamico":
        return <NavPerfilDinamico paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "nav-dock-animado":
        return <NavDockAnimado paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "nav-morphing":
        return <NavMorphing paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "nav-quick-actions":
        return <NavQuickActions paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      case "nav-inteligente":
        return <NavInteligente paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
      default:
        return <OrionNavBar paginaAtual={paginaEfetiva} onNavegar={setPagina} />;
    }
  };

  const bottomPadding = variant === "top-minimal" ? "pb-12" : "pb-36";
  const leftPadding = variant === "sidebar-float" ? "md:pl-20" : "";

  return (
    <div
      className={`min-h-screen bg-[var(--pm-paper)] text-gray-900 dark:bg-slate-950 dark:text-gray-100 ${leftPadding}`}
    >
      <main className={`paper-grid mx-auto max-w-7xl px-4 ${bottomPadding} pt-6 sm:px-8 sm:pt-8`}>
        {variant === "top-minimal" && renderNavbar()}

        {/* BANNER IMPERSONATE — admin/gerente acessando como vendedor */}
        {estaImpersonando && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-sm dark:border-amber-700 dark:bg-amber-950/40">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <span className="text-xl">🎭</span>
              <div>
                <p className="text-sm font-bold">Modo visualização — acessando como <strong>{usuario?.nome}</strong></p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Você está vendo o dashboard do vendedor. Todas as ações são registradas em auditoria.
                </p>
              </div>
            </div>
            <button
              onClick={handleVoltarAdmin}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500"
            >
              ← Voltar ao painel admin
            </button>
          </div>
        )}

        <Topbar pagina={paginaEfetiva} onAbrirMenu={() => {}} />
        <TrialBanner />
        {paginaEfetiva === "dashboard" && (
          <div className="mb-4">
            <QuickAccessLauncher />
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={paginaEfetiva}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderPagina()}
          </motion.div>
        </AnimatePresence>
      </main>
      <IAAssistantFAB />
      <TourFAB onAbrirTour={() => setTourAberto(true)} />
      <AdminTour
        aberto={tourAberto}
        onClose={() => {
          setTourAberto(false);
          setPagina("dashboard");
        }}
      />
      {variant !== "top-minimal" && renderNavbar()}
    </div>
  );
}
