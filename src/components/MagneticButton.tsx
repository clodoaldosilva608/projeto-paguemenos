/**
 * MagneticButton — botão com efeito magnético (segue o cursor)
 * e GlitchText — texto com efeito glitch intermitente
 */

import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  href?: string;
}

export function MagneticButton({ children, onClick, className = "", href }: MagneticButtonProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLButtonElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { width, height, left, top } = ref.current.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    setPos({ x: x * 0.15, y: y * 0.15 });
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
    </motion.button>
  );
}

interface GlitchTextProps {
  text: string;
  className?: string;
}

export function GlitchText({ text, className = "" }: GlitchTextProps) {
  return (
    <motion.span
      animate={{
        x: [0, -2, 2, -2, 2, 0],
        y: [0, 1, -1, 1, -1, 0],
        opacity: [1, 0.85, 1, 0.85, 1, 1],
      }}
      transition={{
        duration: 0.4,
        repeat: Infinity,
        repeatDelay: 4,
        ease: "linear",
      }}
      className={`inline-block ${className}`}
    >
      {text}
    </motion.span>
  );
}
