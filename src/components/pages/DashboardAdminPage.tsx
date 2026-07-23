import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users2, TrendingUp, Target, DollarSign, Package, Edit3, X,
  Search, Crown, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

interface MetaVendedor {
  usuario_id: string;
  nome: string;
  email: string;
  iniciais: string;
  perfil: string;
  cargo: string | null;
  filial_id: string | null;
  categorias: {
    faturamento?: { meta: number; realizado: number; projecao: number };
    marcas_exclusivas?: { meta: number; realizado: number; projecao: number };
    genericos?: { meta: number; realizado: number; projecao: number };
    super_desconto?: { meta: number; realizado: number; projecao: number };
  };
  total_clientes?: number;
  ticket_medio?: number;
}

interface PerfilFiltro {
  busca: string;
  apenasAtivos: boolean;
}

export default function DashboardAdminPage({ onImpersonate }: { onImpersonate?: (userId: string, nome: string) => void }) {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<MetaVendedor[]>([]);
  const [filtro, setFiltro] = useState<PerfilFiltro>({ busca: "", apenasAtivos: true });
  const [selected, setSelected] = useState<MetaVendedor | null>(null);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      // 1) Buscar profiles com role vendedor
      const { data: profiles, error: errP } = await supabase
        .from("profiles")
        .select("id, nome, email, iniciais, ativo, filial_id, cargo")
        .order("nome");
      if (errP) throw new Error(errP.message);

      // 2) Buscar user_roles
      const { data: roles, error: errR } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (errR) throw new Error(errR.message);

      // 3) Buscar todas as metas mensais de julho
      const { data: metas, error: errM } = await supabase
        .from("metas_individuais")
        .select("usuario_id, categoria, valor_meta, valor_realizado, valor_projecao")
        .eq("periodo", "mensal")
        .eq("data_inicio", "2026-07-01");
      if (errM) throw new Error(errM.message);

      // 4) Montar estrutura
      const rolesMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const metasPorUser = new Map<string, MetaVendedor["categorias"]>();
      for (const m of metas ?? []) {
        if (!metasPorUser.has(m.usuario_id)) metasPorUser.set(m.usuario_id, {});
        const cat = metasPorUser.get(m.usuario_id)!;
        cat[m.categoria as keyof typeof cat] = {
          meta: Number(m.valor_meta ?? 0),
          realizado: Number(m.valor_realizado ?? 0),
          projecao: Number(m.valor_projecao ?? 0),
        };
      }

      const lista: MetaVendedor[] = (profiles ?? [])
        .filter((p) => {
          const role = rolesMap.get(p.id);
          return role === "vendedor";
        })
        .map((p) => ({
          usuario_id: p.id,
          nome: p.nome,
          email: p.email,
          iniciais: p.iniciais || p.nome.slice(0, 2).toUpperCase(),
          perfil: "vendedor",
          cargo: p.cargo,
          filial_id: p.filial_id,
          categorias: metasPorUser.get(p.id) ?? {},
        }))
        .filter((v) => v.categorias.faturamento); // só quem tem metas

      setVendedores(lista);
    } catch (e: any) {
      toast.error("Erro ao carregar vendedores: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtrados = vendedores.filter((v) => {
    if (filtro.busca) {
      const q = filtro.busca.toLowerCase();
      if (!v.nome.toLowerCase().includes(q) && !v.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Ranking por % de faturamento
  const ranking = [...filtrados].sort((a, b) => {
    const pctA = a.categorias.faturamento ? (a.categorias.faturamento.realizado / a.categorias.faturamento.meta) * 100 : 0;
    const pctB = b.categorias.faturamento ? (b.categorias.faturamento.realizado / b.categorias.faturamento.meta) * 100 : 0;
    return pctB - pctA;
  });

  // Totais da loja
  const totais = vendedores.reduce(
    (acc, v) => {
      if (v.categorias.faturamento) {
        acc.metaFat += v.categorias.faturamento.meta;
        acc.realFat += v.categorias.faturamento.realizado;
        acc.projFat += v.categorias.faturamento.projecao;
      }
      if (v.categorias.marcas_exclusivas) {
        acc.metaME += v.categorias.marcas_exclusivas.meta;
        acc.realME += v.categorias.marcas_exclusivas.realizado;
      }
      if (v.categorias.genericos) {
        acc.metaGen += v.categorias.genericos.meta;
        acc.realGen += v.categorias.genericos.realizado;
      }
      return acc;
    },
    { metaFat: 0, realFat: 0, projFat: 0, metaME: 0, realME: 0, metaGen: 0, realGen: 0 },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <div className="animate-pulse">Carregando dados dos vendedores...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1B4F8C] to-[#0F2D5C] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Painel do {usuario?.perfil === "admin" ? "Administrador" : "Gerente"}</p>
            <h1 className="mt-1 text-2xl font-bold">Visão Geral da Equipe</h1>
            <p className="mt-1 text-sm text-white/80">
              {vendedores.length} vendedores · Filial 7537 · Período: Julho/2026
            </p>
          </div>
          <Crown className="h-10 w-10 text-amber-300" />
        </div>

        {/* TOTAIS DA LOJA */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <TotaisCard
            titulo="Faturamento"
            meta={totais.metaFat}
            realizado={totais.realFat}
            projecao={totais.projFat}
          />
          <TotaisCard
            titulo="Marcas Exclusivas"
            meta={totais.metaME}
            realizado={totais.realME}
          />
          <TotaisCard
            titulo="Genéricos"
            meta={totais.metaGen}
            realizado={totais.realGen}
          />
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filtro.busca}
            onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })}
            placeholder="Buscar vendedor por nome ou e-mail..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <span className="text-xs text-slate-500">{filtrados.length} vendedores</span>
      </div>

      {/* LISTA DE VENDEDORES — cards visuais */}
      <div className="grid gap-3 lg:grid-cols-2">
        {ranking.map((v, idx) => {
          const fat = v.categorias.faturamento;
          if (!fat) return null;
          const pct = fat.meta > 0 ? (fat.realizado / fat.meta) * 100 : 0;
          const projPct = fat.meta > 0 ? (fat.projecao / fat.meta) * 100 : 0;
          const dentroMeta = pct >= 50 || projPct >= 100;

          return (
            <motion.div
              key={v.usuario_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-slate-900"
            >
              {/* Faixa de ranking */}
              <div className={`absolute left-0 top-0 h-full w-1 ${idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-slate-200 dark:bg-white/10"}`} />

              <div className="p-4 pl-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                      {v.iniciais}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {v.nome}
                        <span className="ml-2 text-xs text-slate-400">#{idx + 1}</span>
                      </h3>
                      <p className="text-xs text-slate-500">{v.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${dentroMeta ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"}`}>
                      {dentroMeta ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {dentroMeta ? "DENTRO DA META" : "ATENÇÃO"}
                    </span>
                    {fat.projecao > 0 && (
                      <span className="text-[10px] text-slate-400">Projeção: R$ {fat.projecao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>

                {/* BARRA DE PROGRESSO FATURAMENTO */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase text-slate-500">Faturamento</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">
                      R$ {fat.realizado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} / R$ {fat.meta.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                    {/* Marcador de projeção */}
                    {fat.projecao > 0 && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-slate-700 dark:bg-white"
                        style={{ left: `${Math.min(100, projPct)}%` }}
                        title={`Projeção: ${projPct.toFixed(1)}%`}
                      />
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{pct.toFixed(2)}% realizado</span>
                    {fat.projecao > 0 && <span>{projPct.toFixed(2)}% projeção</span>}
                  </div>
                </div>

                {/* MINI-GRID com outras categorias */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {v.categorias.marcas_exclusivas && (
                    <MiniStat titulo="Marcas Exclusivas" cat={v.categorias.marcas_exclusivas} Icon={Package} />
                  )}
                  {v.categorias.genericos && (
                    <MiniStat titulo="Genéricos" cat={v.categorias.genericos} Icon={Target} />
                  )}
                </div>

                {/* AÇÕES */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setSelected(v)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Ver detalhes / Editar
                  </button>
                  {onImpersonate && (
                    <button
                      onClick={() => onImpersonate(v.usuario_id, v.nome)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                      title={`Acessar como ${v.nome}`}
                    >
                      <Users2 className="h-3.5 w-3.5" /> Acessar como
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* MODAL DE DETALHES/EDIÇÃO */}
      <AnimatePresence>
        {selected && (
          <DetalhesVendedorModal
            vendedor={selected}
            editando={editando}
            onToggleEdit={() => setEditando(!editando)}
            onClose={() => { setSelected(null); setEditando(false); }}
            onSalvar={async (categorias) => {
              try {
                for (const [cat, vals] of Object.entries(categorias)) {
                  const { error } = await supabase
                    .from("metas_individuais")
                    .update({
                      valor_meta: vals.meta,
                      valor_realizado: vals.realizado,
                      valor_projecao: vals.projecao,
                      atualizado_em: new Date().toISOString(),
                    })
                    .eq("usuario_id", selected.usuario_id)
                    .eq("periodo", "mensal")
                    .eq("categoria", cat)
                    .eq("data_inicio", "2026-07-01");
                  if (error) throw new Error(error.message);
                }
                toast.success("Metas atualizadas!");
                await carregar();
                setEditando(false);
                setSelected(null);
              } catch (e: any) {
                toast.error("Erro ao salvar: " + e.message);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// =============== SUB-COMPONENTES ===============

function TotaisCard({ titulo, meta, realizado, projecao }: { titulo: string; meta: number; realizado: number; projecao?: number }) {
  const pct = meta > 0 ? (realizado / meta) * 100 : 0;
  const projPct = projecao && meta > 0 ? (projecao / meta) * 100 : 0;
  return (
    <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{titulo}</p>
      <p className="mt-1 font-mono text-lg font-bold">
        R$ {realizado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
        <span className="text-xs font-normal text-white/60"> / R$ {meta.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-400" : pct >= 70 ? "bg-blue-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px]">
        <span>{pct.toFixed(1)}%</span>
        {projecao !== undefined && projecao > 0 && (
          <span className="text-white/60">Projeção: {projPct.toFixed(1)}% (R$ {projecao.toLocaleString("pt-BR", { minimumFractionDigits: 0 })})</span>
        )}
      </div>
    </div>
  );
}

function MiniStat({ titulo, cat, Icon }: { titulo: string; cat: { meta: number; realizado: number; projecao: number }; Icon: any }) {
  const pct = cat.meta > 0 ? (cat.realizado / cat.meta) * 100 : 0;
  return (
    <div className="rounded-lg border border-slate-200 p-2 dark:border-white/10">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
        <Icon className="h-3 w-3" /> {titulo}
      </div>
      <p className="mt-1 font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
        R$ {cat.realizado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
        <span className="text-[10px] font-normal text-slate-400"> / R$ {cat.meta.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] text-slate-500">{pct.toFixed(1)}%</p>
    </div>
  );
}

function DetalhesVendedorModal({
  vendedor, editando, onToggleEdit, onClose, onSalvar,
}: {
  vendedor: MetaVendedor;
  editando: boolean;
  onToggleEdit: () => void;
  onClose: () => void;
  onSalvar: (categorias: MetaVendedor["categorias"]) => Promise<void>;
}) {
  const [form, setForm] = useState(vendedor.categorias);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        {/* HEADER do modal */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white">
              {vendedor.iniciais}
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">{vendedor.nome}</h2>
              <p className="text-xs text-slate-500">{vendedor.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editando ? (
              <button onClick={onToggleEdit} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
                <Edit3 className="h-3.5 w-3.5" /> Editar
              </button>
            ) : (
              <button onClick={() => onSalvar(form)} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> Salvar
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="p-5 space-y-4">
          {!editando && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              💡 Clique em <strong>Editar</strong> para ajustar metas, realizado ou projeção deste vendedor.
            </div>
          )}

          {Object.entries(form).map(([cat, vals]) => {
            const pct = vals.meta > 0 ? (vals.realizado / vals.meta) * 100 : 0;
            const projPct = vals.meta > 0 ? (vals.projecao / vals.meta) * 100 : 0;
            const labels: Record<string, string> = {
              faturamento: "Faturamento Geral",
              marcas_exclusivas: "Marcas Exclusivas",
              genericos: "Genéricos + Similares",
              super_desconto: "Super Desconto",
            };
            return (
              <div key={cat} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <h3 className="mb-3 text-sm font-bold uppercase text-slate-700 dark:text-slate-200">{labels[cat] || cat}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FieldEdit
                    label="Meta (R$)"
                    value={vals.meta}
                    disabled={!editando}
                    onChange={(v) => setForm({ ...form, [cat]: { ...vals, meta: v } })}
                  />
                  <FieldEdit
                    label="Realizado (R$)"
                    value={vals.realizado}
                    disabled={!editando}
                    onChange={(v) => setForm({ ...form, [cat]: { ...vals, realizado: v } })}
                  />
                  <FieldEdit
                    label="Projeção (R$)"
                    value={vals.projecao}
                    disabled={!editando}
                    onChange={(v) => setForm({ ...form, [cat]: { ...vals, projecao: v } })}
                  />
                </div>
                {!editando && (
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">% realizado:</span>
                      <span className={`font-bold ${pct >= 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {pct.toFixed(2)}% {pct >= 100 ? <ArrowUpRight className="inline h-3 w-3" /> : <ArrowDownRight className="inline h-3 w-3" />}
                      </span>
                    </div>
                    {vals.projecao > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">% projeção:</span>
                        <span className={`font-bold ${projPct >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                          {projPct.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function FieldEdit({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-500">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={`w-full rounded-lg border px-3 py-2 text-sm font-mono ${
          disabled
            ? "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
            : "border-blue-300 bg-white text-slate-900 dark:border-blue-700 dark:bg-slate-800 dark:text-slate-100"
        }`}
      />
    </div>
  );
}
