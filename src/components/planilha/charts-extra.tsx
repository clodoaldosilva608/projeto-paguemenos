"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fmtBRL, fmtData, fmtPct } from "@/lib/planilha/format";

// ══ Velocímetro — arco iluminado FIXO na meta; só o ponteiro se move ════════
export function Gauge({
  pct,
  label,
  sublabel,
  size = 220,
}: {
  pct: number;
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const uid = useId().replace(/:/g, "");

  // Geometria alinhada: trilha e ponta do ponteiro compartilham o MESMO raio.
  const padX = 28;
  const padTop = 28;
  const padBottom = 18;
  const inner = size;
  const trackR = inner * 0.36; // raio da linha central da trilha
  const trackW = inner * 0.1;  // espessura da trilha
  const cx = padX + inner / 2;
  const cy = padTop + inner * 0.58;
  const totalW = inner + padX * 2;
  const totalH = padTop + inner * 0.62 + padBottom;
  const needleLen = trackR; // ponta do ponteiro exatamente no centro da trilha

  const clamped = Math.max(0, Math.min(100, pct));
  const targetAngle = (clamped / 100) * 180;
  const metaPct = Math.round(clamped);

  // Status da META (fixo) — define o badge e o texto Real
  const statusMeta =
    clamped >= 70
      ? { principal: "#16a34a", claro: "#22c55e", escuro: "#166534", softBg: "#dcfce7", softBorda: "#86efac", texto: "#166534", rotulo: "ALTO" }
      : clamped >= 30
        ? { principal: "#f59e0b", claro: "#fbbf24", escuro: "#b45309", softBg: "#fef3c7", softBorda: "#fcd34d", texto: "#b45309", rotulo: "MÉDIO" }
        : { principal: "#dc2626", claro: "#ef4444", escuro: "#991b1b", softBg: "#fee2e2", softBorda: "#fca5a5", texto: "#991b1b", rotulo: "BAIXO" };

  // Cor por ZONA do ponteiro (muda conforme ele percorre o arco)
  const corZona = (pctLocal: number) =>
    pctLocal >= 70 ? "#16a34a" : pctLocal >= 30 ? "#f59e0b" : "#dc2626";

  // frac 0 = esquerda (0%), frac 1 = direita (100%)
  const ponto = (frac: number, raio: number): [number, number] => {
    const ang = Math.PI * (1 - Math.max(0, Math.min(1, frac)));
    return [cx + raio * Math.cos(ang), cy - raio * Math.sin(ang)];
  };
  const arco = (from: number, to: number, raio = trackR) => {
    const a0 = Math.max(0, Math.min(1, from));
    const a1 = Math.max(0, Math.min(1, to));
    if (a1 <= a0) return "";
    const [x0, y0] = ponto(a0, raio);
    const [x1, y1] = ponto(a1, raio);
    const large = a1 - a0 > 0.5 ? 1 : 0;
    return `M ${x0} ${y0} A ${raio} ${raio} 0 ${large} 1 ${x1} ${y1}`;
  };

  const ticks = Array.from({ length: 11 }, (_, i) => i * 10);
  const isMajor = (n: number) => n % 20 === 0;

  // Só o ponteiro se move: sobe até a meta e oscila nela
  const [angle, setAngle] = useState(0);
  const [phase, setPhase] = useState<"accel" | "idle">("accel");
  const [paused, setPaused] = useState(false);
  const startRef = useRef(0);
  const idleTimeRef = useRef(0);
  const angleRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let current = angleRef.current;
    const accelDuration = 2200;

    const loop = (now: number) => {
      if (!startRef.current) startRef.current = now;

      if (phase === "accel" && !paused) {
        const elapsed = Math.min(now - startRef.current, accelDuration);
        const t = elapsed / accelDuration;
        const eased = 1 - Math.pow(1 - t, 2.6);
        const desired = targetAngle * eased;
        current += (desired - current) * 0.3;
        if (elapsed >= accelDuration - 40) {
          current = targetAngle;
          setPhase("idle");
          idleTimeRef.current = now;
        }
      } else if (paused) {
        current += (targetAngle - current) * 0.25;
      } else {
        const idleElapsed = (now - idleTimeRef.current) / 1000;
        const wobble = Math.sin(idleElapsed * 2.6) * 2.0 + Math.sin(idleElapsed * 4.8) * 0.7;
        const desired = targetAngle + wobble;
        current += (desired - current) * 0.2;
      }

      angleRef.current = current;
      setAngle(current);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, paused, targetAngle]);

  const handleReplay = () => {
    startRef.current = 0;
    angleRef.current = 0;
    setPhase("accel");
    setAngle(0);
  };

  // Ângulo do ponteiro (0..180) → percentual local e cor da zona
  const pctPonteiro = Math.max(0, Math.min(100, (angle / 180) * 100));
  const corPonteiro = corZona(pctPonteiro);

  // Zonas fixas do rastro iluminado (só até a meta real)
  const zonaBaixo = Math.min(clamped, 30) / 100;
  const zonaMedio = Math.min(Math.max(clamped - 30, 0), 40) / 100;
  const zonaAlto = Math.min(Math.max(clamped - 70, 0), 30) / 100;

  const brilhoDe = (n: number) => {
    const numAngle = (n / 100) * 180;
    const dist = Math.abs(numAngle - angle);
    return {
      brilho: Math.max(0, 1 - dist / 20),
      passou: numAngle <= angle + 2,
    };
  };

  return (
    <div className="flex w-full flex-col items-center">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        width="100%"
        style={{ maxWidth: totalW, height: "auto", display: "block" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onClick={handleReplay}
        className="cursor-pointer select-none"
        role="img"
        aria-label={`Velocímetro: ${label}`}
      >
        <defs>
          <filter id={`gg-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Trilha de fundo (fixa) */}
        <path d={arco(0, 1)} fill="none" stroke="#e2e8f0" strokeWidth={trackW} strokeLinecap="round" />

        {/* RASTRO ILUMINADO FIXO na meta — 3 zonas de cor, alinhado ao mesmo raio do ponteiro */}
        {zonaBaixo > 0 && (
          <path
            d={arco(0, zonaBaixo)}
            fill="none"
            stroke="#dc2626"
            strokeWidth={trackW * 0.78}
            strokeLinecap="butt"
            opacity={0.95}
            filter={`url(#gg-${uid})`}
          />
        )}
        {zonaMedio > 0 && (
          <path
            d={arco(0.3, 0.3 + zonaMedio)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={trackW * 0.78}
            strokeLinecap="butt"
            opacity={0.95}
            filter={`url(#gg-${uid})`}
          />
        )}
        {zonaAlto > 0 && (
          <path
            d={arco(0.7, 0.7 + zonaAlto)}
            fill="none"
            stroke="#16a34a"
            strokeWidth={trackW * 0.78}
            strokeLinecap="butt"
            opacity={0.95}
            filter={`url(#gg-${uid})`}
          />
        )}
        {/* ponta arredondada no fim do rastro fixo */}
        {clamped > 0.5 && (
          <circle
            cx={ponto(clamped / 100, trackR)[0]}
            cy={ponto(clamped / 100, trackR)[1]}
            r={(trackW * 0.78) / 2}
            fill={statusMeta.principal}
            filter={`url(#gg-${uid})`}
          />
        )}

        {/* Marcações fixas */}
        {ticks.map((n) => {
          const f = n / 100;
          const { brilho } = brilhoDe(n);
          const inset = isMajor(n) ? 8 : 4.5;
          const [x1, y1] = ponto(f, trackR + trackW * 0.52);
          const [x2, y2] = ponto(f, trackR + trackW * 0.52 + inset);
          const dentro = n <= clamped + 0.01;
          const strokeC = brilho > 0.45 ? corPonteiro : dentro ? statusMeta.escuro : "#cbd5e1";
          return (
            <line
              key={`tk-${n}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={strokeC}
              strokeWidth={isMajor(n) ? (brilho > 0.3 ? 2.4 : 1.5) : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Números fixos (acendem com o ponteiro, sem se mover) */}
        {ticks.filter(isMajor).map((n) => {
          const [nx, ny] = ponto(n / 100, trackR + trackW * 0.52 + 16);
          const { brilho, passou } = brilhoDe(n);
          const dentro = n <= clamped + 0.01;
          const fill = brilho > 0.35 ? corPonteiro : passou || dentro ? statusMeta.escuro : "#94a3b8";
          return (
            <text
              key={`nb-${n}`}
              x={nx}
              y={ny + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={800}
              fill={fill}
              style={{
                transition: "fill 120ms, filter 120ms, opacity 120ms",
                opacity: 0.5 + Math.max(brilho, dentro ? 0.3 : 0) * 0.5,
                filter: brilho > 0.25 ? `drop-shadow(0 0 ${brilho * 7}px ${corPonteiro})` : "none",
              }}
            >
              {n}
            </text>
          );
        })}

        {/* Marcador FIXO no valor real da meta (não anima) */}
        <circle
          cx={ponto(clamped / 100, trackR)[0]}
          cy={ponto(clamped / 100, trackR)[1]}
          r={4}
          fill={statusMeta.principal}
          stroke="#fff"
          strokeWidth={1.8}
          className="glow-pulse"
        />

        {/* ÚNICO elemento em movimento: o ponteiro (cor muda por zona) */}
        <g
          style={{
            transformBox: "view-box",
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${angle}deg)`,
          }}
        >
          {/* ponteiro nasce apontando para 0% (esquerda) e gira com o ângulo */}
          <line x1={cx} y1={cy} x2={cx - needleLen * 0.82} y2={cy} stroke="#0f172a" strokeWidth={3.2} strokeLinecap="round" />
          <line x1={cx} y1={cy} x2={cx - needleLen * 0.42} y2={cy} stroke={corPonteiro} strokeWidth={1.8} strokeLinecap="round" />
          <circle cx={cx - needleLen} cy={cy} r={5} fill={corPonteiro} stroke="#fff" strokeWidth={1.8} />
        </g>

        {/* Hub */}
        <circle cx={cx} cy={cy} r={9} fill="none" stroke={statusMeta.principal} strokeWidth={2} className="glow-pulse" />
        <circle cx={cx} cy={cy} r={7.2} fill="#0f172a" />
        <circle cx={cx} cy={cy} r={2.6} fill={statusMeta.claro} />

        {/* Valor FIXO da meta real */}
        <text
          x={cx}
          y={cy - trackR * 0.55}
          textAnchor="middle"
          fontSize={inner * 0.13}
          fontWeight={800}
          fill={statusMeta.principal}
          style={{ filter: `drop-shadow(0 0 4px ${statusMeta.principal}55)` }}
        >
          {metaPct}%
        </text>
        <text
          x={cx}
          y={cy - trackR * 0.55 + inner * 0.055}
          textAnchor="middle"
          fontSize={inner * 0.048}
          fill={statusMeta.texto}
          fontWeight={700}
        >
          Real: {label}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-widest"
          style={{ background: statusMeta.softBg, borderColor: statusMeta.softBorda, color: statusMeta.texto }}
        >
          <span className="inline-block h-2 w-2 rounded-full animate-pulse-soft" style={{ background: statusMeta.principal }} />
          {statusMeta.rotulo}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">
          {paused
            ? "Pausado"
            : phase === "accel"
              ? "Ponteiro indo até a meta"
              : "Ponteiro na meta · Clique para testar"}
        </span>
      </div>
    </div>
  );
}

// ══ Sparkline ═══════════════════════════════════════════════════════════════
export function Sparkline({
  values,
  width = 78,
  height = 22,
  color = "#1a56c5",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length === 0) return <span className="text-slate-300 text-[10px]">—</span>;
  if (values.length === 1) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <circle cx={width / 2} cy={height / 2} r={3} fill={color} className="svg-pop" />
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const px = (i: number) => (i * (width - 4)) / (values.length - 1) + 2;
  const py = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const pts = values.map((v, i) => `${px(i)},${py(v)}`).join(" ");
  const area = `M ${px(0)},${height} L ${pts.replace(/ /g, " L ")} L ${px(values.length - 1)},${height} Z`;
  const cor = color;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block align-middle">
      <path d={area} fill={cor} opacity={0.12} className="svg-fade" />
      <polyline points={pts} fill="none" stroke={cor} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round"
        className="svg-fade" style={{ animationDelay: "60ms" }} />
      <circle cx={px(values.length - 1)} cy={py(values[values.length - 1])} r={2.4} fill={cor}
        className="svg-pop" style={{ animationDelay: "240ms" }} />
    </svg>
  );
}

// ══ Calendário — células em onda, zoom no hover, dia de pico pulsando ═══════
export function CalendarHeatmap({
  dias,
  colunas = 7,
}: {
  dias: { data: string; valor: number }[];
  colunas?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  if (dias.length === 0) {
    return <div className="flex h-[120px] items-center justify-center text-[11px] text-slate-400">Sem lançamentos no período</div>;
  }
  const max = Math.max(...dias.map((d) => d.valor), 1);
  const cell = 30;
  const gap = 5;
  const linhas = Math.ceil(dias.length / colunas);
  const W = colunas * (cell + gap);
  const H = linhas * (cell + gap) + 18;
  const item = hover ? dias.find((d) => d.data === hover) : null;
  const idxPico = dias.reduce((b, d, i) => (d.valor > dias[b].valor ? i : b), 0);

  const cor = (v: number) => {
    const f = v / max;
    if (f === 0) return "#e2e8f0";
    if (f < 0.25) return "#bfdbfe";
    if (f < 0.5) return "#7dabf0";
    if (f < 0.75) return "#3b7ddd";
    return "#0d3b96";
  };

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 170 }}>
        {dias.map((d, i) => {
          const col = i % colunas;
          const row = Math.floor(i / colunas);
          const [, , dia] = d.data.split("-");
          const ativo = hover === d.data;
          const cxp = col * (cell + gap) + cell / 2;
          const cyp = row * (cell + gap) + cell / 2;
          // onda diagonal: atraso combina linha + coluna
          const delay = (col + row) * 70;
          return (
            <g key={d.data} onMouseEnter={() => setHover(d.data)} onMouseLeave={() => setHover(null)}
              className="svg-pop cursor-pointer" style={{ animationDelay: `${delay}ms` }}>
              {/* halo pulsante no dia de pico */}
              {i === idxPico && d.valor > 0 && (
                <circle cx={cxp} cy={cyp} r={cell / 2} fill="none" stroke="#1a56c5"
                  className="ripple-ring" style={{ animationDelay: `${delay + 700}ms` }} />
              )}
              {/* camada de movimento contínuo (não interfere no zoom do hover) */}
              <g
                className={d.valor > 0 ? "bob" : undefined}
                style={d.valor > 0 ? { animationDelay: `${delay + 900}ms`, animationDuration: `${2600 + (i % 4) * 420}ms` } : undefined}
              >
                <rect
                  x={col * (cell + gap)} y={row * (cell + gap)} width={cell} height={cell} rx={7}
                  fill={cor(d.valor)}
                  stroke={ativo ? "#0f172a" : "transparent"} strokeWidth={1.8}
                  className="cell-zoom"
                >
                  <title>{`${fmtData(d.data)}: ${fmtBRL(d.valor)}`}</title>
                </rect>
                <text x={cxp} y={cyp + 3.5} textAnchor="middle" fontSize={10} fontWeight={700}
                  fill={d.valor / max > 0.45 ? "#fff" : "#334155"} pointerEvents="none">
                  {dia}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 svg-fade"
        style={{ animationDelay: `${(colunas + linhas) * 70 + 160}ms` }}>
        <span className={item ? "font-semibold text-slate-700 animate-fade-in" : ""}>
          {item ? `${fmtData(item.data)} · ${fmtBRL(item.valor)}` : "Passe o mouse sobre um dia"}
        </span>
        <span className="flex items-center gap-1">
          Menos
          {["#e2e8f0", "#bfdbfe", "#7dabf0", "#3b7ddd", "#0d3b96"].map((c, i) => (
            <span key={c} className="inline-block h-2.5 w-2.5 rounded-sm rise-in"
              style={{ background: c, animationDelay: `${(colunas + linhas) * 70 + 200 + i * 60}ms` }} />
          ))}
          Mais
        </span>
      </div>
    </div>
  );
}

// ══ Barra empilhada ═════════════════════════════════════════════════════════
export function StackedBar({
  segments,
  height = 18,
}: {
  segments: { label: string; value: number; color: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return <div className="h-[18px] w-full rounded-full bg-slate-200" />;
  return (
    <div className="flex w-full overflow-hidden rounded-full" style={{ height }}>
      {segments.filter((s) => s.value > 0).map((s, i) => (
        <div
          key={s.label}
          className="relative overflow-hidden bar-fill transition-all hover:brightness-110"
          style={{ width: `${(s.value / total) * 100}%`, background: s.color, animationDelay: `${i * 120}ms` }}
          title={`${s.label}: ${fmtBRL(s.value)} (${fmtPct((s.value / total) * 100, 1)})`}
        >
          <span className="absolute inset-0 shimmer-bar" style={{ animationDelay: `${i * 300}ms` }} />
        </div>
      ))}
    </div>
  );
}
