import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  Tv,
  X,
  RefreshCw,
  Wifi,
  Activity,
  Target,
  Trophy,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  User as UserIcon,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brlMoeda, pct as fmtPct } from "@/utils/format";
import { useServerFn } from "@tanstack/react-start";
import { buscarEmailPorMatricula } from "@/lib/login-matricula.functions";

// ============================================================================
// ESTILOS / ANIMAÇÕES (mesmos do LandingPage)
// ============================================================================

const TV_STYLES = `
@keyframes orion-aurora {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.orion-aurora-bg {
  background: linear-gradient(135deg, #0a192f 0%, #0d2847 25%, #1a3a6c 50%, #0d2847 75%, #0a192f 100%);
  background-size: 400% 400%;
  animation: orion-aurora 15s ease infinite;
}

.orion-grid-mesh {
  background-image:
    radial-gradient(circle at 1px 1px, rgba(66, 165, 245, 0.18) 1px, transparent 0);
  background-size: 36px 36px;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 75%);
}

@keyframes orion-blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}
.orion-live-dot {
  animation: orion-blink 1.6s ease-in-out infinite;
}

.orion-tv-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.orion-tv-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); }
.orion-tv-scroll::-webkit-scrollbar-thumb { background: rgba(66,165,245,0.35); border-radius: 9999px; }
`;

// ============================================================================
// CONSTANTES DE IDENTIDADE VISUAL
// ============================================================================

const COLORS = {
  bg: "#0a192f",
  blueOrion: "#1565C0",
  blueLight: "#42A5F5",
  green: "#2E7D32",
  orange: "#FB8C00",
  red: "#D32F2F",
  white: "#FFFFFF",
  textGray: "#94A3B8",
} as const;

const PERFIS_TV_PERMITIDOS = ["admin", "gerente", "supervisor"] as const;

function podeAcessarTV(perfil: string | undefined): boolean {
  return !!perfil && (PERFIS_TV_PERMITIDOS as readonly string[]).includes(perfil);
}

// ============================================================================
// TIPOS E UTILITÁRIOS
// ============================================================================

interface VendedorTV {
  usuario_id: string;
  nome: string;
  iniciais: string | null;
  meta: number;
  realizado: number;
  projecao: number;
  categorias: Record<string, { meta: number; realizado: number }>;
}

interface ResumoLoja {
  metaTotal: number;
  realizadoTotal: number;
  projecaoTotal: number;
  vendedores: VendedorTV[];
  origem: "metas" | "vendas";
  dataInicio: string;
  dataFim: string;
}

type ModoPeriodo = "atual" | "anterior" | "custom";

interface FiltroPeriodo {
  modo: ModoPeriodo;
  customInicio?: string;
  customFim?: string;
}

function mesAtualInicio(): string {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}-01`;
}

function periodoMesAtual(): { inicio: string; fim: string } {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ultimoDia = new Date(ano, d.getMonth() + 1, 0).getDate();
  return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}` };
}

function periodoMesAnterior(): { inicio: string; fim: string } {
  const d = new Date();
  const ano = d.getFullYear() - (d.getMonth() === 0 ? 1 : 0);
  const mes = d.getMonth() === 0 ? 12 : d.getMonth();
  const mesStr = String(mes).padStart(2, "0");
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return { inicio: `${ano}-${mesStr}-01`, fim: `${ano}-${mesStr}-${String(ultimoDia).padStart(2, "0")}` };
}

