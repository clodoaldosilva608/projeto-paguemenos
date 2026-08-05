/**
 * PageTransitionWrapper — transição de página com clipPath (efeito "fechar para o centro")
 * Baseado no Guia Técnico de Refatoração
 * Adaptado para TanStack Router (usa useRouterState em vez de useLocation)
 */

import { AnimatePresence, motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

const variants = {
  initial: {
    opacity: 0,
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
  },
  enter: {
    opacity: 1,
    clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
    transition: { duration: 0.5, ease: [0.33, 1, 0.68, 1] as const, delay: 0.1 },
  },
  exit: {
    opacity: 0,
    clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)",
    transition: { duration: 0.35, ease: [0.65, 0, 0.35, 1] as const },
  },
};

export function PageTransitionWrapper({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageTransitionWrapper;
