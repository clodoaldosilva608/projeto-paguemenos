/**
 * CosmicOrb — animação de fundo "Cosmic Orb" para a Landing Page
 * Usa CSS keyframes + gradientes radiais para criar efeito de orb cósmico
 * Sem dependências externas (Three.js não necessário para esta versão otimizada)
 */

export function CosmicOrb() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Orb principal — gradiente radial pulsante */}
      <div
        className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(0,180,255,0.3) 0%, rgba(10,61,138,0.1) 40%, transparent 70%)",
          animation: "orb-pulse 8s ease-in-out infinite",
        }}
      />
      {/* Orb secundário — menor, offset */}
      <div
        className="absolute right-1/4 top-1/3 h-[300px] w-[300px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(100,200,255,0.2) 0%, transparent 70%)",
          animation: "orb-pulse 6s ease-in-out infinite 1s",
        }}
      />
      {/* Orb terciário — ainda menor, outro offset */}
      <div
        className="absolute left-1/4 bottom-1/4 h-[250px] w-[250px] rounded-full opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(0,255,200,0.15) 0%, transparent 70%)",
          animation: "orb-pulse 7s ease-in-out infinite 2s",
        }}
      />
      {/* Partículas — pontos pequenos flutuando */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-cyan-300/30"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `particle-float ${5 + Math.random() * 10}s linear infinite ${Math.random() * 5}s`,
          }}
        />
      ))}
      {/* Linhas de circuito sutis */}
      <svg className="absolute inset-0 h-full w-full opacity-10" preserveAspectRatio="none">
        <defs>
          <linearGradient id="circuit-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#00BFFF" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }).map((_, i) => (
          <line
            key={i}
            x1="0%"
            y1={`${20 + i * 15}%`}
            x2="100%"
            y2={`${30 + i * 12}%`}
            stroke="url(#circuit-line)"
            strokeWidth="1"
            style={{ animation: `circuit-dash ${3 + i}s linear infinite` }}
          />
        ))}
      </svg>

      <style>{`
        @keyframes orb-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.6; }
        }
        @keyframes particle-float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
        }
        @keyframes circuit-dash {
          0% { stroke-dashoffset: 1000; stroke-dasharray: 1000; }
          100% { stroke-dashoffset: 0; stroke-dasharray: 1000; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pointer-events-none > div { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default CosmicOrb;
