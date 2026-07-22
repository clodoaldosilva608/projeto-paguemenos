# ORION · Pague Menos — Setup Local

Guia completo para rodar o projeto **localmente** em ambiente de desenvolvimento.

> **Stack:** TanStack Start · React 19 · Vite 8 · TypeScript · TailwindCSS 4 · shadcn/ui · Supabase · PGlite (validação de migrations sem Docker)

---

## 📋 Pré-requisitos

| Ferramenta | Versão mínima | Como instalar |
|---|---|---|
| **Bun** | 1.3+ | `curl -fsSL https://bun.sh/install \| bash` |
| **Node.js** | 22+ | `https://nodejs.org/` ou `nvm install 22` |
| **Supabase CLI** | 2.10+ | `npm install -g supabase` |
| **Docker** *(opcional)* | 28+ | `https://docs.docker.com/get-docker/` |
| **Git** | 2.40+ | `https://git-scm.com/` |

> ⚠️ Docker é necessário **apenas** se você quiser rodar o Supabase local completo (Studio, Auth, Realtime). Para apenas desenvolver o frontend, **não é preciso Docker**.

---

## 🚀 Quick Start (3 modos)

Escolha um dos três modos abaixo conforme sua necessidade:

### Modo A — Frontend com Supabase Cloud (mais rápido)

Usa o projeto Supabase cloud já existente (`ekaydicjiygflainmgdn`). Ideal para desenvolvimento frontend iterativo.

```bash
# 1. Clone o repositório
git clone https://github.com/clodoaldosilva608/projeto-paguemenos.git
cd projeto-paguemenos

# 2. Instale dependências
bun install

# 3. (Opcional) Crie o arquivo .env caso ainda não exista
#    Por padrão, o repo já vem com .env apontando para o Supabase cloud.
#    Para usar seu próprio projeto, edite:
cat > .env << 'EOF'
SUPABASE_URL="https://SEU-PROJETO.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_SUA_CHAVE"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_SUA_CHAVE"
EOF

# 4. Rode o servidor de desenvolvimento
bun dev
```

Acesse: **http://localhost:8080**

### Modo B — Frontend + Supabase Local (com Docker)

Roda tudo localmente, sem depender do cloud. Ideal para testes isolados e desenvolvimento de migrations.

```bash
# 1. Clone + instale dependências (igual ao Modo A)
git clone https://github.com/clodoaldosilva608/projeto-paguemenos.git
cd projeto-paguemenos
bun install

# 2. Inicie o Supabase local (requer Docker rodando)
supabase start

#    Saída esperada (URLs podem variar):
#    API URL:    http://127.0.0.1:54321
#    DB URL:     postgresql://postgres:postgres@127.0.0.1:54322/postgres
#    Studio URL: http://127.0.0.1:54323
#    Inbucket:   http://127.0.0.1:54324

# 3. Aplique as migrations + seed (automático no start, mas pode forçar)
supabase db reset

# 4. Configure o .env para apontar para o Supabase local
cat > .env << 'EOF'
SUPABASE_URL="http://127.0.0.1:54321"
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WeoamQnxnb2cZcZcZcZcZcZcZcZcZcZcZcZ"
VITE_SUPABASE_URL="http://127.0.0.1:54321"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WneoamQnxn4cZcZcZcZcZcZcZcZcZcZcZcZ"
EOF

# 5. Rode o frontend
bun dev
```

### Modo C — Apenas validar migrations (sem Docker, sem cloud)

Usa **PGlite** (Postgres WASM em Node.js) para validar todas as migrations e o seed sem precisar de Docker nem de acesso ao cloud. Ideal para CI/CD e validação em ambientes restritos.

```bash
# 1. Clone + instale dependências
git clone https://github.com/clodoaldosilva608/projeto-paguemenos.git
cd projeto-paguemenos
bun install

# 2. Instale a dependência de validação (já está em devDependencies)
#    mas se precisar reinstalar:
bun add -d @electric-sql/pglite

# 3. Rode o validador (script salvo em /home/z/my-project/scripts/)
bun run /home/z/my-project/scripts/validate-migrations.ts
```

Saída esperada:

```
✓ PGlite pronto
✓ Schema auth + pgcrypto + uuid-ossp criados
✓ 5/5 migrations aplicadas em 0.27s
✓ Seed aplicado em 128ms
✓ 9 usuários, 9 profiles, 9 roles, 8 invites aceitos
✓ 6 quick_links (5 ativos), 1 audit_log
✓ 12 RLS policies ativas
✓ 7 índices não-PK criados
```

---

## 🗂️ Estrutura de Pastas

