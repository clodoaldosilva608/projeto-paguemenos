import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { X, Save, Loader2, AlertCircle } from "lucide-react";
import { crudCreate, crudUpdate } from "@/lib/admin/crud.functions";

export interface FormField {
  key: string;
  label: string;
  type: "text" | "email" | "password" | "number" | "select" | "checkbox" | "date" | "textarea" | "json";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  help?: string;
  min?: number;
  max?: number;
  step?: number;
  // Validador Zod opcional (string com mensagem de erro)
  validate?: (value: any) => string | null;
}

interface FormDrawerProps {
  table: string;
  fields: FormField[];
  open: boolean;
  onClose: () => void;
  editRow?: any | null; // se fornecido, modo edição
  onSuccess?: () => void;
  title?: string;
}

export default function FormDrawer({
  table,
  fields,
  open,
  onClose,
  editRow,
  onSuccess,
  title,
}: FormDrawerProps) {
  const fnCreate = useServerFn(crudCreate);
  const fnUpdate = useServerFn(crudUpdate);

  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const initial: Record<string, any> = {};
      for (const f of fields) {
        if (editRow) {
          initial[f.key] = editRow[f.key] ?? f.defaultValue ?? (f.type === "checkbox" ? false : "");
        } else {
          initial[f.key] = f.defaultValue ?? (f.type === "checkbox" ? false : "");
        }
      }
      setValues(initial);
      setErrors({});
    }
  }, [open, editRow, fields]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const val = values[f.key];
      if (f.required && (val === undefined || val === null || val === "")) {
        errs[f.key] = `${f.label} é obrigatório.`;
        continue;
      }
      if (f.validate) {
        const err = f.validate(val);
        if (err) errs[f.key] = err;
      }
      if (f.type === "email" && val) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errs[f.key] = "E-mail inválido.";
        }
      }
      if (f.type === "number" && val !== "" && val !== undefined) {
        const num = Number(val);
        if (isNaN(num)) errs[f.key] = "Deve ser um número.";
        if (f.min !== undefined && num < f.min) errs[f.key] = `Mínimo: ${f.min}`;
        if (f.max !== undefined && num > f.max) errs[f.key] = `Máximo: ${f.max}`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      toast.error("Corrija os erros antes de salvar.");
      return;
    }
    setSaving(true);
    try {
      // Limpar valores vazios (converter "" para null)
      const payload: Record<string, any> = {};
      for (const f of fields) {
        const val = values[f.key];
        if (val === "" || val === undefined) {
          payload[f.key] = null;
        } else if (f.type === "number") {
          payload[f.key] = Number(val);
        } else if (f.type === "checkbox") {
          payload[f.key] = Boolean(val);
        } else if (f.type === "json") {
          try {
            payload[f.key] = typeof val === "string" ? JSON.parse(val) : val;
          } catch {
            payload[f.key] = val;
          }
        } else {
          payload[f.key] = val;
        }
      }

      if (editRow) {
        await fnUpdate({ data: { table, id: editRow.id, data: payload } });
        toast.success("Registro atualizado com sucesso!");
      } else {
        await fnCreate({ data: { table, data: payload } });
        toast.success("Registro criado com sucesso!");
      }
      onSuccess?.();
      onClose();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const drawerTitle = title || (editRow ? "Editar" : "Criar Novo");

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white dark:border-white/10">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
                {drawerTitle}
              </h3>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-lg p-1.5 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — form scrollável */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {fields.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === "select" ? (
                      <select
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-100 ${
                          errors[f.key] ? "border-red-400" : "border-slate-200 dark:border-white/10"
                        }`}
                      >
                        <option value="">Selecione...</option>
                        {f.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "checkbox" ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(values[f.key])}
                          onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.checked }))}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-slate-700 dark:text-slate-200">{f.help || "Sim"}</span>
                      </label>
                    ) : f.type === "textarea" ? (
                      <textarea
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        rows={4}
                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-100 ${
                          errors[f.key] ? "border-red-400" : "border-slate-200 dark:border-white/10"
                        }`}
                      />
                    ) : f.type === "json" ? (
                      <textarea
                        value={typeof values[f.key] === "object" ? JSON.stringify(values[f.key], null, 2) : values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder='{"key": "value"}'
                        rows={6}
                        className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs dark:bg-slate-800 dark:text-slate-100 ${
                          errors[f.key] ? "border-red-400" : "border-slate-200 dark:border-white/10"
                        }`}
                      />
                    ) : (
                      <input
                        type={f.type}
                        value={values[f.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-100 ${
                          errors[f.key] ? "border-red-400" : "border-slate-200 dark:border-white/10"
                        }`}
                      />
                    )}
                    {f.help && f.type !== "checkbox" && (
                      <p className="mt-1 text-[10px] text-slate-400">{f.help}</p>
                    )}
                    {errors[f.key] && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-red-500">
                        <AlertCircle className="h-3 w-3" /> {errors[f.key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 dark:border-white/10">
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editRow ? "Salvar" : "Criar"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
