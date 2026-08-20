# Plano de Correção por Fases — Orion

> **Plano de execução para corrigir todas as vulnerabilidades e riscos
> identificados na auditoria de 2026-08-04.**
> Ver baseline em `docs/audit-2026-08-04-baseline.md`.

---

## Princípios orientadores

1. **Cada fase é independente e reversível** — pode ser deployada isoladamente.
2. **Nenhuma fase quebra funcionalidade existente** — apenas adiciona proteção.
3. **Cada fase tem verificação automatizada** antes do próximo deploy.
4. **Commits pequenos e atômicos** — um por item, com mensagem descritiva.
5. **Branch dedicada por fase** — `fix/fase-N-descricao` → PR → merge após testes.
6. **Rollback em 1 comando** — `git revert <commit>` se algo quebrar.

---

## Cronograma geral

| Fase | Duração | Severidade | Risco | Status |
|---|---|---|---|---|
| Fase 0 | 2h | Preparação | Nenhum | Pendente |
| Fase 1 | 1 dia | P0 | Baixo | Pendente |
| Fase 2 | 1 dia | P0 | Baixo | Pendente |
| Fase 3 | 2 dias | P0 | Médio | Pendente |
| Fase 4 | 1 dia | P0 | Médio | Pendente |
| Fase 5 | 2 dias | P1 | Baixo | Pendente |
| Fase 6 | 2 dias | P1 | Médio | Pendente |
| Fase 7 | 2 dias | P1 | Baixo | Pendente |
| Fase 8 | 2 dias | P2 | Baixo | Pendente |
| Fase 9 | 3 dias | P2 | Nenhum | Pendente |

**Total: ~16 dias úteis (3 semanas)** para resolver P0+P1+P2 críticos.

---

## Fase 0 — Preparação e Backup (2 horas)

### 0.1 Snapshot do banco em produção
Supabase Dashboard → Database → Backups → Create backup
Nome: `pre-correcao-auditoria-2026-08-04`

### 0.2 Tag git
```bash
git tag pre-auditoria-2026-08-04
git push origin pre-auditoria-2026-08-04
```

### 0.3 Exportar dados críticos
Profiles, user_roles, members, vendas_diarias → CSV em local seguro (não no git).

### 0.4 Branch base
```bash
git checkout -b fix/fase-0-preparacao
```

**Verificação:** tag criada, backup Supabase criado, branch base pushed.

---

## Fase 1 — Fechar endpoints sem auth (1 dia, P0)

### 1.1 Auditoria de uso
```bash
rg "gerarPlanilhaExecutiva|extractVendasFromImage|criarTabelasEquipesFiliais|setupLoginMatricula" src/ --type ts -l
```

### 1.2 Adicionar middleware de auth
- `src/lib/planilha-executiva.functions.ts:660` → adicionar `requireSupabaseAuth` + `ensureAdmin`
- `src/lib/vendas-ocr.functions.ts:61` → adicionar `requireSupabaseAuth`
- `src/lib/criar-tabelas.functions.ts:4` → adicionar `requireSupabaseAuth` + `ensureAdmin`
- `src/lib/setup-login-matricula.ts:5` → adicionar `requireSupabaseAuth` + `ensureAdmin`

### 1.3 Remover token hardcoded
- `src/routes/api/public/powerbi/vendas.ts:31-34` → remover bloco `orion-public-demo`

### 1.4 Adicionar rate limit no PowerBI
- 60/min/IP

### 1.5 Restringir CORS do PowerBI
- Substituir `Access-Control-Allow-Origin: *` por whitelist de domínios confiáveis.

### 1.6 Testes manuais
- 4 endpoints sem auth retornam 401.
- PowerBI com token demo retorna 401.
- Fluxo normal logado funciona.

---

## Fase 2 — Remover hardcoded secrets (1 dia, P0)

### 2.1 Senha admin hardcoded
- Trocar senha admin via Supabase Dashboard (16+ chars).
- Criar `docs/security-incident-2026-08-04.md` documentando o incidente.
- Migration corretiva (no-op em prod, falha explícita em novos ambientes se `ADMIN_INITIAL_PASSWORD` não definida).

### 2.2 Remover retorno de senha em `buscarEmailPorMatricula`
- Refatorar para `loginPorMatricula` — fazer signIn server-side, retornar apenas session.

### 2.3 Cifrar chaves de IA
- Migrar `api_key_ciphertext` para Supabase Vault.
- Nova migration: `20260804000100_encrypt_ai_keys.sql`.
- Atualizar `ia-config.functions.ts` para usar Vault.
- Atualizar `ia.functions.ts` para ler do Vault.
- Documentar migração em `docs/MIGRATE_AI_KEYS.md`.

---

## Fase 3 — Corrigir RLS e multi-tenancy (2 dias, P0)

### 3.1 Bloquear auto-alteração de campos sensíveis em `profiles`
- Nova migration: `20260804000200_lock_sensitive_profile_fields.sql`.
- Trigger `BEFORE UPDATE` que bloqueia alteração de `filial_id`, `equipe_id`, `company_id`, `plano`, `aprovado` por não-admins.

