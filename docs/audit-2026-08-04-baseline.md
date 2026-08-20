# Auditoria de Engenharia — Baseline 2026-08-04

> **Snapshot da saúde do sistema Orion antes do plano de correção.**
> Este documento serve como referência para auditorias futuras compararem o
> que foi corrigido versus o que ainda pendente.

---

## Nota geral: 2.6 / 10

| Dimensão | Nota | Justificativa resumida |
|---|---|---|
| Arquitetura | 4/10 | Monólito TanStack Start em Vercel serverless é razoável, mas `nitro 3.0.260603-beta` em produção, sem filas, sem workers, sem cache, sem Redis. |
| Segurança | 2/10 | 7 falhas CRÍTICAS (escalonamento de privilégio, PII leak, SSRF, senha admin hardcoded). Cadeia de exploração trivial. |
| Banco de dados | 3/10 | 2 migrations quebradas em produção, 4 vazamentos cross-tenant via RLS, índices ausentes em colunas críticas, `numeric` sem precisão para dinheiro. |
| Escalabilidade | 3/10 | Rate limit em memória (inútil em serverless), dashboard carrega 500k rows em memória, sem pooler habilitado, sem cache. |
| Performance | 4/10 | Sem code splitting, 26 partículas com animação infinita, `KpiCard` inline remonta a cada render, React Query instalado mas não usado. |
| Resiliência | 2/10 | Sem circuit breaker, sem timeout em chamadas externas (IA, SSO, sheets), sem retries, sem DLQ, audit_log falha silenciosamente. |
| Observabilidade | 1/10 | Zero. Sem Sentry, sem traces, sem métricas, sem request ID, sem alertas. Se cair às 3h, ninguém saberá. |
| Testes | 0/10 | Zero arquivos `.test.ts`/`.spec.ts` no projeto. Zero E2E. Zero CI. |
| Manutenibilidade | 4/10 | Duplicação massiva (estilos inline em 2 páginas, queries manuais em 10+ componentes), contexts sem memoização, funções de 1264 linhas. |
| DevOps/Deploy | 3/10 | Sem CI/CD, sem Docker, sem staging, deploy manual via `git push`. `.env` em plaintext no servidor. |

---

## Top 9 riscos CRÍTICOS (P0)

| # | Problema | Arquivo:linha |
|---|---|---|
| 1 | `gerarPlanilhaExecutiva` sem auth gera Excel com PII + matrículas (=senhas) | `src/lib/planilha-executiva.functions.ts:660` |
| 2 | Token hardcoded `"orion-public-demo"` no PowerBI retorna todas as vendas | `src/routes/api/public/powerbi/vendas.ts:31-34` |
| 3 | `extractVendasFromImage` (OCR) sem auth nem rate limit — gasta quota IA anônima | `src/lib/vendas-ocr.functions.ts:61` |
| 4 | `criarTabelasEquipesFiliais` sem auth, abre conexão direta com `DATABASE_URL` superuser | `src/lib/criar-tabelas.functions.ts:4-18` |
| 5 | Senha admin `54321` hardcoded em migration SQL pública no git | `supabase/migrations/20260717132507_2d5a7217...sql:34` |
| 6 | `buscarEmailPorMatricula` retorna email + senha (matrícula) ao client | `src/lib/login-matricula.functions.ts:50-54` |
| 7 | Escalonamento: gerente vira admin via `crudCreate({table:"user_roles", data:{role:"admin"}})` | `src/lib/admin.functions.ts:7-18` + `src/lib/admin/crud.functions.ts:188-191` |
| 8 | Trigger `handle_new_user_membership` aceita `role` do `user_metadata` controlável pelo atacante | `supabase/migrations/20260729000001_saas_companies_members_jwt.sql:130-156` |
| 9 | Usuário pode alterar `filial_id`, `equipe_id`, `plano`, `aprovado` no próprio profile | `supabase/migrations/20260717123336_b0eff635...sql:60-61` |

## Cadeia de exploração trivial

```
Anônimo
  ↓ chama gerarPlanilhaExecutiva (sem auth)
  ↓ obtém matrículas (=senhas) de TODOS os vendedores
  ↓ chama buscarEmailPorMatricula (matrícula → email+senha)
  ↓ login como vendedor
  ↓ (caminho indireto) gerente via convite manual
  ↓ crudCreate({table:"user_roles", data:{role:"admin"}}) — gerente vira admin
  ↓ admin acessa todos os tenants via supabaseAdmin (bypassa RLS)
```