function resolverPeriodo(filtro: FiltroPeriodo): { inicio: string; fim: string; rotulo: string } {
  if (filtro.modo === "atual") {
    const p = periodoMesAtual();
    const nomeMes = new Date(p.inicio + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { ...p, rotulo: `Mês atual — ${nomeMes}` };
  }
  if (filtro.modo === "anterior") {
    const p = periodoMesAnterior();
    const nomeMes = new Date(p.inicio + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { ...p, rotulo: `Mês anterior — ${nomeMes}` };
  }
  const i = filtro.customInicio || mesAtualInicio();
  const f = filtro.customFim || new Date().toISOString().slice(0, 10);
  const di = new Date(i + "T00:00:00").toLocaleDateString("pt-BR");
  const df = new Date(f + "T00:00:00").toLocaleDateString("pt-BR");
  return { inicio: i, fim: f, rotulo: `Período: ${di} → ${df}` };
}

function statusPct(p: number): { label: string; color: string; bg: string } {
  if (p >= 100) return { label: "Meta batida", color: COLORS.green, bg: "rgba(46,125,50,0.18)" };
  if (p >= 75) return { label: "No caminho", color: COLORS.blueLight, bg: "rgba(66,165,245,0.18)" };
  if (p >= 50) return { label: "Atenção", color: COLORS.orange, bg: "rgba(251,140,0,0.18)" };
  return { label: "Crítico", color: COLORS.red, bg: "rgba(211,47,47,0.18)" };
}

async function carregarResumoLoja(filtro: FiltroPeriodo, filialId?: string): Promise<ResumoLoja> {
  const { inicio, fim } = resolverPeriodo(filtro);
  const ehMesCheio = filtro.modo !== "custom";

  const dataInicioMeta = inicio.slice(0, 8) + "01";
  let metasQuery = supabase
    .from("metas_individuais")
    .select("usuario_id, categoria, periodo, valor_meta, valor_realizado, valor_projecao, data_inicio")
    .eq("periodo", "mensal")
    .eq("data_inicio", dataInicioMeta);

  // Filtrar por filial se fornecido (gerente/supervisor veem apenas sua filial)
  if (filialId) {
    metasQuery = metasQuery.eq("filial_id", filialId);
  }

  const { data: metas, error } = await metasQuery;

  if (error) throw new Error(error.message);
  const lista = metas ?? [];

  const porUsuario = new Map<string, VendedorTV>();
  for (const m of lista) {
    const uid = m.usuario_id as string;
    const meta = Number(m.valor_meta ?? 0);
    const realizadoBase = Number(m.valor_realizado ?? 0);
    const projecao = Number(m.valor_projecao ?? 0);
    const categoria = (m.categoria as string) || "geral";

    if (!porUsuario.has(uid)) {
      porUsuario.set(uid, {
        usuario_id: uid,
        nome: uid,
        iniciais: null,
        meta: 0,
        realizado: 0,
        projecao: 0,
        categorias: {},
      });
    }
    const v = porUsuario.get(uid)!;
    v.meta += meta;
    v.realizado += ehMesCheio ? realizadoBase : 0;
    v.projecao += projecao;
    v.categorias[categoria] = {
      meta: (v.categorias[categoria]?.meta ?? 0) + meta,
      realizado: (v.categorias[categoria]?.realizado ?? 0) + (ehMesCheio ? realizadoBase : 0),
    };
  }

  if (!ehMesCheio || filtro.modo === "anterior") {
    let vendasQuery = supabase
      .from("vendas_diarias")
      .select("usuario_id, categoria, data, valor_venda")
      .gte("data", inicio)
      .lte("data", fim);
    if (filialId) {
      vendasQuery = vendasQuery.eq("filial_id", filialId);
    }
    const { data: vendas, error: vendasErr } = await vendasQuery;

    if (vendasErr) {
      console.warn("[TV] Falha ao buscar vendas_diarias:", vendasErr.message);
    } else if (vendas) {
      for (const venda of vendas) {
        const uid = venda.usuario_id as string;
        const valor = Number(venda.valor_venda ?? 0);
        const cat = (venda.categoria as string) || "faturamento";
        if (!porUsuario.has(uid)) {
          porUsuario.set(uid, {
            usuario_id: uid,
            nome: uid,
            iniciais: null,
            meta: 0,
            realizado: 0,
            projecao: 0,
            categorias: {},
          });
        }
        const v = porUsuario.get(uid)!;
        v.realizado += valor;
        if (!v.categorias[cat]) v.categorias[cat] = { meta: 0, realizado: 0 };
        v.categorias[cat].realizado += valor;
      }
    }
  }

  const uids = Array.from(porUsuario.keys());
  let perfis: { id: string; nome: string; iniciais: string | null }[] = [];
  if (uids.length > 0) {
    const { data: profData, error: profErr } = await supabase
      .from("profiles")
      .select("id, nome, iniciais")
      .in("id", uids);
    if (profErr) {
      console.warn("[TV] Falha ao buscar profiles:", profErr.message);
    } else {
      perfis = (profData ?? []) as { id: string; nome: string; iniciais: string | null }[];
    }
  }
  const perfMap = new Map(perfis.map((p) => [p.id, p]));
  for (const v of porUsuario.values()) {
    const p = perfMap.get(v.usuario_id);
    if (p) {
      v.nome = p.nome || v.usuario_id;
      v.iniciais = p.iniciais;
    }
  }

  const vendedores = Array.from(porUsuario.values())
    .filter((v) => v.meta > 0 || v.realizado > 0)
    .sort((a, b) => b.realizado - a.realizado);
  const metaTotal = vendedores.reduce((s, v) => s + v.meta, 0);
  const realizadoTotal = vendedores.reduce((s, v) => s + v.realizado, 0);
  const projecaoTotal = vendedores.reduce((s, v) => s + v.projecao, 0);

  return {
    metaTotal,
    realizadoTotal,
    projecaoTotal,
    vendedores,
    origem: ehMesCheio && filtro.modo === "atual" ? "metas" : "vendas",
    dataInicio: inicio,
    dataFim: fim,
  };
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function KpiCardTV({
  label,
  value,
  icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur sm:p-4"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}22, 0 8px 24px -16px ${accent}88` }}
    >
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl sm:h-28 sm:w-28"
        style={{ background: `${accent}55` }}
      />
      <div className="relative flex items-center gap-2 sm:gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10"
          style={{ background: `${accent}22`, color: accent }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 sm:text-[11px] sm:tracking-[0.2em]">{label}</p>
          {sub && <p className="truncate text-[9px] text-slate-500 sm:text-[11px]">{sub}</p>}
        </div>
      </div>
      <p className="font-num mt-2 text-xl font-bold sm:mt-3 sm:text-2xl lg:text-3xl" style={{ color: COLORS.white }}>
        {value}
      </p>
    </motion.div>
  );
}

function BarraProgressoTV({
  pctValor,
  cor,
  altura = "h-3",
}: {
  pctValor: number;
  cor: string;
  altura?: string;
}) {
  const w = Math.max(0, Math.min(100, pctValor));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/10 ${altura}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: cor, boxShadow: `0 0 12px ${cor}aa` }}
        initial={{ width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

function LinhaVendedorTV({ v, rank }: { v: VendedorTV; rank: number }) {
  const pctVal = v.meta > 0 ? (v.realizado / v.meta) * 100 : 0;
  const falta = Math.max(0, v.meta - v.realizado);
  const st = statusPct(pctVal);
  const iniciais = v.iniciais || v.nome.slice(0, 2).toUpperCase();
  const medalha = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: rank * 0.03 }}
      className="border-b border-white/5 hover:bg-white/[0.03]"
    >
      <td className="px-2 py-1 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="w-4 text-center text-[10px] sm:w-5 sm:text-sm">{medalha ?? `#${rank + 1}`}</span>
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold sm:h-9 sm:w-9 sm:text-xs"
            style={{ background: `${st.color}22`, color: st.color }}
          >
            {iniciais}
          </div>
          <span className="font-display truncate text-[10px] text-white sm:text-sm lg:text-base">{v.nome}</span>
        </div>
      </td>
      <td className="px-2 py-1 font-num text-[10px] text-slate-300 sm:px-4 sm:py-2.5 sm:text-sm lg:text-base">
        {brlMoeda(v.meta, 0)}
      </td>
      <td className="px-2 py-1 font-num text-[10px] font-semibold text-white sm:px-4 sm:py-2.5 sm:text-sm lg:text-base">
        {brlMoeda(v.realizado, 0)}
      </td>
      <td className="px-2 py-1 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <BarraProgressoTV pctValor={pctVal} cor={st.color} altura="h-1.5 sm:h-2.5" />
          </div>
          <span
            className="font-num w-8 text-right text-[10px] font-bold sm:w-14 sm:text-sm lg:text-base"
            style={{ color: st.color }}
          >
            {fmtPct(pctVal, 1)}
          </span>
        </div>
      </td>
      <td className="hidden px-2 py-1 font-num text-[10px] text-slate-400 dark:text-slate-500 sm:table-cell sm:px-4 sm:py-2.5 sm:text-sm lg:text-base">
        {brlMoeda(falta, 0)}
      </td>
      <td className="px-2 py-1 sm:px-4 sm:py-2.5">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:px-2.5 sm:py-1 sm:text-[10px]"
          style={{ background: st.bg, color: st.color }}
        >
          {pctVal >= 100 ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Activity className="h-2.5 w-2.5" />}
          {st.label}
        </span>
      </td>
    </motion.tr>
  );
}

// ============================================================================
// TV LOGIN GATE
// ============================================================================

function TVLoginGate({ onSucesso, onVoltar }: { onSucesso: () => void; onVoltar: () => void }) {
  const { login } = useAuth();
  const fnBuscarMatricula = useServerFn(buscarEmailPorMatricula);
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!identificador.trim() || !senha.trim()) {
      setErro("Preencha identificador e senha.");
      return;
    }
    setBusy(true);
    try {
      const ehEmail = identificador.trim().includes("@");
      let ok = false;
      if (ehEmail) {
        ok = await login(identificador.trim(), senha.trim());
      } else {
        try {
          const r = await fnBuscarMatricula({
            data: { primeiro_nome: identificador.trim(), matricula: senha.trim() },
          });
          ok = await login(r.email, r.senha);
        } catch (err: any) {
          setErro(err.message || "Credenciais inválidas.");
          setBusy(false);
          return;
        }
      }
      if (!ok) {
        setErro("E-mail, senha ou matrícula inválidos. Verifique suas credenciais.");
        setBusy(false);
        return;
      }
      onSucesso();
    } catch (err: any) {
      setErro(err.message || "Falha inesperada no login.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative z-10 flex [min-height:100dvh] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/30">
              <Lock className="h-7 w-7 text-white" />
            </div>
            <h2 className="font-display mt-4 text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Painel TV Mode disponível apenas para <span className="font-semibold text-blue-300">Admin Master</span>, <span className="font-semibold text-blue-300">Gerente</span> ou <span className="font-semibold text-blue-300">Supervisor</span>.
            </p>
          </div>

          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Faça login com sua conta corporativa. Após autenticar, o sistema verificará
                automaticamente se seu perfil tem permissão para visualizar o monitoramento em tempo real.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <UserIcon className="h-3 w-3" /> E-mail ou Primeiro Nome
              </label>
              <input
                type="text"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="ex: joao.silva@empresa.com OU joao"
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <Lock className="h-3 w-3" /> Senha ou Matrícula
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Sua senha ou matrícula"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {erro && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {busy ? "Autenticando..." : "Entrar e liberar painel"}
            </button>
          </form>

          <button
            onClick={onVoltar}
            className="mt-4 w-full rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
          >
            ← Voltar para a landing page
          </button>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            Após o login, seu perfil será validado. Apenas admin, gerente ou supervisor terão acesso ao monitoramento.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// TV MODE PANEL — Pode operar em 2 modos:
// - Overlay (quando chamado da LandingPage com onClose)
// - Standalone (quando acessado via rota /tv — sem onClose, botão "Sair" volta para /)
// ============================================================================

interface TVModePanelProps {
  onClose?: () => void;
  /** Se true, renderiza como página full (não overlay). Default: false. */
  standalone?: boolean;
}

export default function TVModePanel({ onClose, standalone = false }: TVModePanelProps) {
  const navigate = useNavigate();
  const { usuario, carregando, logout } = useAuth();
  const [resumo, setResumo] = useState<ResumoLoja | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(30);
  const [filtro, setFiltro] = useState<FiltroPeriodo>({ modo: "atual" });
  const [showCalendario, setShowCalendario] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  // Detecta mudança de orientação para ajustar overflow
  useEffect(() => {
    const check = () => setIsMobileLandscape(
      window.matchMedia("(orientation: landscape) and (max-height: 500px)").matches
    );
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  const acessoLiberado = usuario ? podeAcessarTV(usuario.perfil) : false;

  const fechar = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      // Modo standalone: volta para home
      navigate({ to: "/" });
    }
  }, [onClose, navigate]);

  // Sair da conta atual e voltar para o login gate do TV
  const trocarConta = useCallback(async () => {
    try {
      await logout();
    } catch {
      // mesmo se falhar, limpa localStorage e recarrega
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      window.location.reload();
    }
  }, [logout]);

  const buscar = useCallback(
    async (silencoso = false) => {
      if (!usuario || !podeAcessarTV(usuario.perfil)) return;
      if (silencoso) setAtualizando(true);
      else setLoading(true);
      setErro(null);
      try {
        // Admin usa seletor global (filialFiltro); gerente/supervisor usa sua filial
        const filialId = usuario.perfil === "admin"
          ? (localStorage.getItem("orion-filial-selecionada") === "todas" ? undefined : localStorage.getItem("orion-filial-selecionada") || undefined)
          : usuario.filialId;
        const r = await carregarResumoLoja(filtro, filialId || undefined);
        setResumo(r);
        setUltimaAtualizacao(new Date());
        setSegundosRestantes(30);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErro(msg || "Falha ao carregar dados do painel.");
      } finally {
        setLoading(false);
        setAtualizando(false);
      }
    },
    [filtro, usuario],
  );

  useEffect(() => {
    if (!acessoLiberado) return;
    void buscar();
    const refresh = setInterval(() => void buscar(true), 30_000);
    const ticker = setInterval(() => {
      setSegundosRestantes((s) => (s <= 1 ? 30 : s - 1));
    }, 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(ticker);
    };
  }, [buscar, acessoLiberado]);

  // Modo standalone: controla overflow do body
  useEffect(() => {
    if (standalone) {
      document.body.style.overflow = "";
    }
  }, [standalone]);

  const metaTotal = resumo?.metaTotal ?? 0;
  const realizadoTotal = resumo?.realizadoTotal ?? 0;
  const projecaoTotal = resumo?.projecaoTotal ?? 0;
  const faltaTotal = Math.max(0, metaTotal - realizadoTotal);
  const pctLoja = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0;
  const stLoja = statusPct(pctLoja);

  const hora = ultimaAtualizacao.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const periodoRotulo = resolverPeriodo(filtro).rotulo;

  const trocarMes = (dir: "prev" | "next") => {
    if (dir === "prev") {
      if (filtro.modo === "atual") setFiltro({ modo: "anterior" });
      else if (filtro.modo === "anterior") {
        const p = periodoMesAnterior();
        const d = new Date(p.inicio + "T00:00:00");
        d.setMonth(d.getMonth() - 1);
        const novoInicio = d.toISOString().slice(0, 8) + "01";
        const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const novoFim = d.toISOString().slice(0, 8) + String(ultimoDia).padStart(2, "0");
        setFiltro({ modo: "custom", customInicio: novoInicio, customFim: novoFim });
      } else if (filtro.modo === "custom" && filtro.customInicio) {
        const d = new Date(filtro.customInicio + "T00:00:00");
        d.setMonth(d.getMonth() - 1);
        const novoInicio = d.toISOString().slice(0, 8) + "01";
        const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const novoFim = d.toISOString().slice(0, 8) + String(ultimoDia).padStart(2, "0");
        setFiltro({ modo: "custom", customInicio: novoInicio, customFim: novoFim });
      }
    } else {
      const atual = periodoMesAtual();
      if (filtro.modo === "anterior") {
        setFiltro({ modo: "atual" });
      } else if (filtro.modo === "custom" && filtro.customInicio) {
        const d = new Date(filtro.customInicio + "T00:00:00");
        d.setMonth(d.getMonth() + 1);
        const novoInicio = d.toISOString().slice(0, 8) + "01";
        const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const novoFim = d.toISOString().slice(0, 8) + String(ultimoDia).padStart(2, "0");
        if (novoInicio === atual.inicio) setFiltro({ modo: "atual" });
        else if (novoInicio < atual.inicio) setFiltro({ modo: "custom", customInicio: novoInicio, customFim: novoFim });
      }
    }
  };

  const podeAvancar = (): boolean => {
    const atual = periodoMesAtual();
    if (filtro.modo === "anterior") return true;
    if (filtro.modo === "atual") return false;
    if (filtro.modo === "custom" && filtro.customInicio) {
      return filtro.customInicio < atual.inicio;
    }
    return false;
  };

  // Classes wrapper: overlay (fixed) ou página standalone
  // Usa 100dvh (dynamic viewport) para se adaptar à rotação em mobile
  // Em landscape mobile, permite scroll vertical para não cortar conteúdo
  const wrapperClass = standalone
    ? `orion-tv-panel relative flex flex-col [height:100dvh] ${isMobileLandscape ? "overflow-y-auto orion-tv-scroll" : "overflow-hidden"}`
    : `orion-tv-panel fixed inset-0 z-[90] flex flex-col [height:100dvh] ${isMobileLandscape ? "overflow-y-auto orion-tv-scroll" : "overflow-hidden"}`;

  // ============ ESTADOS DE ACESSO ============

  if (carregando) {
    return (
      <>
        <style>{TV_STYLES}</style>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={standalone ? "flex [min-height:100dvh] items-center justify-center" : "fixed inset-0 z-[90] flex items-center justify-center"}
          style={{ background: "#06101f" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-12 w-12 animate-spin rounded-full border-4 border-white/10"
              style={{ borderTopColor: COLORS.blueLight }}
            />
            <p className="text-sm text-slate-400 dark:text-slate-500">Verificando sessão...</p>
          </div>
        </motion.div>
      </>
    );
  }

  if (!usuario) {
    return (
      <>
        <style>{TV_STYLES}</style>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={standalone ? "relative [min-height:100dvh] overflow-y-auto orion-tv-scroll" : "fixed inset-0 z-[90] overflow-y-auto orion-tv-scroll"}
          style={{ background: "#06101f" }}
        >
          <div className="pointer-events-none absolute inset-0 orion-aurora-bg opacity-30" />
          <div className="pointer-events-none absolute inset-0 orion-grid-mesh opacity-40" />
          <TVLoginGate onSucesso={() => void buscar()} onVoltar={fechar} />
        </motion.div>
      </>
    );
  }

  if (!acessoLiberado) {
    return (
      <>
        <style>{TV_STYLES}</style>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={standalone ? "relative flex [min-height:100dvh] items-center justify-center overflow-y-auto p-6 orion-tv-scroll" : "fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-6 orion-tv-scroll"}
          style={{ background: "#06101f" }}
        >
          <div className="pointer-events-none absolute inset-0 orion-aurora-bg opacity-30" />
          <div className="pointer-events-none absolute inset-0 orion-grid-mesh opacity-40" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center backdrop-blur-xl"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20">
              <ShieldAlert className="h-7 w-7 text-red-300" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Perfil sem acesso</h2>
            <p className="mt-2 text-sm text-slate-300">
              Olá, <span className="font-semibold text-white">{usuario.nome.split(" ")[0]}</span>!
              Seu perfil <span className="font-bold uppercase text-red-300">{usuario.perfil}</span> não tem
              permissão para visualizar o Painel TV Mode.
            </p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Acesso liberado apenas para <strong>Admin Master</strong>, <strong>Gerente</strong> ou{" "}
              <strong>Supervisor</strong>. Solicite à gestão a alteração do seu perfil caso precise acompanhar
              o monitoramento em tempo real.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={trocarConta}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 hover:from-blue-500 hover:to-indigo-500"
              >
                <LogOut className="h-4 w-4" />
                Sair e entrar com outra conta
              </button>
              <button
                onClick={fechar}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                ← Voltar para a landing page
              </button>
            </div>
          </motion.div>
        </motion.div>
      </>
    );
  }

  // Acesso liberado — painel completo
  return (
    <>
      <style>{TV_STYLES}</style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={wrapperClass}
        style={{ background: "#06101f" }}
      >
        <div className="pointer-events-none absolute inset-0 orion-aurora-bg opacity-30" />
        <div className="pointer-events-none absolute inset-0 orion-grid-mesh opacity-40" />

        {/* HEADER — compacto, altura fixa */}
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-4 py-2 backdrop-blur sm:px-6 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg sm:h-10 sm:w-10"
              style={{ background: COLORS.blueOrion }}
            >
              <Tv className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold tracking-wide text-white sm:text-lg lg:text-xl">
                ORION · Monitoramento em Tempo Real
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 sm:text-xs">
                atualização a cada 30s · logado como{" "}
                <span className="font-semibold text-blue-300">{usuario.nome.split(" ")[0]}</span> (
                <span className="uppercase">{usuario.perfil}</span>)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 sm:px-2.5">
              <span className="orion-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400 sm:h-2 sm:w-2" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 sm:text-xs">AO VIVO</span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 lg:flex sm:text-xs">
              <Clock className="h-3 w-3" />
              <span>Próx: {segundosRestantes}s</span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 xl:flex sm:text-xs">
              <Wifi className="h-3 w-3" />
              <span>{hora}</span>
            </div>
            <button
              onClick={() => void buscar(true)}
              disabled={atualizando}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
              aria-label="Atualizar agora"
              title="Atualizar agora"
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${atualizando ? "animate-spin" : ""}`} />
              <span className="hidden md:inline">Atualizar</span>
            </button>
            <button
              onClick={fechar}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-200 hover:bg-red-500/20 hover:text-red-300 sm:px-2.5 sm:py-1.5 sm:text-xs"
              aria-label="Fechar painel"
            >
              <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden md:inline">Fechar</span>
            </button>
          </div>
        </header>

        {/* SELETOR DE PERÍODO — compacto */}
        <div className="relative z-10 border-b border-white/5 bg-black/30 px-3 py-1.5 backdrop-blur sm:px-6 sm:py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:flex sm:text-xs">
                <Calendar className="h-3 w-3" /> Período:
              </span>

              <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 p-0.5">
                <button
                  onClick={() => setFiltro({ modo: "atual" })}
                  className={`rounded px-2 py-1 text-[10px] font-semibold transition sm:text-xs ${
                    filtro.modo === "atual"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Mês atual
                </button>
                <button
                  onClick={() => setFiltro({ modo: "anterior" })}
                  className={`rounded px-2 py-1 text-[10px] font-semibold transition sm:text-xs ${
                    filtro.modo === "anterior"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Mês anterior
                </button>
                <button
                  onClick={() => {
                    if (filtro.modo !== "custom") {
                      setFiltro({
                        modo: "custom",
                        customInicio: mesAtualInicio(),
                        customFim: new Date().toISOString().slice(0, 10),
                      });
                    }
                    setShowCalendario((s) => !s);
                  }}
                  className={`rounded px-2 py-1 text-[10px] font-semibold transition sm:text-xs ${
                    filtro.modo === "custom"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Personalizado
                </button>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => trocarMes("prev")}
                  className="rounded-md border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10"
                  title="Mês anterior"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[140px] text-center text-[10px] font-semibold text-slate-200 sm:min-w-[180px] sm:text-xs">
                  {periodoRotulo}
                </span>
                <button
                  onClick={() => trocarMes("next")}
                  disabled={!podeAvancar()}
                  className="rounded-md border border-white/10 bg-white/5 p-1 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
                  title="Próximo mês"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {filtro.modo === "custom" && showCalendario && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-white/5 p-2"
              >
                <label className="flex items-center gap-1.5 text-[10px] text-slate-300 sm:text-xs">
                  De:
                  <input
                    type="date"
                    value={filtro.customInicio || ""}
                    onChange={(e) => setFiltro({ ...filtro, customInicio: e.target.value })}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white outline-none focus:border-blue-500 sm:text-xs"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-300 sm:text-xs">
                  Até:
                  <input
                    type="date"
                    value={filtro.customFim || ""}
                    onChange={(e) => setFiltro({ ...filtro, customFim: e.target.value })}
                    className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white outline-none focus:border-blue-500 sm:text-xs"
                  />
                </label>
                <button
                  onClick={() => void buscar()}
                  className="rounded bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-500 sm:text-xs"
                >
                  Aplicar
                </button>
              </motion.div>
            )}

            <div className="hidden items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 xl:flex sm:text-xs">
              <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">
                {resumo?.origem === "metas" ? "Fonte: metas" : "Fonte: vendas"}
              </span>
              <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">
                {resumo ? `${resumo.dataInicio} → ${resumo.dataFim}` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* CONTEÚDO — flex-1 para ocupar espaço restante, min-h-0 para permitir shrink */}
        <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-1.5 px-2 py-1.5 sm:gap-3 sm:px-4 sm:py-3 lg:gap-4">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <div
                className="h-10 w-10 animate-spin rounded-full border-4 border-white/10"
                style={{ borderTopColor: COLORS.blueLight }}
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 sm:text-sm">Carregando dados da loja...</p>
            </div>
          ) : erro ? (
            <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center sm:p-6">
              <AlertTriangle className="mb-2 h-8 w-8 text-red-400 sm:h-10 sm:w-10" />
              <h3 className="text-base font-bold text-white sm:text-lg">Não foi possível carregar</h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 sm:text-sm">{erro}</p>
              <button
                onClick={() => void buscar()}
                className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 sm:px-4 sm:py-2 sm:text-sm"
              >
                Tentar novamente
              </button>
            </div>
          ) : resumo && resumo.vendedores.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-6 text-center sm:p-8">
              <Target className="mb-2 h-10 w-10 text-slate-500 sm:h-12 sm:w-12" />
              <h3 className="text-base font-bold text-white sm:text-lg">Nenhuma meta encontrada</h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 sm:text-sm">
                Não há metas ou vendas registradas para o período selecionado ({periodoRotulo}).
              </p>
            </div>
          ) : resumo ? (
            <>
              {/* KPIs — compactos, grid responsivo */}
              <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
                <KpiCardTV
                  label="Meta da Loja"
                  value={brlMoeda(metaTotal, 0)}
                  icon={<Target className="h-4 w-4 sm:h-5 sm:w-5" />}
                  accent={COLORS.blueLight}
                  sub={`${resumo.vendedores.length} vendedores`}
                />
                <KpiCardTV
                  label="Realizado"
                  value={brlMoeda(realizadoTotal, 0)}
                  icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />}
                  accent={COLORS.green}
                  sub="Total acumulado"
                />
                <KpiCardTV
                  label="Falta para Meta"
                  value={brlMoeda(faltaTotal, 0)}
                  icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
                  accent={faltaTotal > 0 ? COLORS.orange : COLORS.green}
                  sub={faltaTotal > 0 ? "Ainda falta bater" : "Meta atingida!"}
                />
                <KpiCardTV
                  label="% Atingimento"
                  value={fmtPct(pctLoja, 1)}
                  icon={<Trophy className="h-4 w-4 sm:h-5 sm:w-5" />}
                  accent={stLoja.color}
                  sub={`Projeção: ${brlMoeda(projecaoTotal, 0)}`}
                />
              </section>

              {/* Progresso Geral — compacto, em linha */}
              <section className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-bold text-white sm:text-base lg:text-lg">
                      Progresso Geral da Loja
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 sm:text-xs">
                      {fmtPct(pctLoja, 1)} da meta ·{" "}
                      {faltaTotal > 0 ? `faltam ${brlMoeda(faltaTotal, 0)}` : "meta conquistada"}
                    </p>
                  </div>
                  <p
                    className="font-num text-lg font-bold sm:text-xl lg:text-2xl"
                    style={{ color: stLoja.color }}
                  >
                    {fmtPct(pctLoja, 1)}
                  </p>
                </div>
                <div className="mt-2">
                  <BarraProgressoTV pctValor={pctLoja} cor={stLoja.color} altura="h-2.5 sm:h-3" />
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-slate-500 sm:text-[11px]">
                  <span>R$ 0</span>
                  <span>Meta: {brlMoeda(metaTotal, 0)}</span>
                </div>
              </section>

              {/* Tabela de vendedores — flex-1 min-h-0 para ocupar espaço restante sem overflow de página */}
              <section className="flex min-h-[120px] flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur sm:min-h-0">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 sm:px-4 sm:py-2.5">
                  <h3 className="font-display text-xs font-bold text-white sm:text-base lg:text-lg">
                    Desempenho por Vendedor
                  </h3>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 sm:text-xs">
                    {resumo.vendedores.length} vendedores · {periodoRotulo}
                  </span>
                </div>
                {/* Container da tabela: flex-1 min-h-0 + overflow auto permite scroll só na tabela */}
                <div className="min-h-0 flex-1 overflow-auto orion-tv-scroll">
                  <table className="w-full min-w-[480px] table-fixed sm:min-w-[640px]">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[26%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-[#0a192f]">
                      <tr className="border-b border-white/10 text-left text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-xs">
                        <th className="px-2 py-1 font-semibold sm:px-4 sm:py-2.5">Vendedor</th>
                        <th className="px-2 py-1 font-semibold sm:px-4 sm:py-2.5">Meta</th>
                        <th className="px-2 py-1 font-semibold sm:px-4 sm:py-2.5">Realizado</th>
                        <th className="px-2 py-1 font-semibold sm:px-4 sm:py-2.5">Progresso</th>
                        <th className="hidden px-2 py-1 font-semibold sm:table-cell sm:px-4 sm:py-2.5">Falta</th>
                        <th className="px-2 py-1 font-semibold sm:px-4 sm:py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {resumo.vendedores.map((v, i) => (
                          <LinhaVendedorTV key={v.usuario_id} v={v} rank={i} />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Footer minimal — 1 linha, sem margin extra */}
              <p className="text-center text-[9px] text-slate-500 sm:text-[11px]">
                Orion TV Mode · {periodoRotulo} · Supabase em tempo real · atualização a cada 30s
              </p>
            </>
          ) : null}
        </main>
      </motion.div>
    </>
  );
}
