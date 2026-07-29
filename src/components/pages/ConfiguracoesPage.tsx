import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { atualizarPerfilProprio } from "@/lib/admin.functions";
import { useAuth } from "@/contexts/AuthContext";
import type { NavbarVariant } from "@/types/core";
import { cn } from "../../utils/cn";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const abas = [
  { id: "geral", label: "Geral", icone: "⚙️" },
  { id: "indicadores", label: "Indicadores", icone: "📊" },
  { id: "permissoes", label: "Permissões", icone: "🔒" },
  { id: "notificacoes", label: "Notificações", icone: "🔔" },
  { id: "aparencia", label: "Aparência", icone: "🎨" },
] as const;

type Aba = (typeof abas)[number]["id"];

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>("geral");
  const { usuario, refresh } = useAuth();
  const salvarPerfil = useServerFn(atualizarPerfilProprio);
  const variantAtual: NavbarVariant = (usuario?.navbarVariant as NavbarVariant) || "pill";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar logo salvo
  useEffect(() => {
    try {
      const saved = localStorage.getItem("orion-logo-empresa");
      if (saved) setLogoUrl(saved);
    } catch {}
  }, []);

  // Processar arquivo de imagem
  function processarLogo(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas arquivos de imagem são aceitos (PNG, JPG, SVG).");
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error("A imagem deve ter no máximo 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoUrl(result);
      try { localStorage.setItem("orion-logo-empresa", result); } catch {}
      toast.success("Logo carregado! Clique em Salvar para confirmar.");
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processarLogo(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processarLogo(file);
  }

  function removerLogo() {
    setLogoUrl(null);
    try { localStorage.removeItem("orion-logo-empresa"); } catch {}
    toast.success("Logo removido.");
  }

  const trocarNavbar = async (v: NavbarVariant) => {
    try {
      await salvarPerfil({ data: { navbar_variant: v } });
      await refresh();
      toast.success("Navegação atualizada!");
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
              aba === a.id
                ? "bg-blue-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            <span>{a.icone}</span>
            {a.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {aba === "geral" && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Configurações Gerais</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: "Nome da Empresa", value: "Pague Menos", tipo: "text" },
                { label: "CNPJ", value: "06.626.253/0001-51", tipo: "text" },
                { label: "Idioma", value: "Português (BR)", tipo: "select" },
                { label: "Moeda", value: "BRL (R$)", tipo: "select" },
                { label: "Fuso Horário", value: "America/Fortaleza", tipo: "select" },
                { label: "Período Padrão de Meta", value: "Mensal", tipo: "select" },
              ].map((c) => (
                <div key={c.label}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    {c.label}
                  </label>
                  <input
                    type="text"
                    defaultValue={c.value}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              {[
                { label: "Gamificação", desc: "Ativar sistema de pontos e conquistas", value: true },
                { label: "Assistente IA", desc: "Habilitar insights por Inteligência Artificial", value: true },
                { label: "Notificações Push", desc: "Enviar alertas em tempo real", value: true },
                { label: "Soft Delete", desc: "Registros excluídos são mantidos para auditoria", value: true },
              ].map((t) => (
                <div key={t.label} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t.desc}</p>
                  </div>
                  <div className={`h-6 w-11 rounded-full ${t.value ? "bg-blue-600" : "bg-slate-300"} relative cursor-pointer transition`}>
                    <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${t.value ? "left-[22px]" : "left-0.5"}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === "indicadores" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Indicadores Configuráveis</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Defina quais KPIs são exibidos no dashboard e como são calculados.
            </p>
            {[
              { nome: "Faturamento", tipo: "Monetário", formula: "Soma", ativo: true },
              { nome: "Ticket Médio (TKM)", tipo: "Monetário", formula: "Média", ativo: true },
              { nome: "UVC", tipo: "Unidade", formula: "Média", ativo: true },
              { nome: "Clientes / Mês", tipo: "Quantidade", formula: "Contagem", ativo: true },
              { nome: "Genéricos + Similares", tipo: "Monetário", formula: "Soma", ativo: true },
              { nome: "Marcas Exclusivas", tipo: "Monetário", formula: "Soma", ativo: true },
              { nome: "Super Desconto", tipo: "Monetário", formula: "Soma", ativo: true },
              { nome: "NPS Atendimento", tipo: "Percentual", formula: "Média", ativo: false },
            ].map((ind) => (
              <div key={ind.nome} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${ind.ativo ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{ind.nome}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{ind.tipo} · {ind.formula}</p>
                  </div>
                </div>
                <button className="rounded-lg px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}

        {aba === "permissoes" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Matriz de Permissões (RBAC)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">Módulo</th>
                    {["Admin", "Gerente", "Supervisor", "Vendedor"].map((p) => (
                      <th key={p} className="px-3 py-2 text-center text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 dark:text-slate-500">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["Dashboard", "Metas", "Resultados", "Relatórios", "Campanhas", "Equipes", "Filiais", "Usuários", "Configurações", "Auditoria"].map((mod) => (
                    <tr key={mod} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="px-3 py-2 text-sm font-medium text-slate-800 dark:text-white">{mod}</td>
                      {[true, true, mod !== "Auditoria" && mod !== "Configurações", !["Campanhas", "Equipes", "Filiais", "Usuários", "Configurações", "Auditoria"].includes(mod)].map((v, i) => (
                        <td key={i} className="px-3 py-2 text-center">
                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${v ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                            {v ? "✓" : "—"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {aba === "notificacoes" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Regras de Notificação</h3>
            {[
              { trigger: "Meta diária não atingida", canal: "Push + Email", ativo: true },
              { trigger: "Colaborador fora da meta há 3 dias", canal: "Push + Email", ativo: true },
              { trigger: "Conquista desbloqueada", canal: "Push", ativo: true },
              { trigger: "Relatório semanal disponível", canal: "Email", ativo: true },
              { trigger: "Novo colaborador adicionado", canal: "Push", ativo: false },
            ].map((n) => (
              <div key={n.trigger} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{n.trigger}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{n.canal}</p>
                </div>
                <div className={`h-6 w-11 rounded-full ${n.ativo ? "bg-blue-600" : "bg-slate-300"} relative cursor-pointer`}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${n.ativo ? "left-[22px]" : "left-0.5"}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {aba === "aparencia" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Personalização Visual</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Cor Primária</label>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 shadow" />
                  <input type="text" defaultValue="#2563eb" readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-num text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Cor Secundária</label>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-indigo-600 shadow" />
                  <input type="text" defaultValue="#4f46e5" readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-num text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Logo da Empresa</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
              />
              {logoUrl ? (
                <div className="relative flex h-24 items-center justify-center rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30">
                  <img src={logoUrl} alt="Logo da empresa" className="max-h-20 max-w-full object-contain" />
                  <button
                    onClick={removerLogo}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    aria-label="Remover logo"
                    title="Remover logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition ${
                    dragOver
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-600"
                  }`}
                >
                  <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">Arraste o logo aqui ou clique para enviar</p>
                  <p className="text-[10px] text-slate-300">PNG, JPG ou SVG · máx 500KB</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
              <h4 className="mb-1 text-sm font-bold text-slate-800 dark:text-white">📱 Configuração de Tela</h4>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Personalize sua dashboard — escolha o estilo de navegação que melhor se adapta ao seu fluxo de trabalho.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {([
                  // Originais
                  { v: "pill", nome: "Guidão flutuante", desc: "Pílula com ícone central em destaque", preview: <NavPreviewPill />, cat: "Clássico" },
                  { v: "bottom-dock", nome: "Dock inferior", desc: "Estilo dock iOS com blur", preview: <NavPreviewDock />, cat: "Clássico" },
                  { v: "sidebar-float", nome: "Lateral flutuante", desc: "Vertical minimal (desktop)", preview: <NavPreviewSidebar />, cat: "Clássico" },
                  { v: "top-minimal", nome: "Topo minimal", desc: "Barra superior com underline", preview: <NavPreviewTop />, cat: "Clássico" },
                  // Novos 7 estilos premium
                  { v: "nav-bottom-flutuante", nome: "Cápsula Flutuante ⭐", desc: "Bottom nav com menu radial expansível (glassmorphism)", preview: <NavPreviewCapsule />, cat: "Premium" },
                  { v: "nav-fab-inteligente", nome: "FAB Inteligente ⭐", desc: "Botão flutuante com menu circular adaptável por perfil", preview: <NavPreviewFAB />, cat: "Premium" },
                  { v: "nav-perfil-dinamico", nome: "Nav por Perfil ⭐", desc: "Menu muda automaticamente conforme perfil do usuário", preview: <NavPreviewPerfil />, cat: "Premium" },
                  { v: "nav-dock-animado", nome: "Dock Animado (macOS)", desc: "Ícones crescem ao passar o mouse (efeito magnify)", preview: <NavPreviewDockAnimado />, cat: "Premium" },
                  { v: "nav-morphing", nome: "Nav Morphing ⭐", desc: "Barra se transforma em grid completo ao tocar em Menu", preview: <NavPreviewMorph />, cat: "Premium" },
                  { v: "nav-quick-actions", nome: "Quick Actions", desc: "Botão central muda conforme página atual (contexto)", preview: <NavPreviewQuick />, cat: "Premium" },
                  { v: "nav-inteligente", nome: "Nav Inteligente", desc: "Barra se oculta ao rolar para baixo, reaparece ao subir", preview: <NavPreviewSmart />, cat: "Premium" },
                ] as const).map((opt) => {
                  const ativo = variantAtual === opt.v;
                  return (
                    <button key={opt.v} type="button" onClick={() => trocarNavbar(opt.v as NavbarVariant)}
                      className={cn(
                        "group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition",
                        ativo
                          ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-500/30 dark:bg-blue-500/10"
                          : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                      )}>
                      <span className="absolute left-2 top-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {opt.cat}
                      </span>
                      <div className="mt-3 flex h-16 items-end justify-center rounded-lg bg-slate-100 p-2 dark:bg-slate-950">{opt.preview}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{opt.nome}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{opt.desc}</p>
                      </div>
                      {ativo && <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">✓ Ativo</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function NavPreviewPill() {
  return (
    <div className="flex items-end gap-1">
      {[0,1].map((i) => <div key={i} className="h-6 w-4 rounded-full bg-slate-400/60" />)}
      <div className="-mt-3 h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/40" />
      {[0,1].map((i) => <div key={i} className="h-6 w-4 rounded-full bg-slate-400/60" />)}
    </div>
  );
}
function NavPreviewDock() {
  return (
    <div className="flex gap-1 rounded-2xl border border-slate-300/40 bg-white/60 px-2 py-1.5 dark:border-white/10 dark:bg-slate-900/70">
      {[0,1,2,3].map((i) => <div key={i} className={`h-6 w-6 rounded-lg ${i===1?"bg-blue-600":"bg-slate-400/60"}`} />)}
    </div>
  );
}
function NavPreviewSidebar() {
  return (
    <div className="flex h-full items-center gap-2">
      <div className="flex flex-col gap-1 rounded-full border border-slate-300/40 bg-slate-800/80 p-1">
        {[0,1,2].map((i) => <div key={i} className={`h-4 w-4 rounded-full ${i===0?"bg-blue-500":"bg-slate-500/60"}`} />)}
      </div>
      <div className="flex-1 rounded bg-slate-300/30 dark:bg-slate-700/40" style={{ height: 24 }} />
    </div>
  );
}
function NavPreviewTop() {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex gap-2 border-b border-slate-300/40 pb-1">
        {[0,1,2,3].map((i) => (
          <div key={i} className="relative">
            <div className={`h-1.5 w-6 rounded ${i===1?"bg-blue-600":"bg-slate-400/60"}`} />
            {i===1 && <div className="absolute -bottom-1 h-0.5 w-6 rounded-full bg-blue-600" />}
          </div>
        ))}
      </div>
      <div className="h-3 w-2/3 rounded bg-slate-300/40" />
    </div>
  );
}

// ===== Previews dos 7 novos estilos premium =====

function NavPreviewCapsule() {
  return (
    <div className="flex items-end gap-1">
      {[0,1].map((i) => <div key={i} className="h-5 w-4 rounded-full bg-slate-400/60" />)}
      <div className="-mt-2 h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md ring-2 ring-white/30" />
      {[0,1].map((i) => <div key={i} className="h-5 w-4 rounded-full bg-slate-400/60" />)}
    </div>
  );
}

function NavPreviewFAB() {
  return (
    <div className="relative flex h-12 w-full items-center justify-end">
      <div className="absolute right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
        <span className="text-[8px] text-white">+</span>
      </div>
      <div className="absolute right-6 top-0 h-3 w-3 rounded-full bg-amber-400" />
      <div className="absolute right-12 top-1 h-2 w-2 rounded-full bg-blue-300" />
    </div>
  );
}

function NavPreviewPerfil() {
  return (
    <div className="flex w-full gap-0.5 rounded-md bg-slate-200/50 p-0.5">
      {[0,1,2,3].map((i) => (
        <div key={i} className={`h-4 flex-1 rounded ${i===0?"bg-blue-600":"bg-slate-400/60"}`} />
      ))}
    </div>
  );
}

function NavPreviewDockAnimado() {
  return (
    <div className="flex items-end gap-1 rounded-md bg-white/40 p-1 backdrop-blur">
      {[5,6,7,6,5].map((h, i) => (
        <div
          key={i}
          className={`w-3 rounded ${i===2?"bg-gradient-to-br from-blue-500 to-indigo-600":"bg-slate-400/60"}`}
          style={{ height: `${h * 2}px` }}
        />
      ))}
    </div>
  );
}

function NavPreviewMorph() {
  return (
    <div className="flex w-full gap-0.5">
      {[0,1,2].map((i) => <div key={i} className="h-4 flex-1 rounded bg-slate-400/60" />)}
      <div className="h-4 w-4 rounded bg-slate-600" />
    </div>
  );
}

function NavPreviewQuick() {
  return (
    <div className="flex w-full items-end gap-0.5">
      {[0,1,2].map((i) => <div key={i} className="h-4 flex-1 rounded bg-slate-400/60" />)}
      <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md" />
    </div>
  );
}

function NavPreviewSmart() {
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div className="flex gap-1 rounded-md bg-slate-900/80 p-0.5">
        {[0,1,2,3].map((i) => (
          <div key={i} className={`h-3 w-3 rounded ${i===0?"bg-blue-500":"bg-slate-500"}`} />
        ))}
      </div>
      <div className="text-[7px] font-bold uppercase text-slate-400 dark:text-slate-500">oculta ao rolar</div>
    </div>
  );
}
