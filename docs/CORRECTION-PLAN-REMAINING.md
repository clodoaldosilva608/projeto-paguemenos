# Plano de Correções Restantes — Orion

> **Plano para concluir as fases pendentes do plano de correção original.**
> Ver baseline pós-correções em `docs/audit-2026-08-04-after.md` (nota 6.5/10).

---

## Situação atual (2026-08-04)

### ✅ Fases concluídas (8 de 10)
- Fase 0 — Preparação ✅
- Fase 1 — Fechar endpoints sem auth ✅
- Fase 2 — Remover hardcoded secrets ✅
- Fase 3 — RLS + multi-tenancy + CRUD whitelist + SSRF ✅
- Fase 4 — Migrations quebradas ✅
- Fase 6 — Performance DB + índices + RPC + paginação + pooler ✅
- Fase 7 — Frontend: code splitting + memo ✅
- Fase 8 — Resiliência + circuit breaker + audit resiliente ✅

### ⏸️ Fases pendentes (2 de 10)
- **Fase 5** — Rate limit Redis + Sentry + logs estruturados
- **Fase 9** — Testes + CI/CD + Dependabot

### 📋 Ações manuais pendentes (não-fase)
1. Habilitar pooler no Supabase Dashboard (Database → Connection Pooling)
2. Trocar senha admin via `reset_admin_password_from_env()`
3. Reconectar webhook GitHub→Vercel
4. Revogar tokens expostos (Vercel CLI + GitHub PATs)

---

## FASE 5 — Rate Limit Distribuído + Observabilidade (2 dias)

**Objetivo:** substituir rate limit em memória por Redis distribuído + adicionar Sentry + structured logging.

**Pré-requisitos (usuário precisa fornecer):**
- Conta Upstash Redis criada + `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Conta Sentry criada + `SENTRY_DSN` + `VITE_SENTRY_DSN`

### 5.1 Configurar Upstash Redis (1h)

1. Criar conta em https://upstash.com
2. Criar Redis database: `orion-rate-limit`
3. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
4. Adicionar às env vars da Vercel:
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL
   vercel env add UPSTASH_REDIS_REST_TOKEN
   ```
5. Adicionar ao `.env.example`

### 5.2 Instalar dependências (15 min)
```bash
npm install @upstash/redis @upstash/ratelimit
npm install @sentry/react @sentry/tanstackstart-react
```

### 5.3 Reescrever `rate-limit.ts` (3h)

- Usar `@upstash/ratelimit` com `Ratelimit.slidingWindow`
- Manter fallback em memória para dev local (sem Upstash configurado)
- Aplicar rate limit em endpoints de IA (`chatIA`: 30/min, `extractVendasFromImage`: 10/min)

### 5.4 Configurar Sentry (3h)

- Criar `src/sentry.client.config.ts` (com sanitização de PII)
- Criar `src/sentry.server.config.ts`
- Importar em `src/start.ts`
- Adicionar `SENTRY_DSN` e `VITE_SENTRY_DSN` às env vars
- Configurar `tracesSampleRate: 0.1` (10% em prod)

### 5.5 Structured logging (3h)

- Criar `src/lib/logger.ts` com logger JSON estruturado
- Gerar `requestId` por server function invocation via `crypto.randomUUID()`
- Aplicar em server functions críticas: `criarUsuarioConfirmado`, `buscarEmailPorMatricula`, `chatIA`, `extractVendasFromImage`
- Sanitizar PII (Authorization headers, cookies, emails)

### 5.6 Testes (2h)
- Verificar rate limit distribuído funciona entre instâncias
- Disparar erro de teste → Sentry captura
- Verificar logs JSON estruturados na Vercel

**Verificação final:** rate limit distribuído ativo, Sentry captura erros, logs JSON estruturados.

**Rollback:** `git revert` — fallback em memória ainda funciona se Upstash falhar.

---

## FASE 9 — Testes + CI/CD + Dependabot (3 dias)

**Objetivo:** garantir que mudanças futuras não quebrem correções P0.

