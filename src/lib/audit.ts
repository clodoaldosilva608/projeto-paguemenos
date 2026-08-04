// ============================================================
// logAuditSafe — auditoria resiliente com fila em memória
// Fase 8.5 da auditoria de 2026-08-04
//
// Problema: logAudit atual usa try/catch que apenas console.error
// em caso de falha. Se insert em audit_log falhar (constraint, rede),
// a ação é realizada mas NÃO é auditada — inaceitável para sistema
// financeiro.
//
// Solução: logAuditSafe enfileira entries falhas para retry a cada 30s,
// e envia para Sentry como fallback se disponível.
// ============================================================

interface AuditEntry {
  actor_user_id: string;
  actor_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  before?: any;
  after?: any;
  metadata?: any;
  criado_em?: string;
}

interface QueuedEntry {
  entry: AuditEntry;
  attempt: number;
  queuedAt: number;
}

// Fila em memória para retry de auditoria
const auditQueue: QueuedEntry[] = [];
let processing = false;
const MAX_ATTEMPTS = 3;
const RETRY_INTERVAL_MS = 30_000;

// Referência lazy ao Sentry (se disponível)
let sentryAvailable = false;
try {
  // @ts-ignore — Sentry pode não estar instalado ainda (Fase 5)
  if (typeof globalThis.Sentry !== "undefined") {
    sentryAvailable = true;
  }
} catch {
  // ignore
}

/**
 * Registra auditoria de forma resiliente.
 * - Tenta inserir imediatamente.
 * - Se falhar, enfileira para retry a cada 30s (até 3 tentativas).
 * - Envia para Sentry como fallback se disponível.
 *
 * IMPORTANTE: esta função NÃO bloqueia a ação principal — retorna
 * imediatamente após a tentativa inicial (que é await).
 */
export async function logAuditSafe(
  supabaseAdmin: any,
  entry: AuditEntry,
): Promise<void> {
  // Primeira tentativa — esperar
  const success = await tryInsertAudit(supabaseAdmin, entry);

  if (!success) {
    // Enfileirar para retry
    auditQueue.push({
      entry: { ...entry, criado_em: entry.criado_em || new Date().toISOString() },
      attempt: 1,
      queuedAt: Date.now(),
    });

    // Fallback: Sentry (se disponível)
    if (sentryAvailable) {
      try {
        // @ts-ignore
        globalThis.Sentry?.captureMessage?.("Audit log insert failed — enfileirado para retry", {
          level: "error",
          extra: { entry },
        });
      } catch {
        // Sentry fallback também falhou — apenas log no console
      }
    }

    // Console fallback (sempre)
    console.error("[audit] falha ao registrar — enfileirado para retry", {
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id,
    });
  }
}

async function tryInsertAudit(supabaseAdmin: any, entry: AuditEntry): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from("audit_log").insert({
      actor_user_id: entry.actor_user_id,
      actor_email: entry.actor_email ?? null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entity_id ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? null,
      criado_em: entry.criado_em || new Date().toISOString(),
    });

    if (error) {
      console.error("[audit] erro no insert:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[audit] exceção no insert:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

/**
 * Processa a fila de auditoria pendente.
 * Deve ser chamado periodicamente (setInterval).
 */
export async function processAuditQueue(supabaseAdmin: any): Promise<void> {
  if (processing || auditQueue.length === 0) return;
  processing = true;

  const failed: QueuedEntry[] = [];

  while (auditQueue.length > 0) {
    const item = auditQueue.shift()!;
    const success = await tryInsertAudit(supabaseAdmin, item.entry);

    if (!success) {
      if (item.attempt < MAX_ATTEMPTS) {
        // Tentar de novo no próximo ciclo
        failed.push({ ...item, attempt: item.attempt + 1 });
      } else {
        // Esgotou tentativas — logar e descartar
        console.error("[audit] entry descartada após", MAX_ATTEMPTS, "tentativas", item.entry);

        if (sentryAvailable) {
          try {
            // @ts-ignore
            globalThis.Sentry?.captureMessage?.(
              `Audit log descartado após ${MAX_ATTEMPTS} tentativas`,
              { level: "critical", extra: { entry: item.entry } },
            );
          } catch {}
        }
      }
    }
  }

  // Re-enfileirar falhas para próximo ciclo
  auditQueue.push(...failed);
  processing = false;
}

/**
 * Inicia o processador periódico da fila de auditoria.
 * Retorna função de cleanup.
 *
 * NOTA: em Vercel serverless, cada invocação pode rodar em instância
 * diferente — este processador só roda enquanto a instância estiver quente.
 * Para garantia total, usar cron job separado (planejado para Fase 9).
 */
export function startAuditQueueProcessor(supabaseAdminGetter: () => Promise<any>): () => void {
  const interval = setInterval(async () => {
    try {
      const supabaseAdmin = await supabaseAdminGetter();
      if (supabaseAdmin) {
        await processAuditQueue(supabaseAdmin);
      }
    } catch (e) {
      // Falha silenciosa — não derrubar a instância
    }
  }, RETRY_INTERVAL_MS);

  return () => clearInterval(interval);
}

/**
 * Retorna estatísticas da fila (para observabilidade).
 */
export function getAuditQueueStats(): {
  queueLength: number;
  oldestEntryAge: number | null;
} {
  if (auditQueue.length === 0) {
    return { queueLength: 0, oldestEntryAge: null };
  }
  const oldest = auditQueue[0];
  return {
    queueLength: auditQueue.length,
    oldestEntryAge: Date.now() - oldest.queuedAt,
  };
}
