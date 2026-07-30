import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/admin/crud.functions";
import StatCard from "@/components/admin/StatCard";
import {
  Users, Store, ShoppingBag, Target, Megaphone, Mail, GraduationCap,
  ScrollText, Bot, Building2, Crown, ShieldCheck, Shield, User,
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fnStats = useServerFn(getDashboardStats);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getDashboardStats>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fnStats({ data: {} } as any);
        setStats(r as any);
      } catch (e: any) {
        setErro(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fnStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
        <p className="font-bold">Erro ao carregar estatísticas</p>
        <p className="mt-1 text-sm">{erro}</p>
      </div>
    );
  }

  if (!stats) return null;

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral dos dados do sistema.</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Usuários"
          value={stats.usuarios.total}
          icon={Users}
          color="#1565C0"
          sub={`${stats.usuarios.porPerfil.admin} admin · ${stats.usuarios.porPerfil.gerente} gerentes`}
          delay={0}
        />
        <StatCard
          label="Filiais"
          value={stats.filiais}
          icon={Store}
          color="#2E7D32"
          delay={0.05}
        />
        <StatCard
          label="Equipes"
          value={stats.equipes}
          icon={Building2}
          color="#FB8C00"
          delay={0.1}
        />
        <StatCard
          label="Vendas Hoje"
          value={brl(stats.vendas.hoje)}
          icon={ShoppingBag}
          color="#1565C0"
          sub={`${stats.vendas.totalRegistrosMes} registros no mês`}
          delay={0.15}
        />
        <StatCard
          label="Vendas no Mês"
          value={brl(stats.vendas.mes)}
          icon={ShoppingBag}
          color="#2E7D32"
          delay={0.2}
        />
        <StatCard
          label="Metas"
          value={stats.metas}
          icon={Target}
          color="#FB8C00"
          delay={0.25}
        />
        <StatCard
          label="Campanhas"
          value={stats.campanhas.total}
          icon={Megaphone}
          color="#D32F2F"
          sub={`${stats.campanhas.ativas} ativas · ${stats.campanhas.rascunho} rascunho`}
          delay={0.3}
        />
        <StatCard
          label="Convites Pendentes"
          value={stats.invitesPendentes}
          icon={Mail}
          color="#FB8C00"
          delay={0.35}
        />
        <StatCard
          label="Treinamentos"
          value={stats.treinamentos}
          icon={GraduationCap}
          color="#1565C0"
          delay={0.4}
        />
        <StatCard
          label="Auditoria Hoje"
          value={stats.auditoriaHoje}
          icon={ScrollText}
          color="#D32F2F"
          delay={0.45}
        />
        <StatCard
          label="IA Logs"
          value={stats.aiLogs}
          icon={Bot}
          color="#2E7D32"
          delay={0.5}
        />
      </div>

      {/* Detalhe: usuários por perfil */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900"
      >
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Users className="h-4 w-4" /> Usuários por Perfil
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PerfilCard label="Admin" count={stats.usuarios.porPerfil.admin} icon={Crown} color="#D32F2F" />
          <PerfilCard label="Gerente" count={stats.usuarios.porPerfil.gerente} icon={ShieldCheck} color="#1565C0" />
          <PerfilCard label="Supervisor" count={stats.usuarios.porPerfil.supervisor} icon={Shield} color="#FB8C00" />
          <PerfilCard label="Vendedor" count={stats.usuarios.porPerfil.vendedor} icon={User} color="#2E7D32" />
        </div>
      </motion.div>
    </div>
  );
}

function PerfilCard({
  label,
  count,
  icon: Icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg p-3"
      style={{ background: `${color}11` }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg"
        style={{ background: `${color}22`, color }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{count}</p>
      </div>
    </div>
  );
}
