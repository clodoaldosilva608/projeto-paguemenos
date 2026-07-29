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

async function carregarResumoLoja(filtro: FiltroPeriodo): Promise<ResumoLoja> {
  const { inicio, fim } = resolverPeriodo(filtro);
  const ehMesCheio = filtro.modo !== "custom";

  const dataInicioMeta = inicio.slice(0, 8) + "01";
  const { data: metas, error } = await supabase
    .from("metas_individuais")
    .select("usuario_id, categoria, periodo, valor_meta, valor_realizado, valor_projecao, data_inicio")
    .eq("periodo", "mensal")
    .eq("data_inicio", dataInicioMeta);

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
    const { data: vendas, error: vendasErr } = await supabase
      .from("vendas_diarias")
      .select("usuario_id, categoria, data, valor_venda")
      .gte("data", inicio)
      .lte("data", fim);

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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}22, 0 12px 32px -16px ${accent}88` }}
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl"
        style={{ background: `${accent}55` }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: `${accent}22`, color: accent }}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
          {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
        </div>
      </div>
      <p className="font-num mt-4 text-3xl font-bold sm:text-4xl" style={{ color: COLORS.white }}>
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
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.04 }}
      className="border-b border-white/5 hover:bg-white/[0.03]"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="w-6 text-center text-base">{medalha ?? `#${rank + 1}`}</span>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
            style={{ background: `${st.color}22`, color: st.color }}
          >
            {iniciais}
          </div>
          <span className="font-display text-base text-white sm:text-lg">{v.nome}</span>
        </div>
      </td>
      <td className="px-4 py-4 font-num text-base text-slate-300 sm:text-lg">
        {brlMoeda(v.meta, 0)}
      </td>
      <td className="px-4 py-4 font-num text-base font-semibold text-white sm:text-lg">
        {brlMoeda(v.realizado, 0)}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-40 sm:w-56">
            <BarraProgressoTV pctValor={pctVal} cor={st.color} />
          </div>
          <span
            className="font-num w-16 text-right text-base font-bold sm:text-lg"
            style={{ color: st.color }}
          >
            {fmtPct(pctVal, 1)}
          </span>
        </div>
      </td>
      <td className="hidden px-4 py-4 font-num text-base text-slate-400 sm:table-cell sm:text-lg">
        {brlMoeda(falta, 0)}
      </td>
      <td className="px-4 py-4">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          style={{ background: st.bg, color: st.color }}
        >
          {pctVal >= 100 ? <CheckCircle2 className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
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
    <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
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
            <p className="mt-1 text-sm text-slate-400">
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
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
              <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
  const { usuario, carregando } = useAuth();
  const [resumo, setResumo] = useState<ResumoLoja | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(30);
  const [filtro, setFiltro] = useState<FiltroPeriodo>({ modo: "atual" });
  const [showCalendario, setShowCalendario] = useState(false);

  const acessoLiberado = usuario ? podeAcessarTV(usuario.perfil) : false;

  const fechar = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      // Modo standalone: volta para home
      navigate({ to: "/" });
    }
  }, [onClose, navigate]);

  const buscar = useCallback(
    async (silencioso = false) => {
      if (!usuario || !podeAcessarTV(usuario.perfil)) return;
      if (silencioso) setAtualizando(true);
      else setLoading(true);
      setErro(null);
      try {
        const r = await carregarResumoLoja(filtro);
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
  const wrapperClass = standalone
    ? "relative flex min-h-screen flex-col overflow-y-auto orion-tv-scroll"
    : "fixed inset-0 z-[90] flex flex-col overflow-y-auto orion-tv-scroll";

  // ============ ESTADOS DE ACESSO ============

  if (carregando) {
    return (
      <>
        <style>{TV_STYLES}</style>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={standalone ? "flex min-h-screen items-center justify-center" : "fixed inset-0 z-[90] flex items-center justify-center"}
          style={{ background: "#06101f" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-12 w-12 animate-spin rounded-full border-4 border-white/10"
              style={{ borderTopColor: COLORS.blueLight }}
            />
            <p className="text-sm text-slate-400">Verificando sessão...</p>
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
          className={standalone ? "relative min-h-screen overflow-y-auto orion-tv-scroll" : "fixed inset-0 z-[90] overflow-y-auto orion-tv-scroll"}
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
          className={standalone ? "relative flex min-h-screen items-center justify-center overflow-y-auto p-6 orion-tv-scroll" : "fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-6 orion-tv-scroll"}
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
            <p className="mt-2 text-xs text-slate-400">
              Acesso liberado apenas para <strong>Admin Master</strong>, <strong>Gerente</strong> ou{" "}
              <strong>Supervisor</strong>. Solicite à gestão a alteração do seu perfil caso precise acompanhar
              o monitoramento em tempo real.
            </p>
            <button
              onClick={fechar}
              className="mt-6 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              ← Voltar
            </button>
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

        {/* HEADER */}
        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/30 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: COLORS.blueOrion }}
            >
              <Tv className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-white sm:text-2xl">
                ORION · Monitoramento em Tempo Real
              </h2>
              <p className="text-xs text-slate-400">
                Painel TV · atualização automática a cada 30s · logado como{" "}
                <span className="font-semibold text-blue-300">{usuario.nome.split(" ")[0]}</span> (
                <span className="uppercase">{usuario.perfil}</span>)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="orion-live-dot h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">AO VIVO</span>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:flex">
              <Clock className="h-3.5 w-3.5" />
              <span>Próx. atualização em {segundosRestantes}s</span>
            </div>
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 md:flex">
              <Wifi className="h-3.5 w-3.5" />
              <span>Última: {hora}</span>
            </div>
            <button
              onClick={() => void buscar(true)}
              disabled={atualizando}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
              aria-label="Atualizar agora"
              title="Atualizar agora"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${atualizando ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={fechar}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-red-500/20 hover:text-red-300"
              aria-label="Fechar painel"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fechar painel</span>
            </button>
          </div>
        </header>

        {/* SELETOR DE PERÍODO */}
        <div className="relative z-10 border-b border-white/5 bg-black/20 px-6 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Calendar className="h-3.5 w-3.5" /> Período:
              </span>

              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => setFiltro({ modo: "atual" })}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    filtro.modo === "atual"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Mês atual
                </button>
                <button
                  onClick={() => setFiltro({ modo: "anterior" })}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    filtro.modo === "custom"
                      ? "bg-blue-600 text-white shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  Personalizado
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => trocarMes("prev")}
                  className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10"
                  title="Mês anterior"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[180px] text-center text-xs font-semibold text-slate-200">
                  {periodoRotulo}
                </span>
                <button
                  onClick={() => trocarMes("next")}
                  disabled={!podeAvancar()}
                  className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5"
                  title="Próximo mês"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {filtro.modo === "custom" && showCalendario && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  De:
                  <input
                    type="date"
                    value={filtro.customInicio || ""}
                    onChange={(e) => setFiltro({ ...filtro, customInicio: e.target.value })}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  Até:
                  <input
                    type="date"
                    value={filtro.customFim || ""}
                    onChange={(e) => setFiltro({ ...filtro, customFim: e.target.value })}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
                  />
                </label>
                <button
                  onClick={() => void buscar()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Aplicar
                </button>
              </motion.div>
            )}

            <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                {resumo?.origem === "metas" ? "Fonte: metas_individuais" : "Fonte: vendas_diarias"}
              </span>
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">
                {resumo ? `${resumo.dataInicio} → ${resumo.dataFim}` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
          {loading ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
              <div
                className="h-12 w-12 animate-spin rounded-full border-4 border-white/10"
                style={{ borderTopColor: COLORS.blueLight }}
              />
              <p className="text-sm text-slate-400">Carregando dados da loja...</p>
            </div>
          ) : erro ? (
            <div className="mx-auto mt-12 max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
              <h3 className="text-lg font-bold text-white">Não foi possível carregar</h3>
              <p className="mt-1 text-sm text-slate-400">{erro}</p>
              <button
                onClick={() => void buscar()}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Tentar novamente
              </button>
            </div>
          ) : resumo && resumo.vendedores.length === 0 ? (
            <div className="mx-auto mt-12 max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <Target className="mx-auto mb-3 h-12 w-12 text-slate-500" />
              <h3 className="text-lg font-bold text-white">Nenhuma meta encontrada</h3>
              <p className="mt-1 text-sm text-slate-400">
                Não há metas ou vendas registradas para o período selecionado ({periodoRotulo}).
              </p>
            </div>
          ) : resumo ? (
            <>
              <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCardTV
                  label="Meta da Loja"
                  value={brlMoeda(metaTotal, 0)}
                  icon={<Target className="h-6 w-6" />}
                  accent={COLORS.blueLight}
                  sub="Total mensal de todos os vendedores"
                />
                <KpiCardTV
                  label="Realizado"
                  value={brlMoeda(realizadoTotal, 0)}
                  icon={<DollarSign className="h-6 w-6" />}
                  accent={COLORS.green}
                  sub={`${resumo.vendedores.length} vendedores`}
                />
                <KpiCardTV
                  label="Falta para Meta"
                  value={brlMoeda(faltaTotal, 0)}
                  icon={<TrendingUp className="h-6 w-6" />}
                  accent={faltaTotal > 0 ? COLORS.orange : COLORS.green}
                  sub={faltaTotal > 0 ? "Ainda falta bater" : "Meta atingida!"}
                />
                <KpiCardTV
                  label="% Atingimento"
                  value={fmtPct(pctLoja, 1)}
                  icon={<Trophy className="h-6 w-6" />}
                  accent={stLoja.color}
                  sub={`Projeção: ${brlMoeda(projecaoTotal, 0)}`}
                />
              </section>

              <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                      Progresso Geral da Loja
                    </h3>
                    <p className="text-xs text-slate-400">
                      {fmtPct(pctLoja, 1)} da meta atingida ·{" "}
                      {faltaTotal > 0 ? `faltam ${brlMoeda(faltaTotal, 0)}` : "meta conquistada"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-num text-2xl font-bold sm:text-3xl"
                      style={{ color: stLoja.color }}
                    >
                      {fmtPct(pctLoja, 1)}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <BarraProgressoTV pctValor={pctLoja} cor={stLoja.color} altura="h-5" />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>R$ 0</span>
                  <span>Meta: {brlMoeda(metaTotal, 0)}</span>
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                  <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                    Desempenho por Vendedor
                  </h3>
                  <span className="text-xs text-slate-400">
                    {resumo.vendedores.length} vendedores ativos · {periodoRotulo}
                  </span>
                </div>
                <div className="overflow-x-auto orion-tv-scroll">
                  <table className="w-full min-w-[760px] table-fixed">
                    <colgroup>
                      <col className="w-[34%]" />
                      <col className="w-[15%]" />
                      <col className="w-[15%]" />
                      <col className="w-[24%]" />
                      <col className="w-[6%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3 font-semibold">Vendedor</th>
                        <th className="px-4 py-3 font-semibold">Meta</th>
                        <th className="px-4 py-3 font-semibold">Realizado</th>
                        <th className="px-4 py-3 font-semibold">Progresso</th>
                        <th className="hidden px-4 py-3 font-semibold sm:table-cell">Falta</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
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

              <p className="mt-6 text-center text-xs text-slate-500">
                Orion TV Mode · Período:{" "}
                <span className="font-semibold text-slate-400">{periodoRotulo}</span> · dados fornecidos
                pelo Supabase em tempo real · atualização a cada 30s
              </p>
            </>
          ) : null}
        </main>
      </motion.div>
    </>
  );
}
