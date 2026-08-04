# 🌟 Orion — Sistema de Gestão Multi-Empresa Pague Menos

Plataforma completa de gestão de metas, vendas e performance para redes de farmácias, construída com **TanStack Start + React 19 + Supabase + Vercel**.

![Status](https://img.shields.io/badge/status-produção-success)
![License](https://img.shields.io/badge/license-proprietary-red)
![Stack](https://img.shields.io/badge/stack-TanStack%20Start%20%2B%20Supabase-blue)
![Audit](https://img.shields.io/badge/auditoria-2026--08--04-orange)

## 🚀 Demo

**URL de produção:** https://orion-vendas.vercel.app

### 🔐 Credenciais de acesso

> ⚠️ **SECURITY:** Credenciais reais NÃO são mais listadas neste README.
> Elas foram expostas no histórico do git (em `README.md`, `vercel.json`,
> `src/scripts/verify-isolation.ts`, etc.) e devem ser consideradas
> **comprometidas**. Troque imediatamente a senha de todas as contas
> admin/gerente/supervisor/vendedor e regenere a service role key no painel
> do Supabase (Project Settings → API → Reset service_role key).
>
> Para acesso de demonstração, peça as credenciais ao administrador do projeto
> por canal seguro (não via repositório público).

| Perfil | Login | Senha |
|--------|-------|-------|
| **Admin Master** | _(solicite ao admin do projeto)_ | _(trocada após incidente)_ |
| Vendedores (Adelino, Alicia, Clodoaldo, etc.) | `<primeiro_nome>` | `<matrícula>` |

> 💡 Vendedores fazem login usando **primeiro nome + matrícula** (a matrícula é a senha).
> A matrícula de cada vendedor deve ser obtida pelo admin via painel "Credenciais".

## ✨ Funcionalidades Principais

### 📊 Dashboard Administrativo
- Visão consolidada de metas mensais e individuais por vendedor
- Tabela estilo "Pague Menos" com 10 colunas (meta, realizado, projeção, %, status)
- Totais da filial (meta mensal, diária, clientes, TKM, UVC)
- Ranking por % de atingimento
- Modal de edição de metas por vendedor
- **Impersonate**: admin/gerente pode acessar dashboard de qualquer vendedor sem novo login

### 💰 Lançamento de Vendas Diárias
- Formulário com data, categoria, valor, clientes, observação
- Cálculo automático de ticket médio
- Validações: bloqueia data futura, valores ≤ 0, valores > R$ 10M, ticket médio anômalo
- Lista de lançamentos recentes agrupados por data
- Editar e excluir lançamentos
- **Sincronização automática**: ao lançar venda, atualiza `valor_realizado` da meta mensal

### 🎯 Metas e Resultados
- Metas mensais e diárias por categoria (faturamento, marcas_exclusivas, genericos, super_desconto)
- Projeção automática de fechamento mensal
- Barras de progresso com marcador de projeção
- Painel de resultados com filtros

### 🤖 Assistente IA
- Chat flutuante com sugestões de perguntas
- Configuração dinâmica de provedor (OpenAI, Google Gemini, Anthropic, Azure, OpenRouter, Lovable)
- Editor de Prompt Mestre + Especialização + Estilo (tom, criatividade, temperatura)
- Logs de uso com filtros, busca e exportação CSV
- Modo demonstração (sem API externa) para testes

### 📱 Configuração de Tela
- 11 estilos de navegação personalizáveis por usuário:
  - Clássicos: Guidão flutuante, Dock inferior, Lateral flutuante, Topo minimal
  - Premium: Cápsula Flutuante, FAB Inteligente, Nav por Perfil, Dock Animado (macOS), Nav Morphing, Quick Actions, Nav Inteligente
- Cada usuário escolhe seu estilo preferido (salvo no banco)

### 🔐 Segurança e Permissões
- **Sistema de aprovação**: novos usuários precisam ser aprovados pelo admin
- **RLS (Row Level Security)** em todas as tabelas
- **Login por matrícula**: vendedores usam primeiro nome + matrícula
- **Painel de Credenciais**: admin/gerente gerencia matrículas e senhas
- **Auditoria**: logs de todas as ações administrativas
- **Impersonate seguro**: banner amarelo + botão "Voltar ao painel admin"

### 📦 Outros Módulos
- **Campanhas**: CRUD completo (criar, editar, ativar/pausar/encerrar, excluir)
- **Funcionários**: cards com filtros por perfil e status
- **Dashboard do Funcionário**: Atendimento de Coração, Compromissos, Rotina de Execução, Treinamentos, Checklist Diário
- **Encarte Promocional Digital**: campanhas visuais
- **Documentos**: CRUD por usuário
- **Currículo**: histórico de cursos
- **Integrações**: Google Sheets OAuth, Power BI, Links Rápidos
- **Tour Guiado**: onboarding por perfil
- **Modo escuro/claro**

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Framework** | TanStack Start (React 19) |
| **Build** | Vite 8 + Nitro |
| **Linguagem** | TypeScript |
| **Estilo** | TailwindCSS 4 |
| **Backend** | Supabase (Postgres + Auth + RLS) |
| **Animações** | Framer Motion |
| **Ícones** | Lucide React |
| **Deploy** | Vercel (via CLI) |
| **Validação** | Zod |
| **Banco** | PostgreSQL (Supabase) |

## 📁 Estrutura do Projeto

```
projeto-paguemenos/
├── src/
│   ├── components/          # Componentes React
│   │   ├── admin/          # Abas do painel admin
│   │   ├── navbars/        # 11 estilos de navegação
│   │   ├── pages/          # Páginas principais
│   │   ├── tour/           # Tour guiado
│   │   └── ...
│   ├── contexts/           # AuthContext, ThemeContext
│   ├── lib/                # Server functions (TanStack Start)
│   │   ├── admin.functions.ts
│   │   ├── ia.functions.ts
│   │   ├── ia-config.functions.ts
│   │   ├── login-matricula.functions.ts
│   │   └── ...
│   ├── integrations/       # Supabase client + types
│   │   └── supabase/
│   ├── routes/             # Rotas TanStack Start
│   └── OrionApp.tsx        # Layout principal
├── supabase/
│   └── migrations/         # SQL versionado
├── package.json
├── vite.config.ts
└── vercel.json
```

## 🔧 Configuração Local

### Pré-requisitos
- Node.js 24+
- Bun (recomendado) ou npm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/clodoaldosilva608/projeto-paguemenos.git
cd projeto-paguemenos

# Instale as dependências
bun install
# ou
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# Rode em desenvolvimento
bun dev
# ou
npm run dev

# Build para produção
npm run build
```

### Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (server only, **NUNCA no vercel.json**) |
| `VITE_SUPABASE_URL` | URL do Supabase (client) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (client) |
| `SUPABASE_ANON_KEY` | Usada pelo script de verificação de isolamento |
| `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` | Credenciais admin (apenas teste) |
| `TEST_GERENTE_1001_*` / `TEST_GERENTE_2001_*` | Credenciais de gerentes de teste |
| `TEST_SUPERVISOR_1001_*` | Credenciais de supervisor de teste |
| `TEST_VENDEDOR_1001_*` / `TEST_VENDEDOR_2002_*` | Credenciais de vendedores de teste |

> ⚠️ **NUNCA commite o arquivo `.env` real!** Use `.env.example` como template.
> O `.env` já está no `.gitignore`. Caso credenciais reais tenham sido expostas
> no histórico do git (incidente anterior com `src/scripts/verify-isolation.ts`),
> considere TODAS as contas comprometidas e troque as senhas imediatamente —
> a correção do arquivo não desfaz a exposição já ocorrida.

### Script de Verificação de Isolamento

`src/scripts/verify-isolation.ts` valida que o RLS está funcionando: vendedor não vê outra filial, gerente não vê outra equipe (dentro da mesma filial), supervisor vê toda a filial, admin vê tudo.

**Pré-requisitos:**
1. Arquivo `.env` na raiz com todas as variáveis `TEST_*` preenchidas (veja `.env.example`).
2. `bun` instalado (ou `npx tsx`).
3. As migrations de isolamento aplicadas no Supabase (incluindo a criação de uma segunda equipe `eq-1001-noite` dentro da filial 1001 — ver `20260730130001_isolamento_equipe_id.sql`).

**Executar:**

```bash
bun run src/scripts/verify-isolation.ts
# ou
npx tsx src/scripts/verify-isolation.ts
```

O script falha com erro explícito se qualquer variável de ambiente estiver ausente — nenhuma credencial é hardcoded.

## 🚀 Deploy

### Via Vercel CLI (recomendado)

```bash
# Instale a Vercel CLI
npm install -g vercel

# Faça login
vercel login

# Deploy para produção
vercel deploy --prod --yes
```

### Variáveis de Ambiente na Vercel

Configure em https://vercel.com/dashboard → Project → Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `NITRO_PRESET` = `vercel`

## 🗃️ Banco de Dados

### Migrations

As migrations estão em `supabase/migrations/` e devem ser aplicadas no Supabase Studio → SQL Editor:

| Migration | Descrição |
|-----------|-----------|
| `20260717123336_b0eff635...` | Schema inicial (audit_log, invites, profiles, user_roles, quick_links) |
| `20260722020000_treinamentos.sql` | Tabela de treinamentos |
| `20260723100000_ai_config.sql` | Configuração da IA (ai_config, ai_logs, ai_prompt_versions) |
| `20260724100000_vendas_diarias.sql` | Vendas diárias dos vendedores |
| `20260724130000_campanhas.sql` | Tabela de campanhas |
| `20260725090000_login_matricula.sql` | Login por matrícula |
| `20260727000001_metas_individuais_retroativa.sql` | Metas individuais (retroativa) |
| `20260727000002_profiles_aprovado.sql` | Colunas de aprovação em profiles |
| `20260727000003_fix_vendas_diarias_rls.sql` | Fix RLS vendas_diarias |

### Tabelas Principais

- `profiles` — perfis de usuário (com `aprovado`, `navbar_variant`)
- `user_roles` — roles (admin, gerente, supervisor, vendedor)
- `metas_individuais` — metas mensais/diárias por vendedor
- `vendas_diarias` — vendas lançadas pelos vendedores
- `campanhas` — campanhas comerciais
- `login_matricula` — credenciais por matrícula
- `ai_config` — configuração da IA
- `ai_logs` — logs de uso da IA
- `audit_log` — auditoria de ações

## 🔒 Segurança

- ✅ RLS habilitado em todas as tabelas
- ✅ Service role key apenas no server (nunca no client)
- ✅ Validação de entrada com Zod em todas as server functions
- ✅ Sistema de aprovação de novos usuários
- ✅ Login por matrícula para vendedores
- ✅ Auditoria de ações administrativas
- ⚠️ **Rotacionar service role key** se exposta no histórico git

---

## 🔍 Auditoria de Engenharia

O projeto passou por uma **auditoria técnica completa** em **2026-08-04**,
avaliando prontidão para 100.000 usuários ativos. O relatório completo está
em [`docs/audit-2026-08-04-baseline.md`](docs/audit-2026-08-04-baseline.md).

### Nota geral: 2.6 / 10 (antes das correções)

| Dimensão | Nota |
|---|---|
| Arquitetura | 4/10 |
| Segurança | 2/10 |
| Banco de dados | 3/10 |
| Escalabilidade | 3/10 |
| Performance | 4/10 |
| Resiliência | 2/10 |
| Observabilidade | 1/10 |
| Testes | 0/10 |
| Manutenibilidade | 4/10 |
| DevOps/Deploy | 3/10 |

### 9 riscos CRÍTICOS (P0) identificados

1. `gerarPlanilhaExecutiva` sem auth — vazamento de PII + matrículas
2. Token hardcoded `"orion-public-demo"` no endpoint PowerBI
3. `extractVendasFromImage` sem auth — custo ilimitado de IA
4. `criarTabelasEquipesFiliais` sem auth — DDL não autorizado
5. Senha admin `54321` hardcoded em migration SQL
6. `buscarEmailPorMatricula` retorna senha ao client
7. Escalonamento de privilégio: gerente vira admin via CRUD genérico
8. Trigger aceita `role` do `user_metadata` controlável pelo atacante
9. Usuário pode alterar `filial_id`, `equipe_id`, `plano` no próprio profile

### Plano de correção

**10 fases** (~16 dias úteis) para resolver P0+P1+P2:

- 📋 Plano completo: [`docs/CORRECTION-PLAN.md`](docs/CORRECTION-PLAN.md)
- 🎯 Prompt-mestre (reutilizável): [`docs/AUDIT-PROMPT.md`](docs/AUDIT-PROMPT.md)
- 📊 Baseline da auditoria: [`docs/audit-2026-08-04-baseline.md`](docs/audit-2026-08-04-baseline.md)

### Progresso das correções

| Fase | Severidade | Status |
|---|---|---|
| 0 — Preparação | — | 🔄 Em andamento |
| 1 — Fechar endpoints sem auth | P0 | ⏳ Pendente |
| 2 — Remover hardcoded secrets | P0 | ⏳ Pendente |
| 3 — RLS + multi-tenancy | P0 | ⏳ Pendente |
| 4 — Migrations quebradas | P0 | ⏳ Pendente |
| 5 — Rate limit Redis + Sentry | P1 | ⏳ Pendente |
| 6 — Performance DB + cache | P1 | ⏳ Pendente |
| 7 — Frontend: code splitting | P1 | ⏳ Pendente |
| 8 — Resiliência + circuit breaker | P2 | ⏳ Pendente |
| 9 — Testes + CI/CD | P2 | ⏳ Pendente |

> **Reauditar** a cada 3 meses usando o prompt-mestre em `docs/AUDIT-PROMPT.md`.

---

## 📝 Licença

Proprietary — © 2026 Pague Menos. Todos os direitos reservados.

## 👥 Equipe

- **Desenvolvimento:** Clodoaldo Silva
- **Gestão:** Equipe Pague Menos

## 📞 Suporte

Para suporte ou dúvidas, entre em contato via painel admin do sistema.