```
projeto-paguemenos/
├── src/
│   ├── components/         # Componentes React + shadcn/ui (40+)
│   │   ├── ui/             # Primitives shadcn/ui
│   │   ├── pages/          # Páginas principais (Dashboard, Admin, etc)
│   │   └── admin/          # Subcomponentes do admin
│   ├── contexts/           # AuthContext + ThemeContext
│   ├── hooks/              # Hooks customizados (useStore, useIAChat, etc)
│   ├── integrations/
│   │   ├── supabase/       # Client + auth + tipos
│   │   └── lovable/        # Integração Lovable
│   ├── lib/                # Server functions (IA, OCR, Sheets, PowerBI)
│   ├── routes/             # File-based routing (TanStack Router)
│   ├── data/               # Mock data + stores
│   ├── types/              # Tipos TypeScript centrais
│   └── utils/              # Utilitários (cn, format, insights)
├── supabase/
│   ├── config.toml         # ⚙️ Configuração do Supabase local
│   ├── migrations/         # 5 arquivos SQL (aplicados em ordem)
│   └── seed.sql            # 🌱 Dados de demonstração
├── public/                 # Assets estáticos (PWA, manifest, icons)
├── docs/
│   └── SETUP-LOCAL.md      # Este arquivo
├── .env                    # Variáveis de ambiente (já vem no repo)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔐 Credenciais de Demonstração

Os usuários abaixo são criados pelo `seed.sql` em ambiente local (Modo B ou C):

| Email | Senha | Perfil | Cargo |
|---|---|---|---|
| `clodoaldo608@gmail.com` | `54321` | admin | Administrador |
| `gerente@orion.com` | `gerente123` | gerente | Gerente Regional |
| `supervisor@orion.com` | `supervisor123` | supervisor | Supervisora |
| `elielton@orion.com` | `vendedor123` | vendedor | Vendedor |
| `adelino@orion.com` | `vendedor123` | vendedor | Vendedor |
| `mieko@orion.com` | `vendedor123` | vendedor | Vendedor |
| `fabio@orion.com` | `vendedor123` | vendedor | Vendedor |
| `alicia@orion.com` | `vendedor123` | vendedor | Vendedora |
| `clodoaldo@orion.com` | `vendedor123` | vendedor | Vendedor |

> ⚠️ **NUNCA** use essas senhas em produção. São apenas para desenvolvimento local.

---

## 🗄️ Banco de Dados — Schema

Após aplicar as migrations, o banco terá:

### Tabelas em `public`
| Tabela | Descrição | RLS |
|---|---|---|
| `profiles` | Dados extendidos de usuário (nome, cargo, filial, avatar) | ✅ |
| `user_roles` | Papéis RBAC (`admin`, `gerente`, `supervisor`, `vendedor`) | ✅ |
| `invites` | Convites para novos usuários (token, status, expiração) | ✅ |
| `quick_links` | Atalhos customizáveis por perfil | ✅ |
| `audit_log` | Trilha de auditoria (actor, action, before/after jsonb) | ✅ |

### Tipos ENUM
- `app_role`: `admin` · `gerente` · `supervisor` · `vendedor`
- `invite_status`: `pendente` · `aceito` · `expirado` · `revogado`

### Funções SQL
- `has_role(user_uuid, role)` → `boolean` — Verifica se user tem determinada role (SECURITY INVOKER)
- `has_any_role(user_uuid, role[])` → `boolean` — Mesma coisa com array
- `handle_new_user()` — Trigger automático que cria profile + role quando novo usuário se registra (com suporte a convite + trial de 14 dias)

### Triggers
- `on_auth_user_created` — Dispara `handle_new_user()` após INSERT em `auth.users`

### RLS Policies (12 no total)
- **profiles**: 4 policies (own read, admin read all, own update, admin manage all)
- **user_roles**: 3 policies (own read, admin read all, admin manage)
- **invites**: 1 policy (admin manage all)
- **quick_links**: 3 policies (auth read, admin manage, gerentes manage)
- **audit_log**: 1 policy (admin read only)

---

## 🛠️ Comandos Disponíveis

### Desenvolvimento
```bash
bun dev          # Inicia Vite dev server (porta 8080)
bun run build    # Build de produção
bun run preview  # Preview do build
bun run lint     # ESLint
bun run format   # Prettier
```

### Supabase (requer Docker rodando)
```bash
supabase start                          # Inicia todos os serviços
supabase stop                           # Para todos os serviços
supabase status                         # Status atual
supabase db reset                       # Reset + migrations + seed
supabase db push                        # Aplica migrations pendentes
supabase migration list                 # Lista migrations locais vs remote
supabase migration new <nome>           # Cria nova migration
supabase db lint --local                # Lint schema local
supabase db diff --local                # Diff entre schema atual e migrations
supabase type gen --local > src/integrations/supabase/types.ts  # Regenera tipos TS
```

### Validação de Migrations (sem Docker)
```bash
# Script que usa PGlite para validar migrations + seed em memória
bun run /home/z/my-project/scripts/validate-migrations.ts
```

---

## 🌱 Como o Seed Funciona

O arquivo `supabase/seed.sql` é executado automaticamente após `supabase db reset`. Ele:

1. **Cria 8 usuários** em `auth.users` (com senhas bcrypt via `pgcrypto`)
2. **Cria 8 profiles** correspondentes em `public.profiles`
3. **Atribui roles** em `public.user_roles` (1 admin já existia da migration 4)
4. **Marca convites como aceitos** (atualiza `invites.status = 'aceito'`)
5. **Cria 5 quick_links** padrão (PDV, WhatsApp, Fornecedor, Manual, Férias)
6. **Registra entrada de auditoria** em `audit_log`

### IDs dos usuários no seed
Os UUIDs são gerados dinamicamente via `gen_random_uuid()` a cada reset. Para fixtures determinísticas, edite o `seed.sql` substituindo as chamadas `gen_random_uuid()` por UUIDs fixos.

---

## 🔄 Workflow de Desenvolvimento

### Adicionar uma nova feature completa

1. **Criar migration SQL:**
   ```bash
   supabase migration new add_campaings_table
   ```
   Isso cria `supabase/migrations/<timestamp>_add_campaings_table.sql`. Edite com seu DDL.

2. **Validar localmente (sem Docker):**
   ```bash
   bun run /home/z/my-project/scripts/validate-migrations.ts
   ```

3. **Aplicar no Supabase local:**
   ```bash
   supabase db reset
   ```

4. **Regenerar tipos TypeScript:**
   ```bash
   supabase type gen --local > src/integrations/supabase/types.ts
   ```

5. **Implementar frontend:**
   - Crie componentes em `src/components/`
   - Adicione rotas em `src/routes/`
   - Use hooks em `src/hooks/`

6. **Testar:**
   ```bash
   bun dev
   ```

### Deploy para o Supabase Cloud

```bash
# 1. Faça link com o projeto cloud (se ainda não feito)
supabase link --project-ref ekaydicjiygflainmgdn

