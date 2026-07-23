import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users2, Edit3, X, Save, Crown, AlertCircle, CheckCircle2,
  TrendingUp, Calendar, User, Package, Tag, Percent,
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
    faturamento?: { meta: number; realizado: number; projecao: number; meta_diaria?: number };
    marcas_exclusivas?: { meta: number; realizado: number; projecao: number; meta_diaria?: number };
    genericos?: { meta: number; realizado: number; projecao: number; meta_diaria?: number };
    super_desconto?: { meta: number; realizado: number; projecao: number; meta_diaria?: number };
  };
}

const FILIAL_ID = "7537";
const PERIODO_INICIO = "2026-07-01";

// Meta geral da filial (da screenshot)
const META_FILIAL = {
  mensal: 766254.66,
  diaria: 24717.89,
  clientes_mes: 8664,
  tkm: 88.44,
  uvc: 3.02,
  genericos_mensal: 157268.17,
  genericos_diaria: 5073.16,
  me_mensal: 57253.67,
  me_diaria: 1846.89,
  sd_mensal: 4000.00,
  sd_diaria: 100.00,
};

export default function DashboardAdminPage({ onImpersonate }: { onImpersonate?: (userId: string, nome: string) => void }) {
  const { usuario } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<MetaVendedor[]>([]);
  const [selected, setSelected] = useState<MetaVendedor | null>(null);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const { data: profiles, error: errP } = await supabase
        .from("profiles")
        .select("id, nome, email, iniciais, ativo, filial_id, cargo")
        .order("nome");
      if (errP) throw new Error(errP.message);

      const { data: roles, error: errR } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (errR) throw new Error(errR.message);

      // Buscar todas as metas (mensal + diaria) de julho
      const { data: metas, error: errM } = await supabase
        .from("metas_individuais")
        .select("usuario_id, categoria, periodo, valor_meta, valor_realizado, valor_projecao")
        .eq("data_inicio", PERIODO_INICIO);
      if (errM) throw new Error(errM.message);

      const rolesMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      const metasPorUser = new Map<string, MetaVendedor["categorias"]>();
      for (const m of metas ?? []) {
        if (!metasPorUser.has(m.usuario_id)) metasPorUser.set(m.usuario_id, {});
        const cat = metasPorUser.get(m.usuario_id)!;
        const catKey = m.categoria as keyof typeof cat;
        if (!cat[catKey]) cat[catKey] = { meta: 0, realizado: 0, projecao: 0 };
        if (m.periodo === "mensal") {
          cat[catKey]!.meta = Number(m.valor_meta ?? 0);
          cat[catKey]!.realizado = Number(m.valor_realizado ?? 0);
          cat[catKey]!.projecao = Number(m.valor_projecao ?? 0);
        } else if (m.periodo === "diaria") {
          cat[catKey]!.meta_diaria = Number(m.valor_meta ?? 0);
        }
      }

      const lista: MetaVendedor[] = (profiles ?? [])
        .filter((p) => rolesMap.get(p.id) === "vendedor")
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
        .filter((v) => Object.keys(v.categorias).length > 0);

      setVendedores(lista);
    } catch (e: any) {
      toast.error("Erro ao carregar vendedores: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const totalMetaMensal = vendedores.reduce((s, v) => s + (v.categorias.faturamento?.meta || 0), 0);
  const totalRealizado = vendedores.reduce((s, v) => s + (v.categorias.faturamento?.realizado || 0), 0);
  const totalProjecao = vendedores.reduce((s, v) => s + (v.categorias.faturamento?.projecao || 0), 0);
  const totalME = vendedores.reduce((s, v) => s + (v.categorias.marcas_exclusivas?.realizado || 0), 0);
  const totalGen = vendedores.reduce((s, v) => s + (v.categorias.genericos?.realizado || 0), 0);
  const pctGeral = totalMetaMensal > 0 ? (totalRealizado / totalMetaMensal) * 100 : 0;
  const pctProj = totalMetaMensal > 0 ? (totalProjecao / totalMetaMensal) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <div className="animate-pulse">Carregando dados dos vendedores...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* ====== HEADER ====== */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-md dark:bg-slate-900">
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] px-5 py-3 text-white">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-300" />
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide">Metas Mensais e Individuais</h1>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-300">
                Filial {FILIAL_ID} • Julho/2026
              </p>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              <span className="h-3 w-3 rounded-full bg-white" style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} />
              PAGUE MENOS
            </div>
          </div>
        </div>

        {/* ====== META GERAL DA FILIAL — 5 KPIs ====== */}
        <div className="border-l-4 border-[#1e40af] px-4 py-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1e3a8a]">📊 Meta Geral da Filial</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Meta Mensal" value={`R$ ${META_FILIAL.mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <KpiCard label="Meta Diária" value={`R$ ${META_FILIAL.diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <KpiCard label="Clientes / Mês" value={META_FILIAL.clientes_mes.toLocaleString("pt-BR")} />
            <KpiCard label="TKM" value={`R$ ${META_FILIAL.tkm.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <KpiCard label="UVC" value={META_FILIAL.uvc.toFixed(2)} />
          </div>
        </div>

        {/* ====== RESUMO REALIZADO + PROJEÇÃO ====== */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-white/10 sm:grid-cols-4">
          <ResumoCard label="Realizado" valor={totalRealizado} pct={pctGeral} cor="emerald" />
          <ResumoCard label="Projeção" valor={totalProjecao} pct={pctProj} cor="blue" />
          <ResumoCard label="Marcas Exclusivas" valor={totalME} cor="red" />
          <ResumoCard label="Genéricos" valor={totalGen} cor="blue" />
        </div>
      </div>

      {/* ====== BARRAS DE CATEGORIAS ====== */}
      <div className="grid gap-2 sm:grid-cols-3">
        <CategoryBar
          titulo="GENÉRICOS + SIMILARES"
          mensal={META_FILIAL.genericos_mensal}
          diaria={META_FILIAL.genericos_diaria}
          cor="#1e40af"
        />
        <CategoryBar
          titulo="MARCAS EXCLUSIVAS"
          mensal={META_FILIAL.me_mensal}
          diaria={META_FILIAL.me_diaria}
          cor="#dc2626"
        />
        <CategoryBar
          titulo="SUPER DESCONTO"
          mensal={META_FILIAL.sd_mensal}
          diaria={META_FILIAL.sd_diaria}
          cor="#1e40af"
        />
      </div>

      {/* ====== TABELA METAS POR COLABORADOR ====== */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-md dark:bg-slate-900">
        <div className="flex items-center justify-between bg-[#7c3aed] px-5 py-2.5 text-white">
          <h2 className="text-sm font-bold uppercase tracking-wider">👥 Metas por Colaborador</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
            {vendedores.length} vendedores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-[#1e3a8a] text-white">
              <tr>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wider">Colaborador</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">Meta Mensal</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">Meta Diária</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">Genéricos Mensal</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">Genéricos Diária</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">SD Mensal</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">SD Diária</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">Marcas Exclusivas</th>
                <th className="px-2 py-2.5 text-right font-bold uppercase tracking-wider">ME Diária</th>
                <th className="px-2 py-2.5 text-center font-bold uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v, idx) => {
                const fat = v.categorias.faturamento;
                const me = v.categorias.marcas_exclusivas;
                const gen = v.categorias.genericos;
                const sd = v.categorias.super_desconto;
                const isFerias = !fat;
                const pctFat = fat && fat.meta > 0 ? (fat.realizado / fat.meta) * 100 : 0;
                const dentro = pctFat >= 50;

                return (
                  <tr
                    key={v.usuario_id}
                    className={`border-t border-slate-100 transition hover:bg-blue-50/50 dark:border-white/5 dark:hover:bg-white/5 ${
                      idx % 2 === 1 ? "bg-slate-50/50 dark:bg-white/[0.02]" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white">
                          {v.iniciais}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{v.nome.split(" ")[0].toUpperCase()}</p>
                          <p className="text-[10px] text-slate-500">{v.email}</p>
                        </div>
                        {dentro && !isFerias && (
                          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="h-2.5 w-2.5" /> DENTRO
                          </span>
                        )}
                      </div>
                    </td>
                    {isFerias ? (
                      <td colSpan={8} className="px-3 py-2.5 text-center font-bold uppercase tracking-wider text-slate-400">
                        🏖️ FÉRIAS
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          R$ {fat?.meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          {fat?.realizado !== undefined && fat.realizado > 0 && (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                              ↳ R$ {fat.realizado.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          R$ {(fat?.meta_diaria || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          {gen ? `R$ ${gen.meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          {gen?.meta_diaria ? `R$ ${gen.meta_diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          {sd ? `R$ ${sd.meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          {sd?.meta_diaria ? `R$ ${sd.meta_diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          {me ? `R$ ${me.meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-slate-700 dark:text-slate-200">
                          {me?.meta_diaria ? `R$ ${me.meta_diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                      </>
                    )}
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        {!isFerias && (
                          <button
                            onClick={() => { setSelected(v); setEditando(false); }}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-700 dark:bg-white/5 dark:text-slate-300"
                            title="Ver detalhes / Editar"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {onImpersonate && !isFerias && (
                          <button
                            onClick={() => onImpersonate(v.usuario_id, v.nome)}
                            className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-500"
                            title={`Acessar como ${v.nome}`}
                          >
                            <Users2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* LINHA MÉDIA DIÁRIA */}
              <tr className="border-t-2 border-[#1e3a8a] bg-slate-100 font-bold dark:bg-white/5">
                <td className="px-3 py-2.5 uppercase tracking-wider text-[#1e3a8a] dark:text-blue-300">📊 Média Diária</td>
                <td className="px-2 py-2.5 text-right font-mono text-slate-500">—</td>
                <td className="px-2 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  R$ {META_FILIAL.diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-slate-500">—</td>
                <td className="px-2 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  R$ {META_FILIAL.genericos_diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-slate-500">—</td>
                <td className="px-2 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  R$ {META_FILIAL.sd_diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-2.5 text-right font-mono text-slate-500">—</td>
                <td className="px-2 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                  R$ {META_FILIAL.me_diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-2.5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== RODAPÉ ====== */}
      <p className="text-center text-xs italic text-slate-500 dark:text-slate-400">
        Disciplina na rotina gera resultado. • Acompanhamento diário • Feedback semanal • Execução com foco
      </p>

      {/* ====== MODAL DE DETALHES/EDIÇÃO ====== */}
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
                  // Atualizar mensal
                  const { error: e1 } = await supabase
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
                    .eq("data_inicio", PERIODO_INICIO);
                  if (e1) throw new Error(e1.message);

                  // Atualizar diária
                  if (vals.meta_diaria !== undefined) {
                    await supabase
                      .from("metas_individuais")
                      .update({
                        valor_meta: vals.meta_diaria,
                        atualizado_em: new Date().toISOString(),
                      })
                      .eq("usuario_id", selected.usuario_id)
                      .eq("periodo", "diaria")
                      .eq("categoria", cat)
                      .eq("data_inicio", PERIODO_INICIO);
                  }
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

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-slate-800/50">
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#1e3a8a] dark:text-blue-300">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{value}</p>
    </div>
  );
}

function ResumoCard({ label, valor, pct, cor }: { label: string; valor: number; pct?: number; cor: "emerald" | "blue" | "red" }) {
  const corClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
  }[cor];

  return (
    <div className="rounded-lg border border-slate-200 p-2.5 dark:border-white/10">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-mono text-sm font-bold ${corClass}`}>
        R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
      </p>
      {pct !== undefined && (
        <p className={`text-[10px] font-semibold ${pct >= 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {pct.toFixed(1)}% da meta
        </p>
      )}
    </div>
  );
}

function CategoryBar({ titulo, mensal, diaria, cor }: { titulo: string; mensal: number; diaria: number; cor: string }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-1 rounded-lg px-3 py-2 text-white shadow-sm"
      style={{ backgroundColor: cor }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider sm:text-xs">{titulo}</span>
      <div className="flex items-center gap-2 font-mono text-xs sm:text-sm">
        <span className="font-bold">R$ {mensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        <span className="text-white/70">| Dia:</span>
        <span className="font-bold">R$ {diaria.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
      </div>
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
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-[#1e3a8a] px-5 py-3 text-white dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-bold">
              {vendedor.iniciais}
            </div>
            <div>
              <h2 className="font-bold">{vendedor.nome}</h2>
              <p className="text-xs text-blue-200">{vendedor.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editando ? (
              <button onClick={onToggleEdit} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#1e3a8a] hover:bg-blue-50">
                <Edit3 className="h-3.5 w-3.5" /> Editar
              </button>
            ) : (
              <button onClick={() => onSalvar(form)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-400">
                <Save className="h-3.5 w-3.5" /> Salvar
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-white hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="p-5 space-y-4">
          {!editando && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
              💡 Clique em <strong>Editar</strong> para ajustar metas mensais, diárias, realizado e projeção deste vendedor.
            </div>
          )}

          {Object.entries(form).map(([cat, vals]) => {
            const pct = vals.meta > 0 ? (vals.realizado / vals.meta) * 100 : 0;
            const projPct = vals.meta > 0 && vals.projecao > 0 ? (vals.projecao / vals.meta) * 100 : 0;
            const labels: Record<string, string> = {
              faturamento: "💰 Faturamento Geral",
              marcas_exclusivas: "🏷️ Marcas Exclusivas",
              genericos: "💊 Genéricos + Similares",
              super_desconto: "🎯 Super Desconto",
            };
            return (
              <div key={cat} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <h3 className="mb-3 text-sm font-bold uppercase text-slate-700 dark:text-slate-200">{labels[cat] || cat}</h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  <FieldEdit label="Meta Mensal (R$)" value={vals.meta} disabled={!editando} onChange={(v) => setForm({ ...form, [cat]: { ...vals, meta: v } })} />
                  <FieldEdit label="Meta Diária (R$)" value={vals.meta_diaria || 0} disabled={!editando} onChange={(v) => setForm({ ...form, [cat]: { ...vals, meta_diaria: v } })} />
                  <FieldEdit label="Realizado (R$)" value={vals.realizado} disabled={!editando} onChange={(v) => setForm({ ...form, [cat]: { ...vals, realizado: v } })} />
                  <FieldEdit label="Projeção (R$)" value={vals.projecao} disabled={!editando} onChange={(v) => setForm({ ...form, [cat]: { ...vals, projecao: v } })} />
                </div>
                {!editando && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
                      <span className="text-slate-500">% realizado:</span>
                      <span className={`font-bold ${pct >= 100 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {pct.toFixed(2)}%
                      </span>
                    </div>
                    {vals.projecao > 0 && (
                      <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-800">
                        <span className="text-slate-500">% projeção:</span>
                        <span className={`font-bold ${projPct >= 100 ? "text-emerald-600" : "text-blue-600"}`}>
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
