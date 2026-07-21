import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { type MetaFuncionario } from "../../data/store";
import { useStore } from "../../hooks/useStore";
import { useVendasStore } from "../../hooks/useVendasStore";
import { listaVendedores } from "../../data/vendasDiarias";
import { brlMoeda, pct, numero } from "../../utils/format";
import { cn } from "../../utils/cn";

const META_MENSAL_PADRAO: Record<string, number> = {
  "u-clodoaldo": 24855.66,
  "u-elielton": 155292.03,
  "u-adelino": 150661.04,
  "u-mieko": 127215.6,
  "u-fabio": 178483.18,
  "u-alicia": 114613.03,
};

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function vendedorIdDoUsuario(nome: string, email: string): string | null {
  const nomeN = normalizar(nome);
  const emailPrefix = normalizar(email.split("@")[0] || "");
  for (const v of listaVendedores) {
    const vn = normalizar(v.nome);
    if (nomeN && (vn.includes(nomeN.split(" ")[0]) || nomeN.includes(vn.split(" ")[0]))) return v.id;
    if (emailPrefix && vn.split(" ")[0] === emailPrefix) return v.id;
  }
  return null;
}


const CATEGORIAS = ["Vendas", "Genéricos", "Marcas Exclusivas", "Clientes", "Outros"];
const UNIDADES = ["R$", "unidades", "clientes", "pontos", "%"];