**Sem pré-requisitos externos.**

### 9.1 Configurar Vitest (1h)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- Criar `vitest.config.ts`
- Criar `src/test/setup.ts`
- Adicionar scripts no `package.json`: `test`, `test:watch`, `test:coverage`

### 9.2 Testes de segurança (1 dia)

Criar testes que protegem as correções P0:

**`src/lib/__tests__/auth.security.test.ts`**
- Validação de senha forte (8+ chars, maiúsc, minúsc, dígito, especial)
- Rejeição de senha `54321`
- Rejeição de senha `123456`

**`src/lib/__tests__/crud.security.test.ts`**
- Whitelist rejeita tabela não permitida (`secret_table`)
- Whitelist rejeita coluna não permitida (`password` em `profiles`)
- Gerente não consegue mutar `user_roles` (ADMIN_ONLY_TABLES)
- Admin pode mutar `user_roles`
- `validateColumns` rejeita `searchColumns` arbitrários

**`src/lib/__tests__/sheets.security.test.ts`**
- `validateSheetUrl` rejeita `localhost`
- `validateSheetUrl` rejeita AWS metadata `169.254.169.254`
- `validateSheetUrl` rejeita IP privado `10.0.0.1`
- `validateSheetUrl` aceita `https://docs.google.com/...`
- `validateSheetUrl` rejeita HTTP (apenas HTTPS)

**`src/lib/__tests__/rate-limit.test.ts`**
- Rate limit bloqueia após N tentativas
- Rate limit reseta após janela

**`src/lib/__tests__/fetch-with-timeout.test.ts`**
- `fetchWithTimeout` aborta após timeout
- `fetchWithRetry` tenta N vezes
- `fetchWithRetry` faz backoff exponencial

**`src/lib/__tests__/circuit-breaker.test.ts`**
- Circuit breaker abre após 5 falhas
- Circuit breaker fecha após recovery timeout
- `withCircuitBreaker` lança erro quando open

### 9.3 Testes E2E com Playwright (1 dia)

```bash
npm install -D @playwright/test
npx playwright init
```

**`e2e/auth.spec.ts`**
- Login admin bem-sucedido
- Login vendedor por matrícula
- Logout
- Acesso negado a `/admin` sem auth

**`e2e/security.spec.ts`**
- PowerBI sem token retorna 400
- PowerBI com token demo retorna 401 (NÃO 200)
- PowerBI com token inválido retorna 401
- `gerarPlanilhaExecutiva` sem auth retorna 401
- `extractVendasFromImage` sem auth retorna 401

**`e2e/multi-tenant.spec.ts`**
- Vendedor da filial A não vê profiles da filial B
- Gerente não consegue `crudCreate` em `user_roles`
- Trigger bloqueia alteração de `filial_id` no profile

### 9.4 Configurar GitHub Actions CI (1 dia)

Criar `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main, "fix/**"]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
```

### 9.5 Dependabot (30 min)

Criar `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    ignore:
      - dependency-name: "nitro"
        update-types: ["version-update:semver-major"]
```

### 9.6 Testes de carga com k6 (opcional, 1 dia)

Criar `scripts/load-test.js` para validar 100 usuários simultâneos:
- Ramp up: 30s → 100 usuários
- Steady: 1 min em 100
- Ramp down: 30s → 0
- Verificar latência < 500ms em 95º percentil

### 9.7 Verificação final (2h)

```bash
# Todos os testes passam
npm test
npm run lint
npx tsc --noEmit

# E2E passa
npx playwright test

# CI verde no GitHub
# Bundle size < 500KB gzip
```

**Verificação final:** cobertura > 30%, E2E cobre fluxos críticos, CI verde, Dependabot ativo.

---

## Ações manuais pendentes (não-fase)

### 1. 🔴 Habilitar pooler no Supabase Dashboard (5 min)

1. https://supabase.com/dashboard/project/wfvihysxlzkwwrwobmpv/database/pooler
2. Enable Connection Pooling (Supavisor)
3. Usar connection string com porta 6543 em `DATABASE_URL`

