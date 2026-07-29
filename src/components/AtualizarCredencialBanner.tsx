import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  verificarCredencialPadrao,
  atualizarPropriaCredencial,
} from "@/lib/login-matricula.functions";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldAlert,
  X,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface ForcaSenha {
  score: number;
  label: string;
  cor: string;
}

function avaliarForcaSenha(s: string): ForcaSenha {
  let score = 0;
  if (s.length >= 8) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[a-z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  const map = [
    { label: "Muito fraca", cor: "bg-red-500" },
    { label: "Fraca", cor: "bg-orange-500" },
    { label: "Razoável", cor: "bg-yellow-500" },
    { label: "Boa", cor: "bg-lime-500" },
    { label: "Forte", cor: "bg-emerald-500" },
    { label: "Excelente", cor: "bg-emerald-600" },
  ];
  return { score, ...map[score] };
}

function validarSenha(s: string): string | null {
  if (!s) return null;
  if (s.length < 8) return "Mínimo de 8 caracteres.";
  if (!/[A-Z]/.test(s)) return "Deve conter ao menos 1 letra maiúscula.";
  if (!/\d/.test(s)) return "Deve conter ao menos 1 número.";
  if (!/[^A-Za-z0-9]/.test(s)) return "Deve conter ao menos 1 caractere especial.";
  return null;
}

export default function AtualizarCredencialBanner() {
  const { usuario } = useAuth();
  const fnVerificar = useServerFn(verificarCredencialPadrao);
  const fnAtualizar = useServerFn(atualizarPropriaCredencial);

  const [verificando, setVerificando] = useState(true);
  const [ehPadrao, setEhPadrao] = useState(false);
  const [primeiroNome, setPrimeiroNome] = useState<string | null>(null);
  const [matricula, setMatricula] = useState<string | null>(null);
  const [bannerDispensado, setBannerDispensado] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);

  // Form do modal
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [novoPrimeiroNome, setNovoPrimeiroNome] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Verificar se o usuário está usando credencial padrão
  const verificar = useCallback(async () => {
    if (!usuario) {
      setVerificando(false);
      return;
    }
    try {
      const r = await fnVerificar({ data: {} } as any);
      setEhPadrao(r.ehPadrao);
      setPrimeiroNome(r.primeiroNome);
      setMatricula(r.matricula);
      setNovoPrimeiroNome(r.primeiroNome || "");
    } catch (e) {
      // Se falhar (ex: admin sem credencial), silenciosamente não mostra banner
      console.warn("[credencial] erro ao verificar:", e);
    } finally {
      setVerificando(false);
    }
  }, [usuario, fnVerificar]);

  useEffect(() => {
    if (usuario) void verificar();
  }, [usuario, verificar]);

  // Não mostrar nada enquanto verifica ou se não for credencial padrão
  if (verificando || !ehPadrao || bannerDispensado) return null;

  const forca = avaliarForcaSenha(novaSenha);
  const erroSenha = validarSenha(novaSenha);
  const senhasBatem = novaSenha && novaSenha === confirmarSenha;
  const podeSalvar = !salvando && !!novaSenha && !erroSenha && senhasBatem;

  async function salvar() {
    if (!podeSalvar) {
      if (erroSenha) toast.error(erroSenha);
      else if (!senhasBatem) toast.error("As senhas não coincidem.");
      return;
    }
    setSalvando(true);
    try {
      await fnAtualizar({
        data: {
          novaSenha,
          primeiroNome: novoPrimeiroNome || undefined,
        },
      });
      toast.success("Credencial atualizada com sucesso! Use a nova senha no próximo login.");
      setEhPadrao(false);
      setModalAberto(false);
      setBannerDispensado(true);
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar credencial.");
    } finally {
      setSalvando(false);
    }
  }

  function fecharModal() {
    setModalAberto(false);
    setNovaSenha("");
    setConfirmarSenha("");
  }

  return (
    <>
      {/* BANNER DE ALERTA */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-30 mx-auto mt-2 w-full max-w-7xl px-4 sm:px-6"
      >
        <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-3 shadow-sm dark:border-amber-700 dark:from-amber-950/40 dark:to-orange-950/40 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                Atualize suas credenciais
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Você está usando a credencial padrão (matrícula como senha).{" "}
                <strong>Recomendamos que você defina uma senha personalizada</strong> assim que
                possível para maior segurança.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setModalAberto(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-500 sm:px-4 sm:py-2 sm:text-sm"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Atualizar agora
              </button>
              <button
                onClick={() => setBannerDispensado(true)}
                aria-label="Dispensar aviso"
                title="Dispensar (mostrarei novamente no próximo login)"
                className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MODAL DE ATUALIZAÇÃO */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={fecharModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3 text-white dark:border-white/10">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase">
                  <Lock className="h-4 w-4" />
                  Atualizar Credencial
                </h3>
                <button
                  onClick={fecharModal}
                  aria-label="Fechar"
                  className="rounded-lg p-1.5 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="space-y-4 p-5">
                {/* Aviso */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
                  Sua senha atual é igual à matrícula ({matricula}). Defina uma nova senha para
                  proteger sua conta.
                </div>

                {/* Campo: Primeiro nome (login) */}
                {primeiroNome && (
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Primeiro Nome (login)
                    </label>
                    <input
                      type="text"
                      value={novoPrimeiroNome}
                      onChange={(e) => setNovoPrimeiroNome(e.target.value)}
                      placeholder="seu primeiro nome"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm lowercase dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      Você pode manter o atual ou alterar (será usado como login).
                    </p>
                  </div>
                )}

                {/* Campo: Nova senha */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Nova Senha *
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      autoFocus
                      className={`w-full rounded-lg border bg-white px-3 py-2 pr-10 text-sm dark:bg-slate-800 dark:text-slate-100 ${
                        erroSenha
                          ? "border-red-400 dark:border-red-700"
                          : "border-slate-200 dark:border-white/10"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Barra de força */}
                  {novaSenha && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i < forca.score ? forca.cor : "bg-slate-200 dark:bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Força: <span className="font-semibold">{forca.label}</span>
                      </p>
                      {erroSenha && <p className="mt-1 text-[10px] text-red-500">{erroSenha}</p>}
                    </div>
                  )}
                  <p className="mt-1 text-[10px] text-slate-500">
                    Requisitos: 8+ caracteres, 1 maiúscula, 1 número e 1 caractere especial.
                  </p>
                </div>

                {/* Campo: Confirmar senha */}
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-500">
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="Digite a nova senha novamente"
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-100 ${
                      confirmarSenha && !senhasBatem
                        ? "border-red-400 dark:border-red-700"
                        : "border-slate-200 dark:border-white/10"
                    }`}
                  />
                  {confirmarSenha && !senhasBatem && (
                    <p className="mt-1 text-[10px] text-red-500">As senhas não coincidem.</p>
                  )}
                  {confirmarSenha && senhasBatem && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> As senhas coincidem.
                    </p>
                  )}
                </div>

                {/* Botão salvar */}
                <button
                  onClick={salvar}
                  disabled={!podeSalvar}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Atualizar credencial
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500">
                  Após atualizar, use a nova senha no próximo login. O login por matrícula continua
                  funcionando com a nova senha.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
