import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { useTema } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { Upload, Check, Building2, Palette, ArrowRight, X } from "lucide-react";

export const Route = (createFileRoute as any)("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const { branding, atualizarBranding } = useTema();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    appName: branding.appName || "ORION",
    companyName: branding.companyName || "",
    primaryColor: branding.primaryColor || "#1B4F8C",
    secondaryColor: branding.secondaryColor || "#D64541",
    logoUrl: branding.logoUrl || "",
  });

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas arquivos de imagem são aceitos.");
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error("A imagem deve ter no máximo 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm({ ...form, logoUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  }

  function finalizar() {
    atualizarBranding({
      appName: form.appName,
      companyName: form.companyName,
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      logoUrl: form.logoUrl || null,
    });
    toast.success("Configuração salva! Sua aplicação foi personalizada.");
    navigate({ to: "/" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-900 p-4">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="h-full w-full" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.3) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl text-white">Configuração Inicial</h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Personalize sua plataforma em 3 passos</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? "w-8 bg-blue-500" : s < step ? "w-8 bg-emerald-500" : "w-8 bg-slate-700"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          {/* Step 1: Empresa */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Dados da Empresa</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Nome da Aplicação *</label>
                  <input
                    type="text"
                    value={form.appName}
                    onChange={(e) => setForm({ ...form, appName: e.target.value })}
                    placeholder="Ex: ORION, Minha Farmácia, etc."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Nome da Empresa</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="Ex: Pague Menos, Farmácia Santa Clara, etc."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Cores */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-4 flex items-center gap-2">
                <Palette className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Cores da Marca</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Cor Primária</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="h-12 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.primaryColor}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Cor Secundária</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="h-12 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={form.secondaryColor}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono text-white"
                    />
                  </div>
                </div>
                {/* Preview */}
                <div className="rounded-lg border border-white/10 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Pré-visualização</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className="h-5 w-5">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-white">{form.appName || "ORION"}</p>
                      {form.companyName && <p className="text-xs text-slate-400 dark:text-slate-500">{form.companyName}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">
                    Voltar
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500"
                  >
                    Próximo <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Logo */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Logo da Empresa</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Upload do Logo (opcional)</label>
                  {form.logoUrl ? (
                    <div className="relative flex h-32 items-center justify-center rounded-lg border-2 border-emerald-300 bg-emerald-50/10">
                      <img src={form.logoUrl} alt="Logo" className="max-h-28 max-w-full object-contain" />
                      <button
                        onClick={() => setForm({ ...form, logoUrl: "" })}
                        className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 hover:border-blue-400 hover:bg-blue-500/5">
                      <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs text-slate-400 dark:text-slate-500">Clique para enviar (PNG, JPG, SVG · máx 500KB)</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">
                    Voltar
                  </button>
                  <button
                    onClick={finalizar}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-500"
                  >
                    <Check className="h-4 w-4" /> Finalizar Configuração
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Estas configurações podem ser alteradas depois em Configurações → Aparência
        </p>
      </motion.div>
    </div>
  );
}
