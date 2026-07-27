# 🌟 Orion — Sistema de Gestão Multi-Empresa Pague Menos

Plataforma completa de gestão de metas, vendas e performance para redes de farmácias, construída com **TanStack Start + React 19 + Supabase + Vercel**.

![Status](https://img.shields.io/badge/status-produção-success)
![License](https://img.shields.io/badge/license-proprietary-red)
![Stack](https://img.shields.io/badge/stack-TanStack%20Start%20%2B%20Supabase-blue)

## 🚀 Demo

**URL de produção:** https://projeto-paguemenos.vercel.app

### 🔐 Credenciais de acesso

| Perfil | Login | Senha |
|--------|-------|-------|
| **Admin Master** | `clodoaldosilva608@gmail.com` | `Silva88677488` |
| Vendedor (Adelino) | `adelino` | `700207473` |
| Vendedor (Alicia) | `alicia` | `70211738` |
| Vendedor (Clodoaldo) | `clodoaldo` | `71214306` |
| Vendedor (Elielton) | `elielton` | `70213458` |
| Vendedor (Fabio) | `fabio` | `70210130` |
| Vendedor (Mieko) | `mieko` | `70214316` |

> 💡 Vendedores fazem login usando **primeiro nome + matrícula** (a matrícula é a senha).

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
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (server only) |
| `VITE_SUPABASE_URL` | URL do Supabase (client) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (client) |

> ⚠️ **NUNCA commite o arquivo `.env` real!** Use `.env.example` como template.

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

## 📝 Licença

Proprietary — © 2026 Pague Menos. Todos os direitos reservados.

## 👥 Equipe

- **Desenvolvimento:** Clodoaldo Silva
- **Gestão:** Equipe Pague Menos

## 📞 Suporte

Para suporte ou dúvidas, entre em contato via painel admin do sistema.
