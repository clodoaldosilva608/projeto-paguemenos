"use client";

import { useMemo, useState } from "react";
import { fmtBRL, fmtPct, statusDe } from "@/lib/planilha/format";
import { StatusPill } from "@/components/planilha/kit";

export type CategoriaSim = {
  nome: string;
  cor: string;
  meta: number;
  realizado: number;
  projecao: number;
};

// Simulador what-if: ajusta o crescimento por categoria e recalcula o fechamento.
export function GoalSimulator({ categorias }: { categorias: CategoriaSim[] }) {
  const [ajustes, setAjustes] = useState<Record<string, number>>(
    Object.fromEntries(categorias.map((c) => [c.nome, 0])),
  );
  const [diasRestantes, setDiasRestantes] = useState(5);

  const metaTotal = categorias.reduce((s, c) => s + c.meta, 0);
  const realizadoTotal = categorias.reduce((s, c) => s + c.realizado, 0);

  const simulacao = useMemo(() => {
    const linhas = categorias.map((c) => {
      const crescimento = ajustes[c.nome] ?? 0;
      // Incremento diário estimado a partir do ritmo atual acrescido do crescimento.
      const ritmoDiario = c.realizado > 0 ? c.realizado / 3 : 0;
      const incremento = ritmoDiario * (1 + crescimento / 100) * diasRestantes;
      const projetado = c.realizado + incremento;
      return {
        ...c,
        crescimento,
        projetado,
        atingProjetado: c.meta > 0 ? (projetado / c.meta) * 100 : 0,
        atingAtual: c.meta > 0 ? (c.realizado / c.meta) * 100 : 0,
      };
    });
    const projetadoTotal = linhas.reduce((s, l) => s + l.projetado, 0);
    return {
      linhas,
      projetadoTotal,
      atingProjetado: metaTotal > 0 ? (projetadoTotal / metaTotal) * 100 : 0,
      gap: metaTotal - projetadoTotal,
    };
  }, [ajustes, categorias, diasRestantes, metaTotal]);

  const atingAtual = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0;
  const delta = simulacao.atingProjetado - atingAtual;

  const aplicarPreset = (valor: number) => {
    setAjustes(Object.fromEntries(categorias.map((c) => [c.nome, valor])));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cenários rápidos</span>
        {[
          { label: "Conservador", valor: -10, cor: "border-rose-300 text-rose-700 hover:bg-rose-50" },
          { label: "Manter ritmo", valor: 0, cor: "border-slate-300 text-slate-700 hover:bg-slate-50" },
          { label: "Otimista +25%", valor: 25, cor: "border-emerald-300 text-emerald-700 hover:bg-emerald-50" },
          { label: "Agressivo +50%", valor: 50, cor: "border-[#1a56c5] text-[#1a56c5] hover:bg-blue-50" },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => aplicarPreset(p.valor)}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${p.cor}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Dias restantes</span>
        <input
          type="range"
          min={1}
          max={20}
          value={diasRestantes}
          onChange={(e) => setDiasRestantes(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-300 accent-[#1a56c5]"
        />
        <span className="w-10 text-right text-[12px] font-extrabold text-slate-800">{diasRestantes}d</span>
      </label>

      <div className="flex flex-col gap-2.5">
        {simulacao.linhas.map((l) => (
          <div key={l.nome} className="rounded-lg border border-slate-200 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.cor }} />
                {l.nome}
              </span>
              <span className="text-[10px] text-slate-500">
                {fmtPct(l.atingAtual, 1)} → <strong className={l.atingProjetado >= 70 ? "text-emerald-600" : l.atingProjetado >= 30 ? "text-amber-600" : "text-rose-600"}>{fmtPct(l.atingProjetado, 1)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min={-50}
                max={100}
                step={5}
                value={l.crescimento}
                onChange={(e) => setAjustes((prev) => ({ ...prev, [l.nome]: Number(e.target.value) }))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#1a56c5]"
                aria-label={`Ajuste de crescimento para ${l.nome}`}
              />
              <span className={`w-12 text-right text-[11px] font-extrabold ${l.crescimento > 0 ? "text-emerald-600" : l.crescimento < 0 ? "text-rose-600" : "text-slate-500"}`}>
                {l.crescimento > 0 ? "+" : ""}{l.crescimento}%
              </span>
            </div>
            <div className="mt-1 flex justify-between text-[9.5px] text-slate-400">
              <span>Realizado {fmtBRL(l.realizado)}</span>
              <span>Projetado {fmtBRL(l.projetado)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#0d2b57] p-3 text-white sm:grid-cols-4">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-sky-300">Meta</div>
          <div className="text-[13px] font-extrabold">{fmtBRL(metaTotal)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-sky-300">Projeção simulada</div>
          <div className="text-[13px] font-extrabold text-sky-200">{fmtBRL(simulacao.projetadoTotal)}</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-sky-300">Atingimento</div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-extrabold">{fmtPct(simulacao.atingProjetado)}</span>
            <span className={`text-[10px] font-bold ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {delta >= 0 ? "↑" : "↓"} {fmtPct(Math.abs(delta), 1)}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-sky-300">Situação simulada</div>
          <StatusPill status={statusDe(simulacao.atingProjetado)} />
        </div>
      </div>

      <p className="rounded-lg bg-amber-50 p-2.5 text-[10px] leading-relaxed text-amber-800">
        <strong>Como funciona:</strong> o simulador projeta o fechamento aplicando o ritmo diário atual de cada categoria,
        ajustado pelo percentual escolhido, ao longo dos dias restantes. É uma análise <strong>what-if</strong> — nenhum dado é gravado.
        {simulacao.gap > 0
          ? ` Neste cenário ainda faltariam ${fmtBRL(simulacao.gap)} para a meta.`
          : ` Neste cenário a meta seria superada em ${fmtBRL(Math.abs(simulacao.gap))}.`}
      </p>
    </div>
  );
}
