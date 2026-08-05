"use client";

import { useId, useState } from "react";
import { fmtBRL, fmtPct } from "@/lib/planilha/format";

// ── Radar comparativo (multi-dimensional) ────────────────────────────────────
export function RadarChart({
  eixos,
  series,
  size = 260,
}: {
  eixos: string[];
  series: { nome: string; cor: string; valores: number[] }[];
  size?: number;
}) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.32;
  const n = Math.max(eixos.length, 1);
  const maxEscala = Math.max(100, ...series.flatMap((s) => s.valores));
  const legendaH = series.length * 13 + 8;

  const ponto = (i: number, frac: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + R * frac * Math.cos(ang), cy + R * frac * Math.sin(ang)];
  };

  return (
    <svg viewBox={`0 0 ${size} ${size + legendaH}`} className="w-full h-auto">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={eixos.map((_, i) => ponto(i, f).join(",")).join(" ")}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}
      {eixos.map((_, i) => {
        const [x, y] = ponto(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth={1} />;
      })}
      {eixos.map((eixo, i) => {
        const [x, y] = ponto(i, 1.26);
        return (
          <text key={eixo} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={8.5} fontWeight={600} fill="#475569">
            {eixo.length > 15 ? eixo.slice(0, 14) + "…" : eixo}
          </text>
        );
      })}
      {series.map((s) => {
        const dim = ativo !== null && ativo !== s.nome;
        return (
          <g key={s.nome} opacity={dim ? 0.15 : 1} className="transition-opacity">
            <polygon
              points={s.valores.map((v, i) => ponto(i, Math.min(v, maxEscala) / maxEscala).join(",")).join(" ")}
              fill={s.cor}
              fillOpacity={0.16}
              stroke={s.cor}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {s.valores.map((v, i) => {
              const [x, y] = ponto(i, Math.min(v, maxEscala) / maxEscala);
              return (
                <circle key={i} cx={x} cy={y} r={3} fill={s.cor}>
                  <title>{`${s.nome} · ${eixos[i]}: ${fmtPct(v)}`}</title>
                </circle>
              );
            })}
          </g>
        );
      })}
      {series.map((s, i) => (
        <g
          key={`lg-${s.nome}`}
          onMouseEnter={() => setAtivo(s.nome)}
          onMouseLeave={() => setAtivo(null)}
          className="cursor-pointer"
        >
          <rect x={10} y={size + 2 + i * 13} width={8} height={8} rx={2} fill={s.cor} />
          <text x={23} y={size + 9 + i * 13} fontSize={8.5} fill="#475569" fontWeight={ativo === s.nome ? 700 : 400}>
            {s.nome.length > 30 ? s.nome.slice(0, 29) + "…" : s.nome}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Waterfall: decomposição do realizado até a meta ──────────────────────────
export function WaterfallChart({
  meta,
  parcelas,
}: {
  meta: number;
  parcelas: { label: string; valor: number; cor: string }[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const W = 560;
  const H = 250;
  const padL = 66;
  const padB = 56;
  const padT = 26;
  const total = parcelas.length + 2;
  const largura = Math.max(20, (W - padL - 24) / total - 12);
  const somaParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  const maxVal = Math.max(meta, somaParcelas, 1) * 1.15;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / maxVal);
  const altura = (v: number) => Math.max(2, (H - padT - padB) * (v / maxVal));

  const itens: { label: string; base: number; valor: number; cor: string; total?: boolean }[] = [
    { label: "Meta", base: 0, valor: meta, cor: "#0e7a5f", total: true },
  ];
  let acumulado = 0;
  for (const p of parcelas) {
    itens.push({ label: p.label, base: acumulado, valor: p.valor, cor: p.cor });
    acumulado += p.valor;
  }
  itens.push({ label: "Gap", base: acumulado, valor: Math.max(0, meta - acumulado), cor: "#cbd5e1" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {Array.from({ length: 4 }).map((_, i) => {
        const v = (maxVal / 3) * i;
        return (
          <g key={i} className="svg-fade" style={{ animationDelay: `${i * 50}ms` }}>
            <line x1={padL} x2={W - 12} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeDasharray={i === 0 ? "0" : "3 3"} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#6b7280">
              {"R$ " + Math.round(v).toLocaleString("pt-BR")}
            </text>
          </g>
        );
      })}
      {itens.map((it, i) => {
        const bx = padL + 14 + i * (largura + 12);
        const topo = it.total ? y(it.valor) : y(it.base + it.valor);
        const alt = altura(it.valor);
        const delayMs = 180 + i * 150;
        const delay = `${delayMs}ms`;
        const ativo = hoverIdx === i;
        return (
          <g key={`${it.label}-${i}`} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} className="cursor-pointer">
            {!it.total && i > 1 && (
              <line
                x1={bx - 12} x2={bx} y1={y(it.base)} y2={y(it.base)}
                stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3"
                className="dash-march" style={{ animationDelay: delay }}
              />
            )}
            <clipPath id={`wfc-${uid}-${i}`}>
              <rect x={bx} y={topo} width={largura} height={alt} rx={4} />
            </clipPath>
            <g className="svg-grow-up" style={{ animationDelay: delay }}>
              <g className="breathe-y" style={{ animationDelay: `${delayMs + 950}ms`, animationDuration: `${3100 + i * 360}ms` }}>
                <rect
                  x={bx} y={topo} width={largura} height={alt} rx={4} fill={it.cor}
                  opacity={it.valor === 0 ? 0.35 : hoverIdx === null || ativo ? 1 : 0.5}
                  className="bar-hover"
                >
                  <title>{`${it.label}: ${fmtBRL(it.valor)}`}</title>
                </rect>
              </g>
            </g>
            <g clipPath={`url(#wfc-${uid}-${i})`}>
              <rect x={bx} y={topo} width={14} height={alt} fill="rgba(255,255,255,0.45)"
                className="sheen-x" style={{ animationDelay: `${delayMs + 800 + i * 220}ms` }} />
            </g>
            <text
              x={bx + largura / 2} y={topo - 6} textAnchor="middle" fontSize={ativo ? 9.5 : 8.5}
              fontWeight={700} fill={ativo ? "#0d3b96" : "#111827"}
              className="svg-fade transition-all" style={{ animationDelay: `${delayMs + 420}ms` }}
            >
              {fmtBRL(it.valor).replace(",00", "")}
            </text>
            <text
              x={bx + largura / 2} y={H - padB + 14} textAnchor="middle" fontSize={8.5}
              fill={ativo ? "#0d3b96" : "#475569"} fontWeight={ativo ? 700 : 400}
              className="svg-fade transition-all" style={{ animationDelay: delay }}
            >
              {it.label.length > 12 ? it.label.slice(0, 11) + "…" : it.label}
            </text>
          </g>
        );
      })}
      <text
        x={W / 2} y={H - 10} textAnchor="middle" fontSize={9} fill="#94a3b8"
        className="svg-fade" style={{ animationDelay: `${150 + itens.length * 140 + 300}ms` }}
      >
        Realizado representa {fmtPct(meta > 0 ? (somaParcelas / meta) * 100 : 0)} da meta
      </text>
    </svg>
  );
}
