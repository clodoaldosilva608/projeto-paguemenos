/**
 * HeroSection — seção hero com fundo 3D de partículas, logo, título animado e CTAs
 * Baseado no Guia Técnico de Refatoração
 */

import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { LogIn, Tv } from "lucide-react";
import ParticleBackground from "./ParticleBackground";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.33, 1, 0.68, 1] as const } },
};

const buttonVariants = {
  hover: { scale: 1.05, boxShadow: "0px 0px 20px rgba(0, 255, 255, 0.4)" },
  tap: { scale: 0.95 },
};

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent text-white">
      {/* Fundo 3D de partículas — desativado; o KineticGrid agora é o fundo
          global da landing page (declarado em LandingPage.tsx). */}
      {/* <ParticleBackground /> */}

      {/* Glow radial de fundo */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(0,180,255,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Conteúdo */}
      <motion.div
        className="relative z-10 mx-auto max-w-4xl p-4 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.img
          src="/assets/images/orion_logo.png"
          alt="ORION Logo"
          className="mx-auto mb-6 h-24 w-auto drop-shadow-[0_0_20px_rgba(0,255,255,0.3)]"
          variants={itemVariants}
        />

        {/* Título */}
        <motion.h1
          className="mb-4 text-4xl font-extrabold leading-tight tracking-wide sm:text-6xl"
          variants={itemVariants}
        >
          ORION: Gestão <span className="text-cyan-400">Inteligente</span> para Vendas
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          className="mx-auto mb-8 max-w-2xl text-base text-gray-300 sm:text-xl"
          variants={itemVariants}
        >
          Centralize vendas, metas, campanhas, equipes e relatórios com IA em uma única plataforma.
          Acompanhe o desempenho do seu time em tempo real, em qualquer dispositivo.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-wrap justify-center gap-4"
          variants={itemVariants}
        >
          <motion.button
            onClick={() => navigate({ to: "/auth" })}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-8 py-3 text-sm font-bold text-gray-900 shadow-lg transition-all duration-300 hover:bg-cyan-400 sm:text-lg"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <LogIn className="h-4 w-4" /> Entrar no Sistema
          </motion.button>

          <motion.button
            onClick={() => navigate({ to: "/tv" })}
            className="inline-flex items-center gap-2 rounded-full border-2 border-cyan-500 px-8 py-3 text-sm font-bold text-cyan-400 shadow-lg transition-all duration-300 hover:bg-cyan-500 hover:text-gray-900 sm:text-lg"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Tv className="h-4 w-4" /> Painel em Tempo Real
          </motion.button>
        </motion.div>

        {/* Access hint */}
        <motion.p
          className="mt-4 text-xs text-gray-500"
          variants={itemVariants}
        >
          Acesso para admin · gerente · supervisor · vendedor
        </motion.p>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-cyan-400/60"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  );
}