### 3.2 Dropar `profiles_select_all`
- Migration: `20260804000300_drop_profiles_select_all.sql`.

### 3.3 Reescrever `filiais_all` e `equipes_all` com filtro company_id
- Migration: `20260804000400_fix_filiais_equipes_rls.sql`.

### 3.4 Corrigir `members_insert_own`
- Migration: `20260804000500_fix_members_insert.sql`.
- Validar `role='member'` e `company_id` do caller.

### 3.5 Desabilitar `handle_new_user_membership` ou reescrever
- Forçar `role='member'`, ignorar metadata do user.

### 3.6 Reverter `ensureAdmin` para apenas `admin`
- `src/lib/admin.functions.ts:7-18` → `.eq("role", "admin")`.
- Criar `ensureGestor` separado.
- Whitelist de tabelas mutáveis por role.

### 3.7 Whitelist de colunas no CRUD genérico
- `src/lib/admin/crud.functions.ts` → `ALLOWED_COLUMNS` por tabela.
- Validar `searchColumns` e `filters` contra whitelist.

### 3.8 Validar URL em `puxarVendasDoSheet`
- Bloquear IPs privados/loopback/link-local.
- Whitelist de domínios (Google Sheets).

### 3.9 Testes de isolamento
- Script `scripts/test-isolation.ts` cobrindo 5 cenários.

---

## Fase 4 — Corrigir migrations quebradas (1 dia, P0)

### 4.1 Corrigir `companies_members` → `members`
- `supabase/migrations/20260730130000_unify_has_role.sql:115`
- `supabase/migrations/20260730130001_isolamento_equipe_id.sql:314`

### 4.2 Corrigir `ai_logs.usuario_id` → `user_id`
- `supabase/migrations/20260730130001_isolamento_equipe_id.sql:334-336`

### 4.3 Aplicar migrations em produção
- Via Supabase Dashboard → SQL Editor.

### 4.4 Verificar `supabase db reset` em ambiente local
- Deve funcionar sem erro.

---

## Fase 5 — Rate limit distribuído + observabilidade (2 dias, P1)

