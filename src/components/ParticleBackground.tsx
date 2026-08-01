/**
 * ParticleBackground — fundo 3D com partículas animadas (Three.js)
 * Baseado no Guia Técnico de Refatoração
 * Otimizado: desativa em mobile ou prefers-reduced-motion
 */

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm";

function Particles() {
  const ref = useRef<any>(null);
  const count = 3000;
  const sphere = useMemo(
    () => random.inSphere(new Float32Array(count * 3), { radius: 1.5 }),
    [count],
  );

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#00FFFF"
          size={0.005}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default function ParticleBackground() {
  // Desativar em mobile (performance) ou prefers-reduced-motion
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (isMobile || prefersReducedMotion) {
    // Fallback: gradiente estático para mobile
    return (
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,180,255,0.08) 0%, transparent 60%)",
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Suspense fallback={null}>
          <Particles />
        </Suspense>
      </Canvas>
    </div>
  );
}