# 2. Push das migrations
supabase db push

# 3. Verifique
supabase migration list --linked
```

---

## 🐛 Troubleshooting

### Erro: `Missing Supabase environment variable(s)`

Crie/edite `.env` na raiz do projeto com:
```env
SUPABASE_URL="https://SEU-PROJETO.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_SUA_CHAVE"
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_SUA_CHAVE"
```

### Erro: `failed to connect to postgres` ao rodar `supabase db lint`

O `db lint` precisa de um Postgres. Sem Docker, use a alternativa com PGlite:
```bash
bun run /home/z/my-project/scripts/validate-migrations.ts
```

### Erro: `Cannot find module '@electric-sql/pglite/contrib/uuid-ossp'`

O nome correto é com underscore: `@electric-sql/pglite/contrib/uuid_ossp`. Veja `node_modules/@electric-sql/pglite/dist/contrib/` para nomes exatos.

### Erro: `role "authenticated" does not exist`

Acontece em PGlite puro (sem bootstrap do Supabase). O script `validate-migrations.ts` já cria os roles `anon`, `authenticated`, `service_role` automaticamente.

### Erro: Porta 8080 em uso

Edite `vite.config.ts` ou use:
```bash
bun dev -- --port 8081
```

### Erro: `supabase start` falha com erro de Docker

Verifique:
1. Docker daemon está rodando: `docker info`
2. Você tem permissão: `sudo usermod -aG docker $USER` (depois faça logout/login)
3. Portas 54321-54324 não estão em uso: `lsof -i :54321`

### Login não funciona após `db reset`

Os usuários do seed usam passwords bcrypt. Se estiver usando Supabase Cloud (não local), os usuários precisam ser criados via Supabase Dashboard → Authentication → Users → Add user. O `seed.sql` só funciona em ambiente local.

---

## 📚 Referências

- **TanStack Start:** https://tanstack.com/start/latest
- **Supabase CLI:** https://supabase.com/docs/guides/local-development/cli
- **PGlite:** https://pglite.dev/
- **shadcn/ui:** https://ui.shadcn.com/
- **Vite:** https://vite.dev/

---

## 📄 Arquivos Relacionados

- `supabase/config.toml` — Configuração completa do Supabase local
- `supabase/migrations/*.sql` — 5 migrations (371 linhas SQL)
- `supabase/seed.sql` — Dados de demonstração
- `/home/z/my-project/scripts/validate-migrations.ts` — Validador PGlite
- `/home/z/my-project/download/auditoria-paguemenos.md` — Auditoria técnica do projeto