const STATUS_CONFIG: Record<string, { label: string; bg: string }> = {
  pendente: { label: "Pendente", bg: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
  em_andamento: { label: "Em Andamento", bg: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  concluida: { label: "Concluída", bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  atrasada: { label: "Atrasada", bg: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
};

type StatusKey = "pendente" | "em_andamento" | "concluida" | "atrasada";

export default function MinhasMetasPage() {
  const { usuario } = useAuth();
  const { store, version } = useStore();
  const { store: vStore, version: vVersion } = useVendasStore();
  const [filtroStatus, setFiltroStatus] = useState<string>("Todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [metaEditando, setMetaEditando] = useState<MetaFuncionario | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { setTick((t) => t + 1); }, [version, vVersion]);

  // Metas sincronizadas com vendasStore (para usuários que são vendedores reais)
  const metasSincronizadas = useMemo<MetaFuncionario[]>(() => {
    if (!usuario) return [];
    const vid = vendedorIdDoUsuario(usuario.nome, usuario.email);
    if (!vid) return [];
    const vendas = vStore.listar().filter((v) => v.vendedorId === vid);
    if (vendas.length === 0) return [];
    const totalLiq = vendas.reduce((s, v) => s + v.valorVendaLiquida, 0);
    const totalRec = vendas.reduce((s, v) => s + v.valorVendaRecepto, 0);
    const totalClientes = vendas.reduce((s, v) => s + v.qtdeClienteVendaLiquida, 0);
    const metaTotal = META_MENSAL_PADRAO[vid] ?? Math.round(totalLiq * 1.6);
    const hoje = new Date().toISOString().slice(0, 10);
    return [
      {
        id: `sync-${vid}-fat`,
        usuarioId: usuario.id,
        titulo: "Faturamento Julho/2026",
        descricao: "Meta mensal sincronizada com o relatório de vendas",
        categoria: "Vendas",
        valorMeta: metaTotal,
        valorAtual: totalLiq + totalRec,
        unidade: "R$",
        dataInicio: "2026-07-01",
        dataFim: "2026-07-31",
        status: totalLiq + totalRec >= metaTotal ? "concluida" : "em_andamento",
        criadoEm: "2026-07-01",
        atualizadoEm: hoje,
      },
      {
        id: `sync-${vid}-clientes`,
        usuarioId: usuario.id,
        titulo: "Clientes atendidos no mês",
        descricao: "Total de clientes na venda líquida",
        categoria: "Clientes",
        valorMeta: Math.max(300, Math.round(totalClientes * 1.5)),
        valorAtual: totalClientes,
        unidade: "clientes",
        dataInicio: "2026-07-01",
        dataFim: "2026-07-31",
        status: "em_andamento",
        criadoEm: "2026-07-01",
        atualizadoEm: hoje,
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, usuario?.nome, usuario?.email, vVersion, tick]);

  const todasMetas = useMemo(() => {
    if (!usuario) return [];
    const doStore = store.getMetas(usuario.id);
    return [...metasSincronizadas, ...doStore];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, metasSincronizadas, tick, version]);

  const minhasMetas = useMemo(() => {
    if (filtroStatus === "Todas") return todasMetas;
    return todasMetas.filter((m) => m.status === filtroStatus);
  }, [todasMetas, filtroStatus]);

  const stats = useMemo(() => {
    return {
      total: todasMetas.length,
      concluidas: todasMetas.filter((m) => m.status === "concluida").length,
      emAndamento: todasMetas.filter((m) => m.status === "em_andamento").length,
      atrasadas: todasMetas.filter((m) => m.status === "atrasada").length,
      totalMeta: todasMetas.reduce((s, m) => s + (m.unidade === "R$" ? m.valorMeta : 0), 0),
      totalRealizado: todasMetas.reduce((s, m) => s + (m.unidade === "R$" ? m.valorAtual : 0), 0),
    };
  }, [todasMetas]);

  if (!usuario) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400 dark:border-slate-700">
        Faça login para ver suas metas.
      </div>
    );
  }

  const pctAtingimento = stats.totalMeta > 0 ? (stats.totalRealizado / stats.totalMeta) * 100 : 0;

  const salvarMeta = (meta: MetaFuncionario) => {
    // Segurança: só permite salvar metas do próprio usuário
    if (meta.usuarioId !== usuario.id) return;
    if (meta.id && store.getMetas().some((m) => m.id === meta.id)) {
      const existente = store.getMetas().find((m) => m.id === meta.id);
      if (existente && existente.usuarioId !== usuario.id) return;
      store.updateMeta(meta);
    } else {
      store.addMeta({ ...meta, usuarioId: usuario.id });
    }
  };

  const excluirMeta = (id: string) => {
    const m = store.getMetas().find((x) => x.id === id);
    if (!m || m.usuarioId !== usuario.id) return;
    store.deleteMeta(id);
    setMetaEditando(null);
  };

  const atualizarRapido = (m: MetaFuncionario, val: number) => {
    if (m.usuarioId !== usuario.id) return;
    const novo = m.valorAtual + val;
    store.updateMeta({
      ...m,
      valorAtual: novo,
      status: novo >= m.valorMeta ? "concluida" : "em_andamento",
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Progresso Geral</p>
          <p className="mt-2 text-4xl font-bold text-slate-800 dark:text-white">{pct(pctAtingimento, 1)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {brlMoeda(stats.totalRealizado)} de {brlMoeda(stats.totalMeta)}
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, pctAtingimento)}%` }}
              transition={{ duration: 0.8 }}
              className={cn(
                "h-full rounded-full",
                pctAtingimento >= 80 ? "bg-emerald-500" : pctAtingimento >= 50 ? "bg-blue-500" : "bg-amber-500"
              )}
            />
          </div>
        </div>
        {[
          { label: "Total", value: stats.total },
          { label: "Andamento", value: stats.emAndamento },
          { label: "Concluídas", value: stats.concluidas },
          { label: "Atrasadas", value: stats.atrasadas },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i }}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{s.label}</span>
            <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["Todas", "pendente", "em_andamento", "concluida", "atrasada"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition",
                filtroStatus === s
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
              )}
            >
              {s === "Todas" ? "Todas" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setMetaEditando(null);
            setModalAberto(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-500"
        >
          <span className="text-lg leading-none">+</span> Nova Meta
        </button>
      </div>

      {minhasMetas.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <span className="text-5xl">🎯</span>
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Nenhuma meta cadastrada</p>
          <p className="mt-1 text-xs text-slate-400">Clique em &quot;Nova Meta&quot; para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {minhasMetas.map((m, i) => {
              const pAting = m.valorMeta > 0 ? (m.valorAtual / m.valorMeta) * 100 : 0;
              const st = STATUS_CONFIG[m.status] || STATUS_CONFIG.em_andamento;
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-800 dark:text-white">{m.titulo}</h3>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", st.bg)}>{st.label}</span>
                      </div>
                      {m.descricao && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{m.descricao}</p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">
                        {m.categoria} · até {new Date(m.dataFim + "T12:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setMetaEditando(m);
                          setModalAberto(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => excluirMeta(m.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title="Excluir"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <span className="text-2xl font-bold text-slate-800 dark:text-white">
                          {m.unidade === "R$" ? brlMoeda(m.valorAtual) : numero(m.valorAtual)}
                        </span>
                        <span className="text-sm text-slate-400 dark:text-slate-500">
                          {" "}
                          / {m.unidade === "R$" ? brlMoeda(m.valorMeta) : numero(m.valorMeta)} {m.unidade}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-bold",
                          pAting >= 80
                            ? "text-emerald-600 dark:text-emerald-400"
                            : pAting >= 50
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {pct(pAting, 1)}
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pAting)}%` }}
                        transition={{ duration: 0.6 }}
                        className={cn(
                          "h-full rounded-full",
                          pAting >= 80 ? "bg-emerald-500" : pAting >= 50 ? "bg-blue-500" : "bg-amber-500"
                        )}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder={`+ ${m.unidade}`}
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = parseFloat((e.target as HTMLInputElement).value);
                          if (!isNaN(val) && val > 0) {
                            atualizarRapido(m, val);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <span className="text-[10px] text-slate-400">Enter</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <MetaFormModal
        key={metaEditando?.id || "nova"}
        aberto={modalAberto}
        onFechar={() => {
          setModalAberto(false);
          setMetaEditando(null);
        }}
        meta={metaEditando}
        usuarioId={usuario.id}
        onSave={salvarMeta}
      />
    </motion.div>
  );
}

function MetaFormModal({
  aberto,
  onFechar,
  meta,
  usuarioId,
  onSave,
}: {
  aberto: boolean;
  onFechar: () => void;
  meta: MetaFuncionario | null;
  usuarioId: string;
  onSave: (m: MetaFuncionario) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("Vendas");
  const [valorMeta, setValorMeta] = useState("");
  const [valorAtual, setValorAtual] = useState("0");
  const [unidade, setUnidade] = useState("R$");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState("");
  const [status, setStatus] = useState<StatusKey>("em_andamento");
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  useEffect(() => {
    if (!aberto) return;
    setTitulo(meta?.titulo || "");
    setDescricao(meta?.descricao || "");
    setCategoria(meta?.categoria || "Vendas");
    setValorMeta(meta?.valorMeta?.toString() || "");
    setValorAtual(meta?.valorAtual?.toString() || "0");
    setUnidade(meta?.unidade || "R$");
    setDataInicio(meta?.dataInicio || new Date().toISOString().slice(0, 10));
    setDataFim(meta?.dataFim || "");
    setStatus(meta?.status || "em_andamento");
    setErros([]);
  }, [aberto, meta]);

  const salvar = async () => {
    const lista: string[] = [];
    if (!titulo.trim()) lista.push("Título é obrigatório");
    if (!valorMeta || parseFloat(valorMeta) <= 0) lista.push("Valor da meta deve ser maior que zero");
    if (!dataInicio) lista.push("Data de início é obrigatória");
    if (!dataFim) lista.push("Data de fim é obrigatória");
    if (dataInicio && dataFim && dataFim < dataInicio) lista.push("Data fim deve ser após a data início");
    if (lista.length > 0) {
      setErros(lista);
      return;
    }

    setSalvando(true);
    await new Promise((r) => setTimeout(r, 300));
    onSave({
      id: meta?.id || "",
      usuarioId,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      categoria,
      valorMeta: parseFloat(valorMeta),
      valorAtual: parseFloat(valorAtual) || 0,
      unidade,
      dataInicio,
      dataFim,
      status,
      criadoEm: meta?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    });
    setSalvando(false);
    onFechar();
  };

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-[8vh] backdrop-blur-sm"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{meta ? "Editar Meta" : "Nova Meta"}</h2>
          <button onClick={onFechar} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          {erros.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              {erros.map((e, i) => (
                <p key={i} className="text-xs font-medium text-red-600 dark:text-red-400">
                  • {e}
                </p>
              ))}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Ex: Faturamento Julho"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              placeholder="Detalhes..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unidade</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor da Meta *</label>
              <input
                type="number"
                value={valorMeta}
                onChange={(e) => setValorMeta(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor Atual</label>
              <input
                type="number"
                value={valorAtual}
                onChange={(e) => setValorAtual(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Início *</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Data Fim *</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(STATUS_CONFIG) as [StatusKey, (typeof STATUS_CONFIG)[StatusKey]][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={cn(
                    "rounded-lg border p-2.5 text-xs font-semibold transition",
                    status === key
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                  )}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5 dark:border-slate-800">
          <button
            onClick={onFechar}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-500 disabled:opacity-50"
          >
            {salvando && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {meta ? "Salvar" : "Criar Meta"}
          </button>
        </div>
      </div>
    </div>
  );
}
