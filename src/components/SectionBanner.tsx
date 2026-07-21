import type { ReactNode } from "react";
import { cn } from "../utils/cn";

interface SectionBannerProps {
  children: ReactNode;
  tom?: "navy" | "red" | "purple" | "slate";
  className?: string;
}

export default function SectionBanner({ children, tom = "navy", className }: SectionBannerProps) {
  const bg: Record<string, string> = {
    navy: "bg-[var(--pm-navy)]",
    red: "bg-[var(--pm-red)]",
    purple: "bg-[var(--pm-purple)]",
    slate: "bg-slate-800",
  };
  return (
    <div className={cn("inline-flex items-center rounded-md px-4 py-2 shadow-md", bg[tom], className)}>
      <span className="font-cond text-sm uppercase tracking-[0.2em] text-white sm:text-base">
        {children}
      </span>
    </div>
  );
}
