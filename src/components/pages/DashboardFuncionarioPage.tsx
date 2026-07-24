import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle2, Star, BookOpen, Users, Target, RefreshCw, ClipboardList, Bell, CheckSquare, Clock, Trophy, Package, Handshake, BarChart3, TrendingUp, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Módulo 1: Atendimento de Coração
const CARDS_CORACAO = [
  { id: "receber", titulo: "RECEBER", descricao: "Aproxime-se, receba o cliente com atenção e um sorriso.", dicas: ["Vá até o cliente.", "Seja empático.", "Atenda de coração.", "Olhe nos olhos."], mensagem: "Fale para o cliente seu nome.", rodape: "ATENCIOSO & DE CORAÇÃO", checklist: ["Cumprimentei", "Sorri", "Me apresentei"] },
  { id: "atender", titulo: "ATENDER", descricao: "Solicite o cadastro. Explique benefícios. Ofereça soluções.", dicas: ["Chame pelo nome.", "Atenda com sorriso.", "Explique produtos."], mensagem: "Solucione o problema do cliente.", rodape: "EMPÁTICO & RESOLUTIVO", checklist: ["Solicitei cadastro", "Expliquei benefícios", "Apresentei ofertas"] },
  { id: "fidelizar", titulo: "FIDELIZAR", descricao: "No caixa, pergunte sobre o atendimento. Informe descontos.", dicas: ["Pergunte: 'Foi tudo bem?'", "Informe descontos.", "Acompanhe até a saída."], mensagem: "Conte sempre com a Pague Menos.", rodape: "NOSSO JEITO", checklist: ["Perguntei sobre atendimento", "Destaquei economia", "Agradeci"] },
];

const COMPROMISSOS = [
  { icon: Users, cor: "#2E5C9A", titulo: "Excelência na experiência", percentual: 87 },
  { icon: Target, cor: "#D64541", titulo: "Plano de ação 100%", percentual: 92 },
  { icon: Users, cor: "#2E5C9A", titulo: "Desenvolver equipe", percentual: 75 },
  { icon: TrendingUp, cor: "#D64541", titulo: "Resultados sustentáveis", percentual: 68 },
  { icon: RefreshCw, cor: "#2E5C9A", titulo: "Melhoria contínua", percentual: 81 },
];

const ROTINAS_INIT = [
  { id: "r1", acao: "PIT STOP 15", freq: "Diário", horario: "Antes da abertura", resp: "Gerente", concluida: false },
  { id: "r2", acao: "Revisão de Indicadores", freq: "Diário", horario: "15:00", resp: "Gerente", concluida: false },
  { id: "r3", acao: "Feedback Individual", freq: "Semanal", horario: "Sexta-feira", resp: "Gerente", concluida: false },
  { id: "r4", acao: "Contagem Cíclica", freq: "3x/semana", horario: "Seg, Qua, Sex", resp: "Farmacêutico", concluida: false },
];

