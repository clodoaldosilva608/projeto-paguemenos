import { Pagina } from "./Sidebar";
import { useAuth } from "../contexts/AuthContext";

const titulos: Record<Pagina, { titulo: string; subtitulo: string }> = {
  dashboard: { titulo: "Dashboard", subtitulo: "Visão consolidada de metas, indicadores e resultados." },
  metas: { titulo: "Metas", subtitulo: "Acompanhe metas mensais, diárias e individuais." },
  "minhas-metas": { titulo: "Minhas Metas", subtitulo: "Gerencie e atualize suas metas pessoais." },
  ranking: { titulo: "Resultados", subtitulo: "Faturamento, Marcas Exclusivas e Genéricos no período." },
  relatorios: { titulo: "Relatórios", subtitulo: "Análise gráfica de performance e mix de categorias." },
  "relatorio-vendas": { titulo: "Vendas por Vendedor", subtitulo: "Relatório detalhado de vendas diárias por colaborador." },
  colaboradores: { titulo: "Colaboradores", subtitulo: "Desempenho individual de cada membro da equipe." },
  funcionarios: { titulo: "Meus Funcionários", subtitulo: "Cadastre, edite e gerencie os colaboradores." },
  campanhas: { titulo: "Campanhas", subtitulo: "Gerencie campanhas comerciais e programas de incentivo." },
  gamificacao: { titulo: "Gamificação", subtitulo: "Conquistas, badges e programa de pontos da equipe." },
  equipes: { titulo: "Equipes", subtitulo: "Estrutura organizacional e composição de equipes." },
  filiais: { titulo: "Filiais", subtitulo: "Gerencie as filiais e pontos de venda." },
  usuarios: { titulo: "Área Admin", subtitulo: "Gerencie usuários, convites e botões de acesso rápido." },
  configuracoes: { titulo: "Configurações", subtitulo: "Personalize indicadores, regras e parâmetros." },
  auditoria: { titulo: "Auditoria", subtitulo: "Logs de ações e histórico de alterações." },
  ia: { titulo: "Assistente IA", subtitulo: "Análises e insights gerados por Inteligência Artificial." },
};

interface TopbarProps { pagina: Pagina; onAbrirMenu: () => void }

export default function Topbar({ pagina }: TopbarProps) {
  const { usuario, trocarPerfil, perfisDisponiveis } = useAuth();
  const { titulo, subtitulo } = titulos[pagina];
  const perfilLabel: Record<string, string> = { admin: "Administrador", gerente: "Gerente", supervisor: "Supervisor", vendedor: "Atendente" };

  return (
    <header className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 sm:text-3xl dark:text-white">{titulo}</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">{subtitulo}</p>
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        {perfisDisponiveis?.length > 1 && (
          <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            {perfisDisponiveis.map((p: any) => (
              <button key={p} onClick={() => trocarPerfil(p)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition ${usuario?.perfil === p ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}>{p === "admin" ? "👑 Admin" : "🧑 Atendente"}</button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white py-1.5 pl-1.5 pr-4 shadow-sm dark:border-white/10 dark:bg-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white">{usuario?.iniciais}</div>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{usuario?.nome}</p>
            <p className="text-[10px] text-gray-400">{perfilLabel[usuario?.perfil || "vendedor"]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
