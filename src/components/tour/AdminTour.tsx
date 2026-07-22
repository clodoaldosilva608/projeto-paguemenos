import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Check, LayoutDashboard, Target, Trophy, FileText, Camera, Sparkles, Plug, Settings2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface TourStep { id: string; titulo: string; descricao: string; icone: React.ComponentType<{ className?: string }>; cor: string; }

const PASSOS_GESTOR: TourStep[] = [
  { id: "dashboard", titulo: "Dashboard — Visão Geral", descricao: "Acompanhe suas metas individuais em tempo real. Os KPIs atualizam conforme o gestor lança novos dados.", icone: LayoutDashboard, cor: "#3B82F6" },
  { id: "metas", titulo: "Minhas Metas", descricao: "Veja e acompanhe suas metas por categoria (faturamento, marcas exclusivas, super desconto). Filtre por status.", icone: Target, cor: "#10B981" },
  { id: "ranking", titulo: "Resultados", descricao: "Acompanhe seu desempenho e ranking. Compare períodos e identifique oportunidades.", icone: Trophy, cor: "#F59E0B" },
  { id: "vendas", titulo: "Lançamento de Vendas", descricao: "Registre vendas manualmente. Categorize em Genéricos, Marcas Exclusivas ou Super Desconto.", icone: Camera, cor: "#EC4899" },
  { id: "ia", titulo: "Assistente IA", descricao: "Converse com a IA para analisar vendas, sugerir melhorias e gerar relatórios automáticos.", icone: Sparkles, cor: "#06B6D4" },
  { id: "integracoes", titulo: "Integrações Externas", descricao: "Conecte Google Sheets, WhatsApp, Power BI, APIs e mais. Disponível apenas para gestores.", icone: Plug, cor: "#0EA5E9" },
  { id: "usuarios", titulo: "Gestão de Usuários", descricao: "Aprove novos usuários, altere perfis, envie convites. Tudo auditado.", icone: Users, cor: "#DC2626" },
  { id: "configuracoes", titulo: "Configurações", descricao: "Personalize indicadores, permissões, notificações e aparência da plataforma.", icone: Settings2, cor: "#64748B" },
];

const PASSOS_VENDEDOR: TourStep[] = [
  { id: "dashboard", titulo: "Dashboard — Suas Metas", descricao: "Acompanhe SUAS metas individuais em tempo real. Apenas seus dados aparecem aqui.", icone: LayoutDashboard, cor: "#3B82F6" },
  { id: "metas", titulo: "Minhas Metas", descricao: "Veja as metas que seu gestor definiu para você. Filtre por status e categoria.", icone: Target, cor: "#10B981" },
  { id: "ranking", titulo: "Resultados", descricao: "Acompanhe seu desempenho individual. Seus resultados e progresso.", icone: Trophy, cor: "#F59E0B" },
  { id: "vendas", titulo: "Lançamento de Vendas", descricao: "Registre suas vendas. O sistema calcula atingimento de meta automaticamente.", icone: Camera, cor: "#EC4899" },
  { id: "ia", titulo: "Assistente IA", descricao: "Pergunte sobre suas metas, performance e receba sugestões personalizadas.", icone: Sparkles, cor: "#06B6D4" },
  { id: "relatorios", titulo: "Relatórios", descricao: "Gere relatórios dos seus resultados. Exporte em PDF quando precisar.", icone: FileText, cor: "#8B5CF6" },
];

export function AdminTour({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const [stepAtual, setStepAtual] = useState(0);
  const { usuario } = useAuth();
  useEffect(() => { if (aberto) setStepAtual(0); }, [aberto]);
  if (!aberto) return null;

  const isGestor = usuario?.perfil === "admin" || usuario?.perfil === "gerente" || usuario?.perfil === "supervisor";
  const passos = isGestor ? PASSOS_GESTOR : PASSOS_VENDEDOR;
  const step = passos[stepAtual];
  const ehUltimo = stepAtual === passos.length - 1;
  const Icon = step.icone;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative px-6 py-5" style={{ background: `linear-gradient(135deg, ${step.cor}15 0%, ${step.cor}05 100%)`, borderBottom: `2px solid ${step.cor}30` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg" style={{ backgroundColor: `${step.cor}20`, color: step.cor }}><Icon className="h-6 w-6" /></div>
              <div><p className="text-xs font-semibold uppercase tracking-wider" style={{ color: step.cor }}>Passo {stepAtual + 1} de {passos.length}</p><h2 className="text-lg font-bold text-slate-900">{step.titulo}</h2></div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="px-6 py-6"><p className="text-base leading-relaxed text-slate-700">{step.descricao}</p></div>
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button onClick={onClose} className="text-xs font-medium text-slate-400 hover:text-slate-600">Pular tour</button>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 sm:flex">{passos.map((_, i) => (<button key={i} onClick={() => setStepAtual(i)} className={`h-1.5 rounded-full transition-all ${i === stepAtual ? "w-6" : "w-1.5 opacity-30"}`} style={{ backgroundColor: i === stepAtual ? step.cor : "#94A3B8" }} />))}</div>
            {stepAtual > 0 && <button onClick={() => setStepAtual(stepAtual - 1)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /> Anterior</button>}
            <button onClick={() => ehUltimo ? onClose() : setStepAtual(stepAtual + 1)} className="inline-flex items-center gap-1 rounded-md px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ backgroundColor: step.cor }}>{ehUltimo ? (<><Check className="h-4 w-4" /> Concluir</>) : (<>Próximo <ChevronRight className="h-4 w-4" /></>)}</button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
}

export function TourFAB({ onAbrirTour }: { onAbrirTour?: () => void }) {
  const [mostrar, setMostrar] = useState(true);
  useEffect(() => { if (sessionStorage.getItem("tour-fab-dismissed")) setMostrar(false); }, []);
  if (!mostrar) return null;
  const handleClick = () => { if (onAbrirTour) onAbrirTour(); else { window.localStorage.setItem("orion-page", "tour"); window.location.reload(); } };
  const handleDismiss = (e: React.MouseEvent) => { e.stopPropagation(); sessionStorage.setItem("tour-fab-dismissed", "1"); setMostrar(false); };
  return (
    <div className="group fixed bottom-24 left-5 z-40 flex items-center gap-2 sm:bottom-28 sm:left-8">
      <button onClick={handleClick} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-600/40 transition hover:scale-110" title="Abrir Tour Guiado"><HelpCircle className="h-6 w-6" /></button>
      <div className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">Tour Guiado</div>
      <button onClick={handleDismiss} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white opacity-60 hover:opacity-100" title="Fechar">✕</button>
    </div>
  );
}
import { HelpCircle } from "lucide-react";