### 2. 🔴 Trocar senha admin (5 min)

No Supabase SQL Editor:

```sql
SET admin.initial_password = 'SuaNovaSenhaForte@123';
SELECT public.reset_admin_password_from_env();
```

> Substitua por senha forte real (16+ chars). Guarde em cofre corporativo.

### 3. 🟠 Reconectar webhook GitHub→Vercel (10 min)

1. https://vercel.com/dashboard → projeto Orion → Settings → Git
2. Verificar "Connected Git Repository" = `clodoaldosilva608/projeto-paguemenos`
3. Se desconectado, clicar em "Connect" e autorizar
4. Verificar em https://github.com/clodoaldosilva608/projeto-paguemenos/settings/hooks
5. Deve haver webhook Vercel ativo

### 4. 🟠 Revogar tokens expostos (10 min)

- **Vercel CLI token** `vcp_1msX8N...`: https://vercel.com/account/tokens → Delete
- **GitHub PAT** `ghp_UR2r...`: https://github.com/settings/tokens → Delete
- **GitHub PAT antigo** `ghp_O6t8...`: já revogado
- Gerar novos apenas quando necessário, guardar em cofre

### 5. 🟡 Migrar `api_key_ciphertext` para Vault (futura)

A coluna `ai_config.api_key_ciphertext` ainda armazena chaves de IA em plaintext (nome enganoso). Migrar para Supabase Vault:

1. Habilitar Vault no Supabase Dashboard
2. Criar migration que move chaves existentes para Vault
3. Atualizar `ia-config.functions.ts` para usar `vault.create_secret()`
4. Atualizar `ia.functions.ts` para ler via `vault.decrypted_secret()`
5. Dropar coluna `api_key_ciphertext` após migração

### 6. 🟡 Particionamento de `audit_log` e `ai_logs` (futura)

Em 100k usuários, essas tabelas crescem ~365M/ano cada. Sem partição, queries ficam >30s.

1. Criar migration que particiona por mês
2. Migrar dados existentes
3. Adicionar política de retenção (ex: 2 anos)
4. Configurar job de purge automático

---

## Progresso tracker

Atualize esta tabela a cada fase concluída:

| Fase | Status | Commit | Deploy | Data |
|---|---|---|---|---|
| 0 | ✅ Completa | `d956ee9` | ✅ | 2026-08-04 |
| 1 | ✅ Completa | `535b7b3` | ✅ | 2026-08-04 |
| 2 | ✅ Completa | `45cb895` | ✅ | 2026-08-04 |
| 3 | ✅ Completa | `d50e04c`, `d357925` | ✅ | 2026-08-04 |
| 4 | ✅ Completa | `aaad732` | ✅ | 2026-08-04 |
| 5 | ⏸️ Pendente | — | — | — |
| 6 | ✅ Completa | `9030e96` | ✅ | 2026-08-04 |
| 7 | ✅ Completa | `4929fb7`, `6d7a327` | ✅ | 2026-08-04 |
| 8 | ✅ Completa | `6d7a327` | ✅ | 2026-08-04 |
| 9 | ⏸️ Pendente | — | — | — |

### Ações manuais tracker

| Ação | Status | Data |
|---|---|---|
| Pooler no Supabase cloud | ⏸️ Pendente | — |
| Trocar senha admin | ⏸️ Pendente | — |
| Reconectar webhook Vercel | ⏸️ Pendente | — |
| Revogar tokens expostos | ⏸️ Pendente | — |
| Migrar api_key para Vault | ⏸️ Futura | — |
| Particionar audit_log/ai_logs | ⏸️ Futura | — |

---

## Próxima auditoria

Recomendado: **2026-11-04** (3 meses após conclusão das Fases 5 e 9).

Usar prompt-mestre: `docs/AUDIT-PROMPT.md`

Métrica-alvo: nota geral ≥ 8.5/10 (atualmente 6.5/10).