**Tempo estimado de exploração completa:** < 30 minutos para um atacante com
conhecimento básico, sem ferramentas especializadas.

---

## OWASP Top 10 (2021) — Mapeamento

| Categoria | Severidade | Itens |
|---|---|---|
| A01 Broken Access Control | 🔴 CRÍTICO | 4 server functions sem auth, token hardcoded, `ensureAdmin` aceita gerente, CRUD genérico com `z.record(z.any())` |
| A02 Cryptographic Failures | 🔴 CRÍTICO | `api_key_ciphertext` em plaintext, matrícula como senha, senha admin `54321`, JWT comparison não constant-time |
| A03 Injection | 🟠 ALTO | `crudList` aceita `searchColumns` do client sem whitelist |
| A04 Insecure Design | 🟠 ALTO | "Matrícula como senha", "Gerente = admin", rate limit em memória, CRUD genérico |
| A05 Security Misconfiguration | 🟠 ALTO | `enable_confirmations=false`, CORS `*` em PowerBI, CSP `unsafe-eval`, `ssl rejectUnauthorized:false` |
| A06 Vulnerable Components | 🟡 MÉDIO | `nitro` beta, `@tanstack/react-start` preview, sem Dependabot |
| A07 Auth Failures | 🔴 CRÍTICO | Senha hardcoded, matrícula=senha, rate limit ineficaz, sem email confirmation |
| A08 Software/Data Integrity | 🟡 MÉDIO | Sem `npm audit` em CI, `audit_log` insert não transacional |
| A09 Logging Failures | 🔴 CRÍTICO | Sem structured logging, sem Sentry, sem request ID, audit_log falha silencioso |
| A10 SSRF | 🔴 CRÍTICO | `puxarVendasDoSheet` fetcha URL controlada por admin sem validação |

---

## O que quebra primeiro (em escala)

| Ordem | Componente | Quando quebra |
|---|---|---|
| 1º | Endpoint PowerBI público + `gerarPlanilhaExecutiva` | Imediatamente — descoberto por acidente |
| 2º | Postgres connection pool | ~10k usuários simultâneos |
| 3º | `getDashboardStats` (OOM) | ~10k admins ou 50k usuários |
| 4º | Custo de IA (sem rate limit) | Qualquer escala — atacante queima quota |
| 5º | `audit_log` e `ai_logs` (sem partição) | ~50k usuários, ~365M rows/ano |

---

## Veredito final

### O sistema atual está tecnicamente preparado para crescer 10x?

**NÃO.** Há 9 vulnerabilidades CRÍTICAS (P0) que permitem escalonamento de
privilégio trivial, vazamento de PII entre tenants, e custos ilimitados de IA.

### Ele está preparado para 100.000 usuários?

**NÃO.** Com modificações significativas. Estimativa: 3-4 meses de trabalho
focado em infraestrutura e segurança.

### Menor conjunto de mudanças AGORA

Em ~8 horas de trabalho, elimina 7 dos 9 vetores P0:

1. Auth nas 4 server functions sem auth (1h)
2. Remover token hardcoded + retorno de senha (2h)
3. Reverter `ensureAdmin` para `admin` apenas (5min)
4. Trocar senha admin + substituir migration (30min)
5. Whitelist de colunas no CRUD genérico (4h)

---

## Como este baseline deve ser usado

1. **Após cada fase do plano de correção**, adicione uma seção
   "Pós-Fase N — <data>" abaixo, listando:
   - Itens corrigidos (com link para commit)
   - Itens remanescentes
   - Nova nota da dimensão afetada

2. **A cada 3 meses**, re-executar o prompt-mestre
   (`docs/AUDIT-PROMPT.md`) e comparar com este baseline.

3. **A cada release major**, auditoria de regressão: verificar se correções
   P0 não foram revertidas acidentalmente.

---

## Referências

- Prompt-mestre: `docs/AUDIT-PROMPT.md`
- Plano de correção: `docs/CORRECTION-PLAN.md`
- Auditoria completa (relatório técnico): executar novamente o prompt-mestre
