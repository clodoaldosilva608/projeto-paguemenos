import { useMemo, useState } from "react";
import { metas, ranking } from "../data/mockData";

interface SearchResult {
  tipo: "meta" | "ranking" | "pagina";
  titulo: string;
  subtitulo: string;
  icon: string;
}

const resultadosPagina: SearchResult[] = [
  { tipo: "pagina", titulo: "Dashboard", subtitulo: "Visão geral do desempenho", icon: "📊" },
  { tipo: "pagina", titulo: "Minhas Metas", subtitulo: "Gerencie objetivos e progresso", icon: "🎯" },
  { tipo: "pagina", titulo: "Ranking", subtitulo: "Classificação da equipe", icon: "🏆" },
  { tipo: "pagina", titulo: "Relatórios", subtitulo: "Análises detalhadas", icon: "📈" },
];

interface SearchBarProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function SearchBar({ aberto, onFechar }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const resultados = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const metasResult: SearchResult[] = metas
      .filter((m) => m.titulo.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q))
      .map((m) => ({ tipo: "meta", titulo: m.titulo, subtitulo: `${m.progresso}% concluído · ${m.categoria}`, icon: "🎯" }));

    const rankResult: SearchResult[] = ranking
      .filter((r) => r.nome.toLowerCase().includes(q))
      .map((r) => ({ tipo: "ranking", titulo: r.nome, subtitulo: `#${r.posicao} · ${r.vendas.toLocaleString("pt-BR")} vendas`, icon: "🏅" }));

    const paginas = resultadosPagina.filter((p) => p.titulo.toLowerCase().includes(q));

    return [...paginas, ...metasResult, ...rankResult].slice(0, 6);
  }, [query]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onClick={onFechar}
    >
      <div
        className="mt-[10vh] w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-gray-100 p-4 dark:border-white/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-gray-400">
            <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar metas, pessoas, páginas..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none dark:text-gray-100 dark:placeholder-gray-500"
          />
          <kbd className="hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 sm:inline dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {!query.trim() && (
            <p className="p-4 text-center text-xs text-gray-400">
              Digite para começar a buscar no Orion.
            </p>
          )}
          {query.trim() && resultados.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">Nenhum resultado encontrado.</p>
          )}
          {resultados.map((r, i) => (
            <button
              key={i}
              onClick={onFechar}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="text-lg">{r.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-gray-100">{r.titulo}</p>
                <p className="text-xs text-gray-400">{r.subtitulo}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-white/10 dark:text-gray-300">
                {r.tipo}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-[10px] text-gray-400 dark:border-white/10">
          <span>
            <kbd className="rounded bg-gray-100 px-1 py-0.5 font-semibold dark:bg-white/10">↑↓</kbd> navegar
          </span>
          <span>
            <kbd className="rounded bg-gray-100 px-1 py-0.5 font-semibold dark:bg-white/10">↵</kbd> selecionar
          </span>
        </div>
      </div>
    </div>
  );
}
