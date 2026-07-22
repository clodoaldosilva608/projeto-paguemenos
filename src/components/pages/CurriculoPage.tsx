import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Award, BookOpen, Loader2, ExternalLink, Calendar, Clock } from "lucide-react";
import { brlMoeda } from "../../utils/format";

interface CursoConcluido {
  id: string;
  treinamento_id: string;
  titulo: string;
  descricao: string | null;
  link: string | null;
  duracao: string | null;
  concluido_em: string;
}

export function CurriculoPage() {
  const { usuario } = useAuth();
  const [cursos, setCursos] = useState<CursoConcluido[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("treinamentos_concluidos")
          .select(`
            id,
            treinamento_id,
            concluido_em,
            treinamentos:treenamento_id (
              titulo,
              descricao,
              link,
              duracao
            )
          `)
          .eq("usuario_id", usuario.id)
          .order("concluido_em", { ascending: false });

        if (error) {
          // Fallback: query simples
          const { data: simpleData } = await (supabase as any)
            .from("treinamentos_concluidos")
            .select("*")
            .eq("usuario_id", usuario.id)
            .order("concluido_em", { ascending: false });
          
          // Buscar detalhes dos treinamentos
          const ids = (simpleData || []).map((c: any) => c.treinamento_id);
          if (ids.length > 0) {
            const { data: treinos } = await (supabase as any)
              .from("treinamentos")
              .select("*")
              .in("id", ids);
            const treinoMap = new Map((treinos || []).map((t: any) => [t.id, t]));
            setCursos((simpleData || []).map((c: any) => {
              const t: any = treinoMap.get(c.treinamento_id) || {};
              return { id: c.id, treinamento_id: c.treinamento_id, titulo: t.titulo || "Curso", descricao: t.descricao, link: t.link, duracao: t.duracao, concluido_em: c.concluido_em };
            }));
          } else {
            setCursos([]);
          }
        } else {
          setCursos((data || []).map((c: any) => ({
            id: c.id,
            treinamento_id: c.treinamento_id,
            titulo: c.treinamentos?.titulo || "Curso",
            descricao: c.treinamentos?.descricao,
            link: c.treinamentos?.link,
            duracao: c.treinamentos?.duracao,
            concluido_em: c.concluido_em,
          })));
        }
      } catch {
        setCursos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [usuario]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Meu Currículo</h1>
            <p className="text-sm text-white/80">{usuario?.nome} · Histórico de cursos concluídos</p>
          </div>
        </div>
        <div className="mt-4 flex gap-6">
          <div><p className="text-xs uppercase text-white/60">Cursos concluídos</p><p className="text-2xl font-bold">{cursos.length}</p></div>
        </div>
      </div>

      {/* Lista de cursos */}
      {cursos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-700">Nenhum curso concluído ainda</p>
          <p className="mt-1 text-sm text-slate-500">Quando você concluir um treinamento, ele aparecerá aqui automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cursos.map((curso, i) => (
            <motion.div
              key={curso.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <Award className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{curso.titulo}</h3>
                    {curso.descricao && <p className="mt-0.5 text-sm text-slate-500">{curso.descricao}</p>}
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Concluído em {new Date(curso.concluido_em).toLocaleDateString("pt-BR")}</span>
                      {curso.duracao && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {curso.duracao}</span>}
                    </div>
                  </div>
                </div>
                {curso.link && (
                  <a href={curso.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50">
                    <ExternalLink className="h-3 w-3" /> Ver novamente
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        <p>💡 Seu currículo é atualizado automaticamente quando você conclui um treinamento. Certificados serão disponibilizados em breve.</p>
      </div>
    </motion.div>
  );
}
