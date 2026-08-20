"use client";

import { useId, useState } from "react";
import { fmtBRL } from "@/lib/planilha/format";

// ══ Evolução de Vendas — linha com glow, ripple e guia no hover ═════════════
export function LineChart({
  points,
  height = 220,
}: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const W = 560;
  const H = height;
  const padL = 70;
  const padR = 60;
  const padT = 28;
  const padB = 34;
  const max = Math.max(...points.map((p) => p.value), 1) * 1.25;
  const x = (i: number) => (points.length > 1 ? padL + (i * (W - padL - padR)) / (points.length - 1) : W / 2);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = 5;

  const areaPath = points.length > 0
    ? [`M ${x(0)} ${H - padB}`, ...points.map((p, i) => `L ${x(i)} ${y(p.value)}`), `L ${x(points.length - 1)} ${H - padB} Z`].join(" ")
    : "";

  const pontoDelay = (i: number) => 320 + (points.length > 1 ? (i / (points.length - 1)) * 850 : 0);
  const idxMaior = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  // Caminho usado pelo ponto que percorre a linha continuamente
  const linePath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ")
    : "";

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id={`la-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a56c5" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#1a56c5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`ls-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#1a56c5" />
            <stop offset="100%" stopColor="#0d3b96" />
          </linearGradient>
          <filter id={`lg-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const v = (max / ticks) * i;
          return (
            <g key={i} className="svg-fade" style={{ animationDelay: `${i * 45}ms` }}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth={1} strokeDasharray={i === 0 ? "0" : "3 3"} />
              <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#6b7280">
                {"R$ " + Math.round(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </text>
            </g>
          );
        })}

        {/* guia vertical no hover */}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="#1a56c5" strokeWidth={1} strokeDasharray="4 3" opacity={0.45} className="animate-fade-in" />
        )}

        {/* área com ondulação contínua */}
        <g className="wave-shift">
          <path d={areaPath} fill={`url(#la-${uid})`} className="svg-fade" style={{ animationDelay: "760ms", animationDuration: "850ms" }} />
        </g>

        {/* linha com brilho e leve respiração de opacidade */}
        <polyline
          fill="none"
          stroke={`url(#ls-${uid})`}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter={`url(#lg-${uid})`}
          className="draw-line hue-slide"
          points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
        />

        {/* cometa que percorre a linha sem parar */}
        {linePath && (
          <g style={{ offsetPath: `path("${linePath}")` } as React.CSSProperties} className="travel-dot">
            <circle r={7} fill="#38bdf8" opacity={0.28} />
            <circle r={3.4} fill="#fff" stroke="#1a56c5" strokeWidth={1.6} />
          </g>
        )}

        {points.map((p, i) => {
          const ativo = hover === i;
          return (
            <g key={p.label}>
              {/* pulso contínuo no maior valor */}
              {i === idxMaior && (
                <circle cx={x(i)} cy={y(p.value)} r={5} fill="none" stroke="#1a56c5" className="ripple-ring" style={{ animationDelay: `${pontoDelay(i) + 600}ms` }} />
              )}
              {/* ponto: entra com pop e depois pulsa continuamente */}
              <g className="svg-pop" style={{ animationDelay: `${pontoDelay(i)}ms` }}>
                <g className="throb" style={{ animationDelay: `${pontoDelay(i) + 900}ms`, animationDuration: `${2200 + i * 320}ms` }}>
                  <circle
                    cx={x(i)} cy={y(p.value)} r={ativo ? 7.5 : 5}
                    fill={ativo ? "#0d3b96" : "#1a56c5"} stroke="#fff" strokeWidth={2.4}
                    className="transition-all"
                  />
                </g>
              </g>
              <g className="bob" style={{ animationDelay: `${pontoDelay(i) + 700}ms`, animationDuration: `${3000 + i * 260}ms` }}>
                <text
                  x={x(i)} y={y(p.value) - 13} textAnchor="middle" fontSize={ativo ? 11.5 : 10.5}
                  fontWeight={700} fill={ativo ? "#0d3b96" : "#111827"}
                  className="svg-fade transition-all" style={{ animationDelay: `${pontoDelay(i)}ms` }}
                >
                  {fmtBRL(p.value)}
                </text>
              </g>
              <text
                x={x(i)} y={H - padB + 16} textAnchor="middle" fontSize={10}
                fill={ativo ? "#0d3b96" : "#374151"} fontWeight={ativo ? 700 : 400}
                className="svg-fade transition-all" style={{ animationDelay: `${pontoDelay(i)}ms` }}
              >
                {p.label}
              </text>
              <rect x={x(i) - 26} y={padT} width={52} height={H - padT - padB} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-xl animate-modal-in"
          style={{ left: `${(x(hover) / W) * 100}%`, top: "6px", transform: "translateX(-50%)" }}
        >
          <div className="text-[9px] uppercase tracking-wide text-sky-300">{points[hover].label}</div>
          <div className="text-[12px] font-extrabold">{fmtBRL(points[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

// ══ Participação por Categoria — fatias que explodem no hover ═══════════════
export function DonutChart({
  slices,
  centerTop,
  centerBottom,
  inner = 0.62,
  size = 190,
}: {
  slices: { label: string; value: number; color: string }[];
  centerTop?: string;
  centerBottom?: string;
  inner?: number;
  size?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = size / 2;
  const r = R * inner;
  let a0 = -Math.PI / 2;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total;
      const a1 = a0 + frac * Math.PI * 2;
      const large = frac > 0.5 ? 1 : 0;
      const p = (a: number, rad: number) => [R + rad * Math.cos(a), R + rad * Math.sin(a)];
      const [x0, y0] = p(a0, R);
      const [x1, y1] = p(a1, R);
      const mid = (a0 + a1) / 2;
      let d: string;
      if (frac >= 0.9999) d = `M ${R} ${0} A ${R} ${R} 0 1 1 ${R - 0.01} ${0} Z`;
      else if (inner > 0) {
        const [xi1, yi1] = p(a1, r);
        const [xi0, yi0] = p(a0, r);
        d = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`;
      } else d = `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
      a0 = a1;
      return { d, color: s.color, key: s.label, value: s.value, frac, mid };
    });

  const hoverSlice = arcs.find((a) => a.key === hover);
  const displayTop = hoverSlice ? fmtBRL(hoverSlice.value).replace(",00", "") : centerTop;
  const displayBottom = hoverSlice ? `${((hoverSlice.value / total) * 100).toFixed(1)}%` : centerBottom;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {/* a rosca gira lentamente enquanto ninguém interage */}
      <g className={hover === null ? "spin-slow" : undefined} style={{ transformBox: "view-box", transformOrigin: "50% 50%" }}>
        {arcs.map((a, i) => {
          const ativo = hover === a.key;
          const dx = ativo ? Math.cos(a.mid) * 6 : 0;
          const dy = ativo ? Math.sin(a.mid) * 6 : 0;
          return (
            <g key={a.key} className="donut-slice" style={{ animationDelay: `${i * 120}ms` }}>
              <path
                d={a.d}
                fill={a.color}
                stroke="#fff"
                strokeWidth={ativo ? 3 : 1.5}
                opacity={hover === null || ativo ? 1 : 0.45}
                className="slice-hover cursor-pointer"
                style={{ transform: `translate(${dx}px, ${dy}px)`, filter: ativo ? "brightness(1.08)" : undefined }}
                onMouseEnter={() => setHover(a.key)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${a.key}: ${fmtBRL(a.value)} (${((a.value / total) * 100).toFixed(1)}%)`}</title>
              </path>
            </g>
          );
        })}
      </g>
      {inner > 0 && (
        <>
          <circle cx={R} cy={R} r={r - 1} fill="#fff" pointerEvents="none" />
          {displayTop && (
            <text x={R} y={R - 2} textAnchor="middle" fontSize={size * 0.082} fontWeight={800} fill="#111827"
              pointerEvents="none" className={`svg-fade ${hover ? "" : "glow-pulse"}`} style={{ animationDelay: hover ? "0ms" : "520ms" }}>
              {displayTop}
            </text>
          )}
          {displayBottom && (
            <text x={R} y={R + size * 0.09} textAnchor="middle" fontSize={size * 0.062} fill="#6b7280"
              pointerEvents="none" className="svg-fade" style={{ animationDelay: "600ms" }}>
              {displayBottom}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

// ══ Ranking (barras verticais) — gradiente, sheen e hover ═══════════════════
export function BarChartV({
  bars,
}: {
  bars: { label: string; value: number; color: string; medal?: string }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const W = 560;
  const H = 250;
  const padL = 64;
  const padB = 64;
  const padT = 30;
  const max = Math.max(...bars.map((b) => b.value), 1) * 1.2;
  const bw = 64;
  const gap = (W - padL - 20 - bars.length * bw) / Math.max(bars.length, 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        {bars.map((b, i) => (
          <linearGradient key={i} id={`bv-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={b.color} stopOpacity="1" />
            <stop offset="100%" stopColor={b.color} stopOpacity="0.62" />
          </linearGradient>
        ))}
        <clipPath id={`bvc-${uid}`}>
          <rect x={padL} y={padT} width={W - padL} height={H - padT - padB} />
        </clipPath>
      </defs>

      {Array.from({ length: 4 }).map((_, i) => {
        const v = (max / 3) * i;
        return (
          <g key={i} className="svg-fade" style={{ animationDelay: `${i * 50}ms` }}>
            <line x1={padL} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeDasharray={i === 0 ? "0" : "3 3"} />
            <text x={padL - 8} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#6b7280">
              {"R$ " + Math.round(v).toLocaleString("pt-BR")}
            </text>
          </g>
        );
      })}

      {bars.map((b, i) => {
        const bx = padL + 14 + i * (bw + gap);
        const by = y(b.value);
        const alt = H - padB - by;
        const lines = b.label.split("\n");
        const active = hover === i;
        const delay = 200 + i * 140;
        return (
          <g key={b.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
            {/* entra crescendo e depois "respira" continuamente */}
            <g className="svg-grow-up" style={{ animationDelay: `${delay}ms` }}>
              <g className="breathe-y" style={{ animationDelay: `${delay + 900}ms`, animationDuration: `${3000 + i * 380}ms` }}>
                <rect
                  x={bx} y={by} width={bw} height={alt} rx={5}
                  fill={`url(#bv-${uid}-${i})`}
                  opacity={hover === null || active ? 1 : 0.55}
                  className="bar-hover"
                >
                  <title>{`${b.label.replace(/\n/g, " ")}: ${fmtBRL(b.value)}`}</title>
                </rect>
              </g>
            </g>
            {/* brilho percorrendo a barra */}
            <g clipPath={`url(#bvc-${uid})`}>
              <rect x={bx} y={by} width={16} height={alt} fill="rgba(255,255,255,0.5)"
                className="sheen-x" style={{ animationDelay: `${delay + 700 + i * 260}ms` }} />
            </g>
            <text x={bx + bw / 2} y={by - 9} textAnchor="middle" fontSize={active ? 11.5 : 10.5}
              fontWeight={700} fill={active ? "#0d3b96" : "#111827"}
              className="svg-fade transition-all" style={{ animationDelay: `${delay + 430}ms` }}>
              {fmtBRL(b.value)}
            </text>
            {lines.map((l, li) => (
              <text key={li} x={bx + bw / 2} y={H - padB + 14 + li * 12} textAnchor="middle" fontSize={9.5}
                fill={active ? "#0d3b96" : "#374151"} fontWeight={active ? 600 : 400}
                className="svg-fade transition-all" style={{ animationDelay: `${delay}ms` }}>
                {l}
              </text>
            ))}
            {b.medal && (
              <g className={`svg-pop ${b.medal === "1º" ? "float-y" : ""}`} style={{ animationDelay: `${delay + 540}ms` }}>
                <circle cx={bx + bw / 2} cy={H - padB + 14 + lines.length * 12 + 8} r={9.5}
                  fill={b.medal === "1º" ? "#fbbf24" : b.medal === "2º" ? "#cbd5e1" : "#d97706"} />
                <text x={bx + bw / 2} y={H - padB + 14 + lines.length * 12 + 11.5} textAnchor="middle"
                  fontSize={8.5} fontWeight={800} fill="#1f2937">{b.medal}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ══ Ranking (barras horizontais) — sheen + hover ════════════════════════════
export function BarChartH({
  bars,
}: {
  bars: { label: string; value: number; medal?: string }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const W = 560;
  const rowH = 46;
  const padT = 8;
  const padL = 150;
  const H = padT + bars.length * rowH + 26;
  const max = Math.max(...bars.map((b) => b.value), 1) * 1.18;
  const bx = (v: number) => (v / max) * (W - padL - 76);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id={`bh-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a56c5" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id={`bha-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d3b96" />
          <stop offset="100%" stopColor="#1a56c5" />
        </linearGradient>
      </defs>
      {bars.map((b, i) => {
        const yTop = padT + i * rowH + 8;
        const lines = b.label.split("\n");
        const active = hover === i;
        const largura = Math.max(bx(b.value), 3);
        const delay = 160 + i * 130;
        return (
          <g key={b.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-pointer">
            {lines.map((l, li) => (
              <text key={li} x={padL - 10} y={yTop + 12 + li * 12 - (lines.length - 1) * 5} textAnchor="end" fontSize={9.5}
                fill={active ? "#0d3b96" : "#374151"} fontWeight={active ? 700 : 400}
                className="svg-fade transition-all" style={{ animationDelay: `${delay}ms` }}>
                {l}
              </text>
            ))}
            <clipPath id={`bhc-${uid}-${i}`}>
              <rect x={padL} y={yTop} width={largura} height={22} rx={4} />
            </clipPath>
            <g className="svg-grow-right" style={{ animationDelay: `${delay}ms` }}>
              <g className="breathe-x" style={{ animationDelay: `${delay + 900}ms`, animationDuration: `${3200 + i * 340}ms` }}>
                <rect x={padL} y={yTop} width={largura} height={22} rx={4}
                  fill={active ? `url(#bha-${uid})` : `url(#bh-${uid})`}
                  opacity={hover === null || active ? 1 : 0.55}
                  className="bar-hover">
                  <title>{`${b.label.replace(/\n/g, " ")}: ${fmtBRL(b.value)}`}</title>
                </rect>
              </g>
            </g>
            <g clipPath={`url(#bhc-${uid}-${i})`}>
              <rect x={padL} y={yTop} width={18} height={22} fill="rgba(255,255,255,0.45)"
                className="sheen-x" style={{ animationDelay: `${delay + 800 + i * 240}ms` }} />
            </g>
            <text x={padL + largura + 8} y={yTop + 15} fontSize={active ? 11.5 : 10.5} fontWeight={700}
              fill={active ? "#0d3b96" : "#111827"} className="svg-fade transition-all"
              style={{ animationDelay: `${delay + 420}ms` }}>
              {fmtBRL(b.value)}
            </text>
            {b.medal && (
              <g className={`svg-pop ${b.medal === "1º" ? "float-y" : ""}`} style={{ animationDelay: `${delay + 500}ms` }}>
                <circle cx={W - 18} cy={yTop + 11} r={10} fill={b.medal === "1º" ? "#fbbf24" : b.medal === "2º" ? "#cbd5e1" : "#d97706"} />
                <text x={W - 18} y={yTop + 14.5} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="#1f2937">{b.medal}</text>
              </g>
            )}
          </g>
        );
      })}
      <line x1={padL} x2={padL} y1={padT} y2={H - 18} stroke="#d1d5db" />
    </svg>
  );
}

// ══ Anel de progresso (KPIs) ════════════════════════════════════════════════
export function ProgressRing({ pct, size = 44, stroke = 5, color }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * c;
  const auto = pct >= 70 ? "#16a34a" : pct >= 30 ? "#f59e0b" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color ?? auto} strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 1000ms cubic-bezier(0.16,1,0.3,1)" }}
      />
      <text x={size / 2} y={size / 2 + 3} textAnchor="middle" fontSize={size * 0.28} fontWeight={800} fill="#fff">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}
