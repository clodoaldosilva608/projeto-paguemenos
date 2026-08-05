import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BrainCircuit,
  Activity,
  KeyRound,
  Server,
  Cpu,
  FileText,
  Sparkles,
  MessageSquare,
  ListChecks,
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Play,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  History,
  BookOpen,
} from "lucide-react";
import {
  obterIAConfig,
  salvarIAConfig,
  testarConexaoIA,
  validarChaveIA,
  testarChatIA,
  listarIALogs,
  exportarIALogs,
  listarPromptHistorico,
  obterIAPermissoes,
  PROVIDERS,
} from "@/lib/ia-config.functions";

type Aba = "config" | "teste" | "logs" | "docs" | "seguranca";

export default function IAConfigPage() {
  const { usuario } = useAuth();
  const [aba, setAba] = useState<Aba>("config");
  const [loading, setLoading] = useState(true);

  // Config state
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState<any>({
    provider: "lovable",
    model: "google/gemini-2.5-flash",
    base_url: "",
    provider_panel_url: "",
    api_key: "",
    system_prompt: "",
    assistant_prompt: "",
    tom: "profissional",
    nivel_detalhes: "medio",
    criatividade: "media",
    temperature: 0.7,
    idioma: "pt-BR",
  });
  const [showKey, setShowKey] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [testandoConexao, setTestandoConexao] = useState(false);
  const [validandoChave, setValidandoChave] = useState(false);
  const [permissoes, setPermissoes] = useState<any>(null);

  // Histórico
  const [historico, setHistorico] = useState<any[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  // Teste
  const [pergunta, setPergunta] = useState("");
  const [testeResultado, setTesteResultado] = useState<any>(null);
  const [testando, setTestando] = useState(false);

  // Logs
  const [logs, setLogs] = useState<any[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsBusca, setLogsBusca] = useState("");
  const [logsStatus, setLogsStatus] = useState<string>("");

  // Bind server fns
  const fnObterConfig = useServerFn(obterIAConfig);
  const fnSalvar = useServerFn(salvarIAConfig);
  const fnTestarConexao = useServerFn(testarConexaoIA);
  const fnValidarChave = useServerFn(validarChaveIA);
  const fnTestarChat = useServerFn(testarChatIA);
  const fnListarLogs = useServerFn(listarIALogs);
  const fnExportarLogs = useServerFn(exportarIALogs);
  const fnListarHistorico = useServerFn(listarPromptHistorico);
  const fnObterPerms = useServerFn(obterIAPermissoes);

  const reload = async () => {
    setLoading(true);
    try {
      // 🔒 Fase 5 (2026-08-05): capturar qual função específica falha
      let cfg: any, perms: any, hist: any;
      try {
        cfg = await fnObterConfig();
      } catch (e: any) {
        throw new Error("obterIAConfig falhou: " + e.message);
      }
      try {
        perms = await fnObterPerms();
      } catch (e: any) {
        throw new Error("obterIAPermissoes falhou: " + e.message);
      }
      try {
        hist = await fnListarHistorico();
      } catch (e: any) {
        throw new Error("listarPromptHistorico falhou: " + e.message);
      }

      const c = cfg.config;
      setConfig(c);
      setPermissoes(perms);
      setHistorico(hist.versoes || []);
      if (c) {
        setForm({
          provider: c.provider || "lovable",
          model: c.model || "google/gemini-2.5-flash",
          base_url: c.base_url || "",
          provider_panel_url: c.provider_panel_url || "",
          api_key: "",
          system_prompt: c.system_prompt || "",
          assistant_prompt: c.assistant_prompt || "",
          tom: c.tom || "profissional",
          nivel_detalhes: c.nivel_detalhes || "medio",
          criatividade: c.criatividade || "media",
          temperature: Number(c.temperature ?? 0.7),
          idioma: c.idioma || "pt-BR",
        });
      }
    } catch (e: any) {
      toast.error("ERRO_DEBUG_CARREGAR_CONFIG: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const carregarLogs = async () => {
    try {
      const r = await fnListarLogs({
        data: {
          limit: 100,
          offset: 0,
          busca: logsBusca || undefined,
          status: (logsStatus as any) || undefined,
        },
      });
      setLogs(r.logs);
      // Bug 2 fix: usar logs.length como fallback se total vier 0
      setLogsTotal(r.total && r.total > 0 ? r.total : (r.logs?.length || 0));
    } catch (e: any) {
      toast.error("Erro ao carregar logs: " + e.message);
    }
  };

  useEffect(() => {
    void reload();
  }, []);
  useEffect(() => {
    if (aba === "logs") void carregarLogs();
  }, [aba, logsBusca, logsStatus]);

  // Guard admin
  if (usuario?.perfil !== "admin") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        Acesso restrito ao administrador.
      </div>
    );
  }

  // ---- Handlers ----
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const r = await fnSalvar({ data: form });
      toast.success("Configuração salva com sucesso!");
      setConfig(r.config);
      void reload();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRestaurarPadrao = async () => {
    if (!confirm("Restaurar prompts para o padrão de fábrica? Esta ação é auditada.")) return;
    setSalvando(true);
    try {
      const r = await fnSalvar({ data: { ...form, restaurar_padrao: true } });
      toast.success("Prompts restaurados para o padrão.");
      void reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarConexao = async () => {
    setTestandoConexao(true);
    try {
      const r = await fnTestarConexao({ data: {} } as any);
      if (r.ok) {
        toast.success(`✅ Conexão realizada com sucesso! (${r.tempo_ms}ms)`);
      } else {
        // 🔒 DEBUG: mostrar detalhes completos do erro
        const debugInfo = (r as any).debug ? ` | debug: ${JSON.stringify((r as any).debug)}` : "";
        toast.error(`❌ Falha: ${r.erro}${debugInfo}`);
      }
      void reload();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setTestandoConexao(false);
    }
  };

  const handleValidarChave = async () => {
    if (!form.api_key || form.api_key.startsWith("•")) {
      toast.error("Digite uma chave nova (não mascarada) para validar.");
      return;
    }
    setValidandoChave(true);
    try {
      const r = await fnValidarChave({
        data: {
          provider: form.provider,
          api_key: form.api_key,
          base_url: form.base_url,
          model: form.model,
        },
      });
      if (r.ok) toast.success(r.mensagem);
      else toast.error("Chave inválida: " + r.erro);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setValidandoChave(false);
    }
  };

  const handleTestarChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pergunta.trim()) return;
    setTestando(true);
    setTesteResultado(null);
    try {
      const r = await fnTestarChat({ data: { pergunta } });
      setTesteResultado(r);
      if (r.ok) toast.success(`Resposta em ${r.tempo_ms}ms`);
      else toast.error("Erro: " + r.erro);
    } catch (e: any) {
      setTesteResultado({ ok: false, erro: e.message });
      toast.error("Erro: " + e.message);
    } finally {
      setTestando(false);
    }
  };

  const handleExportarLogs = async () => {
    try {
      const r = await fnExportarLogs({ data: {} } as any);
      const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-ia-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Logs exportados!");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const provInfo = PROVIDERS[form.provider as keyof typeof PROVIDERS] || PROVIDERS.lovable;

  return (
    <div className="space-y-6 pb-24">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-slate-900">
        {(
          [
            { id: "config", label: "Configuração", Icon: BrainCircuit },
            { id: "teste", label: "Teste da IA", Icon: MessageSquare },
            { id: "logs", label: "Logs", Icon: ListChecks },
            { id: "seguranca", label: "Segurança", Icon: Shield },
            { id: "docs", label: "Como configurar", Icon: BookOpen },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              aba === id
                ? "bg-blue-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando configuração...
        </div>
      )}

      {/* --------------------------- ABA: CONFIG --------------------------- */}
      {aba === "config" && !loading && (
        <motion.div
          key="config"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* CARD 1 — Status */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                  Card 1 — Status da IA
                </h2>
              </div>
              <button
                onClick={handleTestarConexao}
                disabled={testandoConexao}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {testandoConexao ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Testar Conexão
              </button>
            </header>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatBox
                label="Status da conexão"
                value={
                  <span
                    className={`inline-flex items-center gap-1.5 ${config?.status === "conectado" ? "text-emerald-600" : config?.status === "erro" ? "text-red-600" : "text-slate-500"}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${config?.status === "conectado" ? "bg-emerald-500" : config?.status === "erro" ? "bg-red-500" : "bg-slate-400"}`}
                    />
                    {config?.status === "conectado"
                      ? "🟢 Conectado"
                      : config?.status === "erro"
                        ? "🔴 Erro"
                        : "⚪ Desconectado"}
                  </span>
                }
              />
              <StatBox label="Modelo atual" value={config?.model || "—"} />
              <StatBox
                label="Última validação"
                value={
                  config?.last_validation
                    ? new Date(config.last_validation).toLocaleString("pt-BR")
                    : "Nunca"
                }
              />
              <StatBox
                label="Última atualização"
                value={
                  config?.atualizado_em
                    ? new Date(config.atualizado_em).toLocaleString("pt-BR")
                    : "—"
                }
              />
              <StatBox
                label="Último admin"
                value={config?.atualizado_por ? config.atualizado_por.slice(0, 8) + "…" : "—"}
              />
              <StatBox label="Provedor" value={provInfo?.label || config?.provider || "—"} />
            </div>
            {config?.last_error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                <strong>Último erro:</strong> {config.last_error}
              </div>
            )}
          </section>

          {/* CARD 3 — Provedor */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                Card 3 — Provedor
              </h2>
            </header>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Provedor">
                <select
                  value={form.provider}
                  onChange={(e) => {
                    const p = e.target.value as keyof typeof PROVIDERS;
                    const info = PROVIDERS[p];
                    setForm({
                      ...form,
                      provider: p,
                      model: info.models[0],
                      base_url: info.base_url,
                      provider_panel_url: info.panel_url,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  {Object.entries(PROVIDERS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="URL base do provedor">
                <input
                  type="text"
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder={provInfo.base_url}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
              <Field label="URL do painel do provedor">
                <input
                  type="text"
                  value={form.provider_panel_url}
                  onChange={(e) => setForm({ ...form, provider_panel_url: e.target.value })}
                  placeholder={provInfo.panel_url}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
              </Field>
            </div>
          </section>

          {/* CARD 4 — Modelo */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                Card 4 — Modelo
              </h2>
            </header>
            <Field label="Modelo">
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              >
                {provInfo.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {!(provInfo.models as readonly string[]).includes(form.model) && (
                  <option value={form.model}>{form.model} (atual)</option>
                )}
              </select>
            </Field>
          </section>

          {/* CARD 2 — Chave da API */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                Card 2 — Chave da API
              </h2>
            </header>
            {config?.api_key_ciphertext && (
              <p className="mb-2 text-xs text-slate-500">
                Chave atual cadastrada:{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                  {config.api_key_ciphertext}
                </code>
                <br />
                Deixe o campo abaixo vazio para manter a chave atual. Preencha apenas para trocar.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[280px]">
                <input
                  type={showKey ? "text" : "password"}
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  placeholder="sk-... ou AIza... (cole aqui)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={handleValidarChave}
                disabled={validandoChave}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5 disabled:opacity-50"
              >
                {validandoChave ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Validar
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              🔒 A chave é armazenada no banco e nunca exibida em texto puro após salvar.
            </p>
          </section>

          {/* CARD 5 — Prompt Mestre */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                  Card 5 — Prompt Mestre (System)
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMostrarHistorico(!mostrarHistorico)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <History className="h-3.5 w-3.5" /> Histórico ({historico.length})
                </button>
                <button
                  onClick={handleRestaurarPadrao}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                </button>
              </div>
            </header>
            <textarea
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Este prompt é enviado como system em TODAS as conversas da IA."
            />
            <p className="mt-1 text-xs text-slate-500">{form.system_prompt.length} caracteres</p>

            {mostrarHistorico && (
              <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-left uppercase tracking-wider text-slate-500 dark:bg-white/5">
                    <tr>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Observação</th>
                      <th className="px-3 py-2">System (preview)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((v) => (
                      <tr key={v.id} className="border-t border-slate-100 dark:border-white/5">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {new Date(v.criado_em).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {v.observacao || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-xs">
                          {(v.system_prompt || "").slice(0, 80)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* CARD 6 — Especialização */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                Card 6 — Especialização da IA
              </h2>
            </header>
            <textarea
              value={form.assistant_prompt}
              onChange={(e) => setForm({ ...form, assistant_prompt: e.target.value })}
              rows={10}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Define como a IA deve responder — personalidade, escopo e regras."
            />
            <p className="mt-1 text-xs text-slate-500">{form.assistant_prompt.length} caracteres</p>
          </section>

          {/* CARD 7 — Estilo das Respostas */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                Card 7 — Estilo das Respostas
              </h2>
            </header>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Tom">
                <select
                  value={form.tom}
                  onChange={(e) => setForm({ ...form, tom: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="profissional">Profissional</option>
                  <option value="farmaceutico">Farmacêutico</option>
                  <option value="consultivo">Consultivo</option>
                  <option value="empatico">Empático</option>
                  <option value="objetivo">Objetivo</option>
                  <option value="comercial">Comercial</option>
                  <option value="tecnico">Técnico</option>
                  <option value="humanizado">Humanizado</option>
                </select>
              </Field>
              <Field label="Nível de detalhes">
                <select
                  value={form.nivel_detalhes}
                  onChange={(e) => setForm({ ...form, nivel_detalhes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="baixo">Baixo (resumo)</option>
                  <option value="medio">Médio</option>
                  <option value="alto">Alto (completo)</option>
                </select>
              </Field>
              <Field label="Criatividade">
                <select
                  value={form.criatividade}
                  onChange={(e) => setForm({ ...form, criatividade: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="baixa">Baixa (preciso)</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta (criativo)</option>
                </select>
              </Field>
              <Field label={`Temperatura (${form.temperature.toFixed(1)})`}>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
                  className="w-full"
                />
              </Field>
              <Field label="Idioma padrão">
                <select
                  value={form.idioma}
                  onChange={(e) => setForm({ ...form, idioma: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                </select>
              </Field>
            </div>
          </section>

          {/* BOTÃO SALVAR */}
          <div className="sticky bottom-4 flex justify-end">
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-blue-500 disabled:opacity-50"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar configuração
            </button>
          </div>
        </motion.div>
      )}

      {/* --------------------------- ABA: TESTE --------------------------- */}
      {aba === "teste" && (
        <motion.div
          key="teste"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                Card 8 — Teste da IA
              </h2>
            </header>
            <form onSubmit={handleTestarChat} className="flex gap-2">
              <input
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder="Digite sua pergunta para a IA..."
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="submit"
                disabled={testando}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {testando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Enviar
              </button>
            </form>

            {testeResultado && (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-800">
                  <p className="text-xs font-semibold uppercase text-slate-500">Pergunta</p>
                  <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{pergunta}</p>
                </div>
                {testeResultado.ok ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resposta
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                      {testeResultado.resposta}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-red-700 dark:text-red-400">
                      <XCircle className="h-3.5 w-3.5" /> Erro
                    </div>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      {testeResultado.erro}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <StatBox label="Tempo" value={`${testeResultado.tempo_ms ?? 0} ms`} />
                  <StatBox label="Modelo" value={testeResultado.modelo || "—"} />
                  <StatBox label="Status" value={testeResultado.ok ? "✅ OK" : "❌ Erro"} />
                </div>
              </div>
            )}
          </section>
        </motion.div>
      )}

      {/* --------------------------- ABA: LOGS --------------------------- */}
      {aba === "logs" && (
        <motion.div
          key="logs"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-600" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                  Card 9 — Logs ({logsTotal})
                </h2>
              </div>
              <button
                onClick={handleExportarLogs}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
              >
                <Download className="h-3.5 w-3.5" /> Exportar CSV
              </button>
            </header>

            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  value={logsBusca}
                  onChange={(e) => setLogsBusca(e.target.value)}
                  placeholder="Buscar por pergunta, resposta ou usuário..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <select
                value={logsStatus}
                onChange={(e) => setLogsStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Todos status</option>
                <option value="ok">✅ OK</option>
                <option value="erro">❌ Erro</option>
                <option value="timeout">⏱ Timeout</option>
                <option value="rate_limit">⚠ Rate limit</option>
              </select>
            </div>

            <div className="max-h-[600px] overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left uppercase tracking-wider text-slate-500 dark:bg-white/5">
                  <tr>
                    <th className="px-3 py-2">
                      <Clock className="h-3 w-3 inline" /> Data/Hora
                    </th>
                    <th className="px-3 py-2">
                      <User className="h-3 w-3 inline" /> Usuário
                    </th>
                    <th className="px-3 py-2">Pergunta</th>
                    <th className="px-3 py-2">Resposta</th>
                    <th className="px-3 py-2">Tempo</th>
                    <th className="px-3 py-2">Modelo</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500">
                        Nenhum log encontrado.
                      </td>
                    </tr>
                  )}
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100 dark:border-white/5">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {new Date(l.criado_em).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {l.user_email || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200 max-w-xs truncate">
                        {l.pergunta}
                      </td>
                      <td className="px-3 py-2 text-slate-500 max-w-xs truncate">
                        {l.resposta || l.erro || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {l.tempo_ms ? `${l.tempo_ms}ms` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                        {l.modelo || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            l.status === "ok"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : l.status === "erro"
                                ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </motion.div>
      )}

      {/* --------------------------- ABA: SEGURANÇA --------------------------- */}
      {aba === "seguranca" && (
        <motion.div
          key="seguranca"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                Card 10 — Segurança
              </h2>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                <p className="text-xs font-semibold uppercase text-slate-500">Quem pode editar</p>
                <p className="mt-1 text-sm">
                  {permissoes?.perfis_editores?.map((p: string) => p.toUpperCase()).join(", ") ||
                    "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Quem pode visualizar
                </p>
                <p className="mt-1 text-sm">
                  {permissoes?.perfis_visualizadores
                    ?.map((p: string) => p.toUpperCase())
                    .join(", ") || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                  Auditoria
                </p>
                <p className="mt-1 text-sm">
                  ✅ Todas as alterações são registradas em <code>audit_log</code> com antes/depois,
                  usuário e timestamp.
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                  Mascaramento da chave
                </p>
                <p className="mt-1 text-sm">
                  🔒 A chave da API nunca aparece em texto puro — sempre mascarada com{" "}
                  <code>••••••••últimos4</code>.
                </p>
              </div>
            </div>
          </section>
        </motion.div>
      )}

      {/* --------------------------- ABA: DOCUMENTAÇÃO --------------------------- */}
      {aba === "docs" && (
        <motion.div
          key="docs"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <header className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-white">
                📚 Como configurar a IA
              </h2>
            </header>

            <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
              <Step n={1}>
                Escolha o provedor (Card 3 — OpenAI, Google, Anthropic, Azure ou OpenRouter).
              </Step>
              <Step n={2}>Acesse o painel oficial do provedor e crie uma API Key.</Step>
              <Step n={3}>Copie a chave gerada.</Step>
              <Step n={4}>Cole no campo "Chave da API" (Card 2).</Step>
              <Step n={5}>
                Clique em <strong>Validar</strong> — se inválida, corrija antes de salvar.
              </Step>
              <Step n={6}>
                Clique em <strong>Salvar configuração</strong>.
              </Step>
              <Step n={7}>
                Clique em <strong>Testar Conexão</strong> no Card 1.
              </Step>
              <Step n={8}>
                Vá até a aba <strong>Teste da IA</strong> e faça uma pergunta para confirmar.
              </Step>
            </ol>

            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-xs font-semibold uppercase text-blue-700 dark:text-blue-400">
                Acessar painel do provedor selecionado
              </p>
              <p className="mt-1 text-sm">
                Provedor atual: <strong>{provInfo.label}</strong>
              </p>
              <a
                href={provInfo.panel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Acessar Painel do Provedor
              </a>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <h3 className="col-span-full text-xs font-bold uppercase text-slate-500">
                Todos os painéis disponíveis:
              </h3>
              {Object.entries(PROVIDERS).map(([k, v]) => (
                <a
                  key={k}
                  href={v.panel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 ${
                    k === form.provider
                      ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                      : "border-slate-200 dark:border-white/10"
                  }`}
                >
                  <span>{v.label}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </a>
              ))}
            </div>
          </section>
        </motion.div>
      )}
    </div>
  );
}

// ---- Sub-componentes ----
function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
// BUILD_MARKER_1785894508
// FORÇAR NOVO BUILD 1785896216
