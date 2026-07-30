import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Building2, Store, ShoppingBag, Target, Megaphone,
  Mail, GraduationCap, Link as LinkIcon, KeyRound, Bot, FileText, Database,
  X, ShieldCheck, ScrollText,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "Geral" },
  { to: "/admin/profiles", label: "Usuários & Roles", icon: Users, group: "Geral" },
  { to: "/admin/companies", label: "Empresas & Membros", icon: Building2, group: "Geral" },
  { to: "/admin/filiais", label: "Filiais & Equipes", icon: Store, group: "Operação" },
  { to: "/admin/vendas", label: "Vendas Diárias", icon: ShoppingBag, group: "Operação" },
  { to: "/admin/metas", label: "Metas Individuais", icon: Target, group: "Operação" },
  { to: "/admin/campanhas", label: "Campanhas", icon: Megaphone, group: "Operação" },
  { to: "/admin/invites", label: "Convites", icon: Mail, group: "Operação" },
  { to: "/admin/treinamentos", label: "Treinamentos", icon: GraduationCap, group: "Operação" },
  { to: "/admin/quick-links", label: "Links Rápidos", icon: LinkIcon, group: "Config" },
  { to: "/admin/credenciais", label: "Credenciais", icon: KeyRound, group: "Config" },
  { to: "/admin/ai-config", label: "IA Config", icon: Bot, group: "Config" },
  { to: "/admin/ai-logs", label: "IA Logs", icon: FileText, group: "Config" },
  { to: "/admin/integracoes", label: "Integrações", icon: Database, group: "Config" },
  { to: "/admin/auditoria", label: "Auditoria", icon: ScrollText, group: "Config" },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Agrupar itens
  const groups = NAV_ITEMS.reduce((acc, item) => {
    const g = item.group || "Outros";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const groupOrder = ["Geral", "Operação", "Config"];

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-white/10 dark:bg-slate-900 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white dark:border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <div>
              <p className="text-sm font-bold">Painel Admin</p>
              <p className="text-[10px] text-blue-100">Orion Enterprise</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10 lg:hidden"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          {groupOrder.map((group) => (
            <div key={group} className="mb-4">
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group}
              </p>
              <div className="space-y-0.5">
                {groups[group]?.map((item) => {
                  const active = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        active
                          ? "bg-blue-600 text-white shadow"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3 dark:border-white/10">
          <a
            href="/"
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Voltar para o app
          </a>
        </div>
      </aside>
    </>
  );
}
