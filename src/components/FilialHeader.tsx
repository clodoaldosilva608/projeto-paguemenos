import { filial } from "../data/mockData";

export default function FilialHeader() {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b-2 border-[var(--pm-navy)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-[var(--pm-navy)] sm:text-[44px] dark:text-blue-300">
          Metas Mensais
          <br className="sm:hidden" />{" "}
          <span className="text-[var(--pm-navy)] dark:text-blue-300">e Individuais</span>
        </h1>
        <p className="mt-2 font-cond text-sm uppercase tracking-[0.25em] text-[var(--pm-red)] dark:text-red-400 sm:text-base">
          {filial.nome} <span className="mx-2 text-slate-400 dark:text-slate-500">•</span> {filial.periodo}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--pm-red)] shadow-lg shadow-red-900/20">
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" />
          </svg>
          <span className="absolute -bottom-1 -right-1 rounded-md bg-white px-1 text-[9px] font-bold text-[var(--pm-red)] shadow">
            PM
          </span>
        </div>
        <div className="leading-tight">
          <p className="font-display text-xl text-[var(--pm-navy)] dark:text-blue-300">Pague</p>
          <p className="-mt-1 font-display text-xl text-[var(--pm-red)] dark:text-red-400">Menos</p>
        </div>
      </div>
    </header>
  );
}
