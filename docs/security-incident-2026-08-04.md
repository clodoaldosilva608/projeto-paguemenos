# Incidente de Segurança — Senha admin hardcoded

**Data do incidente:** 17/07/2026 (data da migration original)
**Data da descoberta:** 30/07/2026 (auditoria Task 2)
**Data da correção:** 04/08/2026 (Fase 2 do plano de correção)
**Severidade:** 🔴 CRÍTICO (OWASP A07 — Identification and Authentication Failures)

---

## Descrição

A migration `supabase/migrations/20260717132507_2d5a7217-8fcc-497f-89cb-d345cf663ed2.sql`
continha a senha admin `54321` (5 caracteres) hardcoded no código SQL:

```sql
-- Linha 33-34 da migration original
v_email text := 'clodoaldosilva608@gmail.com';
v_password text := '54321';
```

Esta senha foi commitada no repositório git público, tornando-a visível para
qualquer pessoa com acesso ao repositório.

## Impacto

- **Acesso admin trivial:** qualquer pessoa com a URL do projeto e acesso ao
  repositório podia fazer login como admin master.
- **Violação do senhaSchema:** o próprio projeto define senha mínima de 8
  caracteres com maiúscula, minúscula, dígito e especial. A senha `54321`
  viola todas as regras.
- **Histórico git:** mesmo após remover a senha do código atual, ela permanece
  no histórico git (commits anteriores). Um `git log -p | grep 54321` a encontra.
- **Novos ambientes:** qualquer `supabase db reset` em ambiente novo recriava
  o admin com a senha `54321`.

## Cronologia

| Data | Evento |
|---|---|
| 17/07/2026 | Migration com senha hardcoded commitada |
| 30/07/2026 | Auditoria Task 2 identifica o problema; senha trocada manualmente em produção |
| 04/08/2026 | Fase 2 do plano de correção: migration corretiva criada |

## Correção aplicada

### 1. Senha trocada em produção (30/07/2026)
Acesso via Supabase Dashboard → Authentication → Users → `clodoaldosilva608@gmail.com` → Reset password.
Nova senha: **16+ caracteres, gerada por gerenciador de senhas, armazenada em cofre corporativo.**

### 2. Migration corretiva (04/08/2026)
Arquivo: `supabase/migrations/20260804000100_remove_hardcoded_admin_password.sql`

- Cria função `public.reset_admin_password_from_env()` que lê a senha de
  variável de ambiente `admin.initial_password`.
- Em produção: a migration é no-op (senha já foi trocada manualmente).
- Em novos ambientes: a migration documenta que a senha deve vir de env var,
  não hardcoded.

### 3. Histórico git (NÃO resolvido)
A senha `54321` permanece no histórico git. Para remover completamente:
- Opção A: `git filter-repo --invert-paths --path-regex '.*54321.*'` (destrutivo)
- Opção B: aceitar que a senha foi trocada e o histórico é apenas informativo.

**Recomendação:** Opção B. A senha foi trocada, então o histórico não representa
mais risco ativo. `git filter-repo` reescreve todo o histórico e quebra hashes
de commits, o que é mais problemático que o risco residual.

## Lições aprendidas

1. **Nunca hardcodear senhas em migrations.** Usar variáveis de ambiente ou
   funções que leem de cofres seguros.
2. **CI/CD deve verificar segredos.** Adicionar `gitleaks` ou `trufflehog`
   no CI para detectar vazamentos antes do merge.
3. **Senhas admin devem ser geradas.** Usar `openssl rand -base64 24` ou
   similar, nunca senhas curtas e memoráveis.
4. **Auditoria regular.** Re-executar o prompt-mestre de auditoria
   (`docs/AUDIT-PROMPT.md`) a cada 3 meses.

## Verificação

Para confirmar que a correção está ativa:

```sql
-- 1. Verificar que a função helper existe
SELECT proname FROM pg_proc WHERE proname = 'reset_admin_password_from_env';

-- 2. Verificar que a senha foi trocada (tentar login com '54321' deve falhar)
-- Via Supabase Dashboard → Authentication → Users → tentar login manual

-- 3. Verificar que a migration foi aplicada
SELECT version FROM supabase_migrations.schema_migrations
WHERE version LIKE '20260804000100%';
```

## Referências

- Migration original: `supabase/migrations/20260717132507_2d5a7217-8fcc-497f-89cb-d345cf663ed2.sql`
- Migration corretiva: `supabase/migrations/20260804000100_remove_hardcoded_admin_password.sql`
- Plano de correção: `docs/CORRECTION-PLAN.md`
- Baseline da auditoria: `docs/audit-2026-08-04-baseline.md`