export function DashboardFuncionarioPage() {
  const { usuario } = useAuth();
  const [treinamentos, setTreinamentos] = useState<any[]>([]);
  const [confirmados, setConfirmados] = useState<Record<string, boolean>>({});
  const [rotinas, setRotinas] = useState(ROTINAS_INIT);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  // Carregar treinamentos do Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any).from("treinamentos").select("*").eq("ativo", true).order("criado_em", { ascending: false });
        setTreinamentos(data || []);
      } catch { setTreinamentos([]); }
    })();
  }, []);

  const toggleRotina = (id: string) => {
    const novas = rotinas.map(r => r.id === id ? { ...r, concluida: !r.concluida } : r);
    setRotinas(novas);
  };
  const toggleCheck = (id: string) => setChecks({ ...checks, [id]: !checks[id] });
  const toggleConfirm = (id: string) => setConfirmados({ ...confirmados, [id]: !confirmados[id] });

  const CHECKLIST_INICIO = ["Uniforme completo", "Crachá", "Organização do posto", "Equipamentos", "Caixa conferido", "Estoque revisado", "Limpeza do balcão"];
  const CHECKLIST_FIM = ["Fechamento de caixa", "Pendências registradas", "Observações anotadas"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1B4F8C] via-[#2E5C9A] to-[#D64541] p-6 text-white shadow-xl">
        <p className="text-sm uppercase tracking-wide text-white/70">Dashboard do Funcionário</p>
        <h1 className="mt-1 text-2xl font-bold">Bem-vindo(a), {usuario?.nome} 👋</h1>
        <p className="mt-1 text-sm text-white/80">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      {/* Módulo 1: Atendimento de Coração */}
      <section className="rounded-2xl bg-gradient-to-br from-[#1B4F8C] to-[#0F2D5C] p-6 shadow-xl">
        <div className="mb-6 text-center"><h2 className="text-2xl font-extrabold uppercase tracking-wide text-white">Atendimento de Coração</h2><p className="mt-1 text-sm italic text-white/80">Todos os dias, em todas as lojas, para todos os clientes.</p></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {CARDS_CORACAO.map((card, idx) => (
            <motion.div key={card.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="flex flex-col overflow-hidden rounded-xl bg-[#F5F5F5] shadow-lg">
              <div className="px-4 py-3 text-center" style={{ backgroundColor: "#D64541" }}><h3 className="text-lg font-bold uppercase text-white">{card.titulo}</h3></div>
              <div className="flex flex-1 flex-col p-4 text-sm">
                <p className="font-semibold text-slate-800">{card.descricao}</p>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-600">{card.dicas.map((d, i) => <li key={i}>• {d}</li>)}</ul>
                <div className="mt-3 border-l-4 border-slate-800 pl-3"><p className="text-xs font-semibold">{card.mensagem}</p></div>
                <ul className="mt-2 space-y-0.5 text-xs">{card.checklist.map((item, i) => <li key={i} className="flex items-center gap-1.5 text-slate-700"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{item}</li>)}</ul>
                <button onClick={() => toggleConfirm(card.id)} className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-bold uppercase ${confirmados[card.id] ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"}`}>{confirmados[card.id] ? "✓ Li e Entendi" : "Li e Entendi"}</button>
                <div className="mt-2 flex items-center justify-center gap-2 rounded-md px-3 py-1.5" style={{ backgroundColor: "#1B4F8C" }}><span className="text-[10px] font-bold uppercase text-white">{card.rodape}</span></div>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Dica de Ouro */}
        <div className="mt-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-100 p-4 shadow-lg">
          <div className="flex items-center gap-2"><Star className="h-5 w-5 fill-amber-400 text-amber-400" /><h4 className="text-lg font-bold uppercase text-amber-700">Dica de Ouro</h4></div>
          <p className="mt-2 text-sm font-medium text-slate-700">Atenda cada cliente com coração e empatia. Olhe nos olhos. Sorria. Entenda a real necessidade.</p>
        </div>
      </section>

      {/* Módulo 2: Compromissos */}
      <section className="rounded-2xl bg-[#F8F6F2] p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-[#2E5C9A]">Compromissos da Filial</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {COMPROMISSOS.map((c, i) => { const Icon = c.icon; return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: c.cor }}><Icon className="h-5 w-5 text-white" /></div>
              <p className="text-sm font-semibold text-slate-800">{c.titulo}</p>
              <div className="mt-2"><div className="flex justify-between text-[10px] text-slate-500"><span>Progresso</span><span>{c.percentual}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${c.percentual}%`, backgroundColor: c.percentual >= 80 ? "#27AE60" : "#F39C12" }} /></div></div>
            </motion.div>
          ); })}
        </div>
      </section>

      {/* Módulo 3: Rotina de Execução */}
      <section className="rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2"><ClipboardList className="h-6 w-6 text-[#2E5C9A]" /><div><h2 className="text-xl font-bold text-[#2E5C9A]">ROTINA DE EXECUÇÃO</h2><p className="text-[10px] font-semibold uppercase text-[#D64541]">Disciplina diária. Resultados extraordinários.</p></div></div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm"><thead className="bg-[#3B5998] text-white"><tr><th className="px-3 py-2 text-left">Ação</th><th className="px-3 py-2 text-center">Frequência</th><th className="px-3 py-2 text-center">Horário</th><th className="px-3 py-2 text-left">Responsável</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">Concluir</th></tr></thead>
            <tbody>{rotinas.map((r, i) => (
              <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-[#EBF2FA]"} ${r.concluida ? "opacity-60" : ""}`}>
                <td className="px-3 py-2 font-bold text-slate-800">{r.acao}</td><td className="px-3 py-2 text-center text-xs font-semibold uppercase text-[#D64541]">{r.freq}</td><td className="px-3 py-2 text-center text-xs text-slate-600">{r.horario}</td><td className="px-3 py-2 text-xs text-slate-600">{r.resp}</td>
                <td className="px-3 py-2 text-center"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.concluida ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.concluida ? "✓ Concluída" : "Pendente"}</span></td>
                <td className="px-3 py-2 text-center"><button onClick={() => toggleRotina(r.id)} aria-label={r.concluida ? `Desmarcar ${r.acao} como concluída` : `Marcar ${r.acao} como concluída`} title={r.concluida ? "Desmarcar" : "Marcar como concluída"} className={`rounded p-1.5 transition ${r.concluida ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"}`}><CheckCircle2 className="h-3.5 w-3.5" /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      {/* Módulo 4: Metas + Módulo 5: Treinamentos + Módulo 6: Notificações */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Treinamentos */}
        <section className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2"><BookOpen className="h-6 w-6 text-[#2E5C9A]" /><h2 className="text-xl font-bold text-[#2E5C9A]">TREINAMENTOS</h2></div>
          {treinamentos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center"><BookOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" /><p className="text-sm text-slate-500">Nenhum treinamento disponível no momento.</p></div>
          ) : (
            <div className="space-y-3">{treinamentos.map((t: any) => (
              <div key={t.id} className="rounded-xl border p-4" style={{ borderColor: t.obrigatorio ? "#D64541" : "#E2E8F0" }}>
                <div className="flex items-start justify-between">
                  <div><p className="font-semibold text-slate-800">{t.titulo}</p><p className="text-xs text-slate-500">{t.duracao || ""}</p></div>
                  {t.obrigatorio && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">OBRIGATÓRIO</span>}
                </div>
                {t.link && <a href={t.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"><BookOpen className="h-3 w-3" /> Acessar curso</a>}
              </div>
            ))}</div>
          )}
        </section>

        {/* Checklist Diário */}
        <section className="rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2"><CheckSquare className="h-6 w-6 text-[#2E5C9A]" /><h2 className="text-xl font-bold text-[#2E5C9A]">CHECKLIST DIÁRIO</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700"><Clock className="h-4 w-4 text-emerald-500" /> Início do Turno</h4>
              <div className="space-y-1.5">{CHECKLIST_INICIO.map((item, i) => { const id = `i-${i}`; const checked = !!checks[id]; return (<button key={id} onClick={() => toggleCheck(id)} className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm ${checked ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}><CheckCircle2 className={`h-4 w-4 ${checked ? "text-emerald-500" : "text-slate-300"}`} /><span className={checked ? "text-slate-500 line-through" : ""}>{item}</span></button>); })}</div>
            </div>
            <div><h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-700"><Clock className="h-4 w-4 text-amber-500" /> Fechamento</h4>
              <div className="space-y-1.5">{CHECKLIST_FIM.map((item, i) => { const id = `f-${i}`; const checked = !!checks[id]; return (<button key={id} onClick={() => toggleCheck(id)} className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm ${checked ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}><CheckCircle2 className={`h-4 w-4 ${checked ? "text-amber-500" : "text-slate-300"}`} /><span className={checked ? "text-slate-500 line-through" : ""}>{item}</span></button>); })}</div>
            </div>
          </div>
        </section>
      </div>

      <div className="rounded-2xl bg-[#1B4F8C] p-4 text-center text-white"><p className="text-sm font-semibold">Pague Menos · Levando saúde com amor para todos os brasileiros</p></div>
    </motion.div>
  );
}
