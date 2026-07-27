import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, AlertTriangle, Megaphone, CheckSquare, X, ChevronDown, ChevronUp } from "lucide-react";

interface Notificacao {
  tipo: "alerta" | "info" | "sucesso";
  icone: any;
  titulo: string;
  detalhe: string;
  cor: string;
}

export default function NotificacoesGerente() {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [expandido, setExpandido] = useState(true);
  const [dispensado, setDispensado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    if (usuario.perfil !== "admin" && usuario.perfil !== "gerente") return;
    void carregar();
  }, [usuario]);

  async function carregar() {
    setLoading(true);
    const notifs: Notificacao[] = [];

    try {
      // 1. Buscar vendedores com metas abaixo de 50%
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("ativo", true);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "vendedor");

      const vendedorIds = (roles || []).map((r) => r.user_id);

      const { data: metas } = await supabase
        .from("metas_individuais")
        .select("usuario_id, valor_meta, valor_realizado, categoria")
        .eq("periodo", "mensal")
        .eq("categoria", "faturamento");

      const profileMap = new Map((profiles || []).map((p) => [p.id, p.nome]));
      const vendedoresBaixo = (metas || [])
        .filter((m) => vendedorIds.includes(m.usuario_id) && m.valor_meta > 0)
        .map((m) => ({
          nome: profileMap.get(m.usuario_id) || "Vendedor",
          pct: (Number(m.valor_realizado) / Number(m.valor_meta)) * 100,
        }))
        .filter((v) => v.pct < 50);

      if (vendedoresBaixo.length > 0) {
        notifs.push({
          tipo: "alerta",
          icone: AlertTriangle,
          titulo: `${vendedoresBaixo.length} vendedor(es) abaixo de 50% da meta`,
          detalhe: vendedoresBaixo.map((v) => `${v.nome} (${v.pct.toFixed(0)}%)`).join(", "),
          cor: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
        });
      }

      // 2. Buscar campanhas ativas
      const { data: campanhas } = await supabase
        .from("campanhas")
        .select("nome")
        .eq("status", "ativa");

      if (campanhas && campanhas.length > 0) {
        notifs.push({
          tipo: "info",
          icone: Megaphone,
          titulo: `${campanhas.length} campanha(s) ativa(s)`,
          detalhe: campanhas.map((c) => c.nome).join(", "),
          cor: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
        });
      }

      // 3. Buscar vendas diárias lançadas hoje (check-in)
      const hoje = new Date().toISOString().slice(0, 10);
      const { data: vendasHoje } = await supabase
        .from("vendas_diarias")
        .select("usuario_id")
        .eq("data", hoje);

      const vendedoresComVendaHoje = new Set((vendasHoje || []).map((v) => v.usuario_id));
      const vendedoresSemVenda = vendedorIds.filter((id) => !vendedoresComVendaHoje.has(id));
      const nomesSemVenda = vendedoresSemVenda.map((id) => profileMap.get(id)).filter(Boolean);

      if (nomesSemVenda.length > 0) {
        notifs.push({
          tipo: "alerta",
          icone: CheckSquare,
          titulo: `${nomesSemVenda.length} vendedor(es) sem lançamento de vendas hoje`,
          detalhe: nomesSemVenda.join(", "),
          cor: "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300",
        });
      }
    } catch {
      // Silencioso — notificações são opcionais
    } finally {
      setLoading(false);
    }

    setNotificacoes(notifs);
  }

  // Não mostrar para vendedor/supervisor ou se não há notificações
  if (loading || dispensado || notificacoes.length === 0) return null;
  if (usuario?.perfil !== "admin" && usuario?.perfil !== "gerente") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4 w-4 text-blue-600" />
            {notificacoes.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                {notificacoes.length}
              </span>
            )}
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Notificações ({notificacoes.length})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpandido(!expandido)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label={expandido ? "Recolher" : "Expandir"}
          >
            {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setDispensado(true)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Dispensar notificações"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Lista de notificações */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 p-3">
              {notificacoes.map((n, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${n.cor}`}>
                  <n.icone className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">{n.titulo}</p>
                    <p className="mt-0.5 opacity-80">{n.detalhe}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
