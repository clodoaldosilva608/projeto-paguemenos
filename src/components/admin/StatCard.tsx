import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string; // hex
  sub?: string;
  delay?: number;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = "#1565C0",
  sub,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"
    >
      <div
        className="absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl"
        style={{ background: `${color}33` }}
      />
      <div className="relative flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ background: `${color}1a`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="font-num text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
          {sub && <p className="truncate text-[10px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}
