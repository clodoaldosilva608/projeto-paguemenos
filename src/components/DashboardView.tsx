import { motion } from "framer-motion";
import { filial, categorias, colaboradores, mediaDiaria } from "../data/mockData";
import FilialHeader from "./FilialHeader";
import SectionBanner from "./SectionBanner";
import MotivationalFooter from "./MotivationalFooter";
import CountUp from "./CountUp";
import { brlMoeda, numero } from "../utils/format";

const KpiCard = ({
  label,
  value,
  highlight,
  delay,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="group relative overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-[#eef2fb] to-[#e2e8f6] p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:from-slate-800 dark:to-slate-900"
  >
    <div className="absolute right-0 top-0 h-full w-1 bg-[var(--pm-navy)] transition-all group-hover:w-1.5 dark:bg-blue-400" />
    <p className="font-cond text-[11px] uppercase tracking-[0.2em] text-[var(--pm-navy)] dark:text-blue-300">
      {label}
    </p>
    <p
      className={`font-num mt-2 text-xl font-bold sm:text-2xl ${
        highlight
          ? "text-[var(--pm-green)] dark:text-emerald-400"
          : "text-[var(--pm-navy)] dark:text-slate-100"
      }`}
    >
      {value}
    </p>
  </motion.div>
);

export default function DashboardView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <FilialHeader />

      {/* Live ticker */}
      <div className="flex items-center gap-3 overflow-hidden rounded-md border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <span className="flex flex-shrink-0 items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--pm-red)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--pm-red)]" />
          </span>
          <span className="font-cond text-[10px] uppercase tracking-[0.25em] text-[var(--pm-red)] dark:text-red-400">
            Ao vivo
          </span>
        </span>
        <div className="flex-1 overflow-hidden">
          <motion.div
            className="flex gap-8 whitespace-nowrap font-num text-xs text-slate-600 dark:text-slate-300"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            {[
              "ALÍCIA lidera faturamento com 47,68%",
              "TKM Filial R$ 88,69",
              "Genéricos em atenção: 35,93%",
              "ME dentro da meta: 39,19%",
              "Projeção R$ 775.999,75",
              "3.387 clientes no período",
              "FÁBIO em 3º com R$ 74.410,00",
            ]
              .concat([
                "ALÍCIA lidera faturamento com 47,68%",
                "TKM Filial R$ 88,69",
                "Genéricos em atenção: 35,93%",
                "ME dentro da meta: 39,19%",
                "Projeção R$ 775.999,75",
                "3.387 clientes no período",
                "FÁBIO em 3º com R$ 74.410,00",
              ])
              .map((t, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="text-[var(--pm-navy)] dark:text-blue-400">▸</span>
                  {t}
                </span>
              ))}
          </motion.div>
        </div>
      </div>

      {/* META GERAL DA FILIAL */}
      <div className="space-y-4">
        <SectionBanner tom="navy">Meta Geral da Filial</SectionBanner>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Meta Mensal"
            highlight
            delay={0.05}
            value={<CountUp value={filial.metaMensal} prefix="R$ " />}
          />
          <KpiCard
            label="Meta Diária"
            highlight
            delay={0.1}
            value={<CountUp value={filial.metaDiaria} prefix="R$ " />}
          />
          <KpiCard
            label="Clientes / Mês"
            delay={0.15}
            value={<CountUp value={filial.clientesMes} digits={0} separator />}
          />
          <KpiCard
            label="TKM"
            delay={0.2}
            value={<CountUp value={filial.tkm} prefix="R$ " />}
          />
          <KpiCard
            label="UVC"
            delay={0.25}
            value={<CountUp value={filial.uvc} digits={2} separator={false} />}
          />
        </div>
      </div>

      {/* CATEGORIAS (banners) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {categorias.map((c, i) => {
          const tomBg =
            c.tom === "red"
              ? "bg-[var(--pm-red)] dark:bg-red-700"
              : "bg-[var(--pm-navy)] dark:bg-blue-900";
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className={`group relative overflow-hidden rounded-md px-5 py-4 text-white shadow-md ${tomBg}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition group-hover:opacity-100" />
              <p className="font-cond text-xs uppercase tracking-[0.2em] opacity-90 sm:text-sm">
                {c.nome}
              </p>
              <div className="mt-1.5 flex items-baseline gap-3">
                <span className="font-num text-lg font-bold sm:text-xl">
                  {brlMoeda(c.mensal)}
                </span>
                <span className="text-white/60">|</span>
                <span className="font-num text-xs text-white/80 sm:text-sm">
                  Dia: {brlMoeda(c.diaria)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* METAS POR COLABORADOR */}
      <div className="space-y-4">
        <SectionBanner tom="purple">Metas por Colaborador</SectionBanner>

        <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="bg-[var(--pm-navy)] text-white dark:bg-blue-900">
                  {[
                    "Colaborador",
                    "Meta Mensal",
                    "Meta Diária",
                    "Genéricos Mensal",
                    "Genéricos Diária",
                    "SD Mensal",
                    "SD Diária",
                    "Marcas Exclusivas",
                    "ME Diária",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-3 font-cond text-[10px] uppercase tracking-wider sm:text-xs ${
                        i === 0 ? "text-left" : "text-center"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c, idx) => {
                  const isFerias = c.ferias;
                  return (
                    <tr
                      key={c.nome}
                      className={`border-t border-slate-100 transition dark:border-slate-800 ${
                        idx % 2 === 0
                          ? "bg-white dark:bg-slate-900"
                          : "bg-slate-50/60 dark:bg-slate-800/50"
                      } hover:bg-blue-50/60 dark:hover:bg-blue-900/20`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                              isFerias
                                ? "bg-slate-400"
                                : "bg-gradient-to-br from-[var(--pm-navy)] to-[var(--pm-purple)]"
                            }`}
                          >
                            {c.iniciais}
                          </span>
                          <span className="font-cond text-xs uppercase tracking-wide text-[var(--pm-navy)] dark:text-blue-300">
                            {c.nome}
                          </span>
                        </div>
                      </td>
                      {isFerias ? (
                        <td colSpan={8} className="px-3 py-3 text-center">
                          <span className="font-cond text-xs italic uppercase tracking-[0.3em] text-slate-400">
                            ⛱ Férias
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.mensal)}
                          </td>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.diaria)}
                          </td>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.genericosMensal)}
                          </td>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.genericosDiaria)}
                          </td>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.sdMensal)}
                          </td>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.sdDiaria)}
                          </td>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.meMensal)}
                          </td>
                          <td className="px-3 py-3 text-center font-num font-bold text-slate-800 dark:text-slate-100">
                            {brlMoeda(c.metas.meDiaria)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[var(--pm-navy)] bg-[#eef2fb] dark:border-blue-400 dark:bg-slate-800">
                  <td className="px-3 py-3">
                    <span className="font-cond text-xs uppercase tracking-wide text-[var(--pm-navy)] dark:text-blue-300">
                      Média Diária
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    —
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    {brlMoeda(mediaDiaria.metaDiaria)}
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    —
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    {brlMoeda(mediaDiaria.genericosDiaria)}
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    —
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    {brlMoeda(mediaDiaria.sdDiaria)}
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    —
                  </td>
                  <td className="px-3 py-3 text-center font-num font-bold text-[var(--pm-navy)] dark:text-blue-300">
                    {brlMoeda(mediaDiaria.meDiaria)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--pm-navy)]" /> Filial {filial.id}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--pm-red)]" /> Marcas Exclusivas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--pm-purple)]" /> Metas Individuais
          </span>
          <span className="ml-auto font-num">
            {numero(colaboradores.filter((c) => !c.ferias).length)} colaboradores ativos
          </span>
        </div>
      </div>

      <MotivationalFooter />
    </motion.div>
  );
}