### 5.1 Configurar Upstash Redis
- Criar database `orion-rate-limit`.
- Adicionar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` às env vars.

### 5.2 Instalar dependências
```bash
npm install @upstash/redis @upstash/ratelimit
```

### 5.3 Reescrever `rate-limit.ts`
- Usar Upstash Ratelimit (Redis distribuído).
- Manter fallback em memória para dev local.

### 5.4 Adicionar rate limit em endpoints de IA
- `chatIA`: 30 msg/min/user
- `extractVendasFromImage`: 10 imagens/min/user

### 5.5 Configurar Sentry
```bash
npm install @sentry/react @sentry/tanstackstart-react
```
- Criar `src/sentry.client.config.ts` e `src/sentry.server.config.ts`.
- Sanitizar PII (headers Authorization, cookie).

### 5.6 Structured logging com request ID
- Criar `src/lib/logger.ts` com logger JSON estruturado.
- Gerar `requestId` por server function invocation.
- Usar em todas as server functions críticas.

---

## Fase 6 — Performance DB + índices + cache (2 dias, P1)

### 6.1 Migration de índices
- `20260804000600_add_missing_indexes.sql` com 15+ índices ausentes.

### 6.2 Corrigir tipos `numeric`
- `20260804000700_fix_numeric_precision.sql` → `numeric(14,2)` em colunas monetárias.

### 6.3 Adicionar `UNIQUE` em `profiles.email`
- `20260804000800_unique_profile_email.sql`.

### 6.4 Reescrever `getDashboardStats` para RPC
- Migration: `20260804000900_dashboard_stats_rpc.sql`.
- Função `get_dashboard_stats(p_filial_id, p_data_inicio, p_data_fim)` retorna JSON agregado.
- Atualizar `crud.functions.ts:399-434`.

### 6.5 Paginar `listarUsuariosComCredenciais`
- Adicionar `page`, `pageSize`, `search`, `filialId` no validator.
- Usar `.range(from, to)` + `{ count: "exact" }`.
- Atualizar consumer.

### 6.6 Habilitar pooler Supabase
- `supabase/config.toml: [db.pooler] enabled = true`.
- Em produção: usar connection string com porta 6543 (Supavisor).

### 6.7 Cache Redis para funções RLS
- Criar `src/lib/cache.ts` com helper `cached()`.
- Usar em `tenant.ts:resolveTenantConfig` (TTL 5min).

---

## Fase 7 — Frontend: code splitting + memo (2 dias, P1)

### 7.1 Code splitting nas rotas
- `src/routes/index.tsx` → `lazy(() => import("@/OrionApp"))` e `lazy(() => import("@/components/LandingPage"))`.
- `src/OrionApp.tsx` → converter 17 imports estáticos para `lazy()`.

### 7.2 Lazy load do `recharts`
- `src/components/GoalDetailModal.tsx` → `lazy(() => import("recharts"))`.

### 7.3 Memoizar contexts
- `AuthContext.tsx`, `FilialContext.tsx`, `ThemeContext.tsx` → `useMemo` no `value` + `useCallback` em funções.

### 7.4 Mover `KpiCard` para fora do corpo de `DashboardView`
- `src/components/DashboardView.tsx:55-61` → componente top-level com `React.memo`.

### 7.5 Memoizar cálculos em `PlanilhaInternaPage`
- `somaPorDia`, `somaPorVendedor`, `indicadoresPorVendedor` → `useMemo`.

### 7.6 Throttle do `onMouseMove` em `SpotlightText`
- `src/components/LandingPage.tsx:154-162` → throttle 16ms.

### 7.7 Respeitar `prefers-reduced-motion`
- Desativar `FloatingParticles` e `KineticGrid.trail` se reduced-motion.

### 7.8 Configurar React Query corretamente
- `staleTime: 30s`, `gcTime: 5min`, `retry: 1`, `refetchOnWindowFocus: false`.

### 7.9 Remover animações infinitas do FAB quando fechado
- `IAAssistantFAB.tsx:148-149` → só animar quando aberto ou com notification.

---

## Fase 8 — Resiliência + circuit breaker (2 dias, P2)

### 8.1 Criar helper de fetch com timeout
- `src/lib/fetch-with-timeout.ts` com `fetchWithTimeout` e `fetchWithRetry`.

### 8.2 Aplicar em chamadas de IA
- `src/lib/ia.functions.ts` → 30s timeout, 1 retry, 1s backoff.

### 8.3 Aplicar em `puxarVendasDoSheet`
- `src/lib/sheets.functions.ts:121` → 15s timeout.

### 8.4 Aplicar em SSO
- `src/routes/api/sso.ts` → 10s timeout.

### 8.5 Circuit breaker simples
- `src/lib/circuit-breaker.ts` com threshold 5 falhas, recovery 60s.

### 8.6 Garantir que `audit_log` não falhe silenciosamente
- Criar `src/lib/audit.ts` com `logAuditSafe` + fila em memória para retry.
- Enviar para Sentry como fallback se insert falhar.
- Substituir todas as chamadas `logAudit`.

---

## Fase 9 — Testes + CI/CD (3 dias, P2)

### 9.1 Configurar Vitest
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 9.2 Testes de segurança
- `auth.security.test.ts`: validação de senha, rate limit.
- `crud.security.test.ts`: whitelist de tabelas/colunas, gerente não muta `user_roles`.
- `sheets.security.test.ts`: bloqueio de localhost, AWS metadata, IPs privados.

### 9.3 Testes E2E com Playwright
```bash
npm install -D @playwright/test
npx playwright init
```
- `e2e/auth.spec.ts`: login admin, acesso negado a /admin sem auth.
- `e2e/security.spec.ts`: PowerBI sem token retorna 401, token demo não funciona, `gerarPlanilhaExecutiva` sem auth retorna 401.

### 9.4 Configurar GitHub Actions CI
- `.github/workflows/ci.yml`: lint + typecheck + test + build.
- Verificação de bundle size (< 500KB).

### 9.5 Dependabot
- `.github/dependabot.yml`: weekly, ignorar major do `nitro`.

### 9.6 Testes de carga com k6 (opcional)
- `scripts/load-test.js`: 100 usuários simultâneos na landing page.

---

## Checklist final de verificação

Após concluir todas as fases:

```bash
# 1. Todos os testes passam
npm run test
npm run lint
npx tsc --noEmit

# 2. Bundle reduzido
npm run build
# Verificar que bundle inicial < 300KB gzip

# 3. Endpoints críticos seguros
curl -X POST https://orion-vendas.vercel.app/api/gerarPlanilhaExecutiva  # 401
curl https://orion-vendas.vercel.app/api/public/powerbi/vendas?token=orion-public-demo  # 401

# 4. Isolamento multi-tenant
# Login como vendedor A → tentar ler profiles de filial B → deve falhar
# Login como gerente → tentar crudCreate em user_roles → deve falhar

# 5. Observabilidade
# Disparar erro de teste → Sentry captura
# Verificar logs estruturados na Vercel

# 6. Performance
# Dashboard admin carrega < 1s com 50k vendas
# Rate limit distribuído funciona

# 7. Migrations aplicadas
# supabase db reset funciona sem erro
# Todas as policies RLS existem
```

---

## Progresso

Atualize esta tabela a cada fase concluída:

| Fase | Status | Commit | Deploy | Data |
|---|---|---|---|---|
| 0 | Pendente | — | — | — |
| 1 | Pendente | — | — | — |
| 2 | Pendente | — | — | — |
| 3 | Pendente | — | — | — |
| 4 | Pendente | — | — | — |
| 5 | Pendente | — | — | — |
| 6 | Pendente | — | — | — |
| 7 | Pendente | — | — | — |
| 8 | Pendente | — | — | — |
| 9 | Pendente | — | — | — |
