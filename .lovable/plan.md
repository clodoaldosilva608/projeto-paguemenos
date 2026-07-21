# Plano — Fase 5 Final

## 1. Unificar Assistente IA (página + FAB)
- Refatorar `src/components/pages/IAPage.tsx` para consumir `chatIA` de `src/lib/ia.functions.ts` via `useServerFn` — remover respostas mockadas.
- Extrair hook compartilhado `src/hooks/useIAChat.ts` com estado de mensagens, envio, contexto do usuário e sugestões, reutilizado por `IAPage` e `IAAssistantFAB`.
- Insights automáticos passam a ser gerados chamando `chatIA` com prompt de análise dos dados de `vendasStore` (cache em memória por sessão).

## 2. CRUD Admin completo
Refatorar `src/components/pages/AdminPage.tsx` em abas: **Usuários · Convites · Quick Links · Integrações · Auditoria · Configurações**.

- **Usuários**: listar todos via server fn, filtros (perfil/status/filial), ações: editar (nome, perfil, filial, equipe, cargo, telefone, ativo), resetar senha (Auth Admin), desativar/reativar, excluir. Ações registradas em `audit_log`.
- **Convites**: listar convites com status (pendente/aceito/expirado), reenviar e-mail, revogar, criar novo com perfil/filial/equipe. Envio automático de e-mail (via Lovable email).
- **Quick Links**: DnD já iniciado — finalizar com `@dnd-kit`, preview do ícone, toggle ativo, editar link/label/cor.
- **Auditoria**: já existe, apenas garantir integração e filtros.
- Todas as ações mutantes passam por server functions em `src/lib/admin.functions.ts` com `requireSupabaseAuth` + verificação de role (admin/gerente/supervisor conforme escopo).

## 3. Plugar aba Integrações
- Importar e renderizar `IntegracoesTab` como aba no `AdminPage`.
- Aba mostra dois cards:
  - **Google Sheets**: campo URL CSV publicado, salvar/desativar, botão "Sincronizar agora", exibir `last_pulled_at` e último log.
  - **Power BI**: listar tokens, criar novo (com escopo), copiar URL de consumo `/api/public/powerbi/vendas?token=...&format=csv|json`, revogar.

## 4. Rota pública Power BI
Criar `src/routes/api/public/powerbi/vendas.ts`:
- `GET` valida `token` query param contra `powerbi_tokens` (ativo), atualiza `ultimo_uso_em`.
- Retorna vendas conforme `escopo` (proprio = user do token, equipe = mesma equipe, todos = admin/gerente).
- Formato via `?format=csv` (default) ou `json`. Colunas: `data, vendedor, filial, valor_liquido, clientes_liquido, ticket_medio`.
- Headers CORS e `Cache-Control: no-store`.

## 5. Sync Google Sheets — separação gestor/funcionário
- Gestor configura planilha oficial (`sheet_sync_config` global) na aba Integrações.
- Nova server fn `puxarVendasDoSheet` já parseia — plugar resultado num store local persistido (`vendasStore.mergeFromSheet(rows)`), preservando edições locais do vendedor logado (campo `origem: 'sheet' | 'manual'`).
- Funcionário edita apenas suas próprias linhas no dashboard (`RelatorioVendasPage`), sem alterar linhas de outros vendedores mesmo quando vindas do Sheet.
- Regra de merge: linha do Sheet sobrescreve linhas `origem=sheet`; nunca sobrescreve `origem=manual` do próprio usuário.

## 6. Atualização automática (polling)
- Criar hook `src/hooks/useAutoSync.ts` que a cada 60s (configurável) chama `puxarVendasDoSheet` quando há config ativa e usuário autenticado.
- Registrar no `OrionApp` (apenas 1 instância global). Mostrar indicador discreto "Sincronizado há Xs" no header.
- Para Power BI, o polling é do lado externo (Power BI puxa nossa rota). Adicionar botão "Testar endpoint" na aba Integrações.
- Realtime opcional: assinar canal Supabase `sheet_sync_log` para invalidar imediatamente quando outro admin dispara sync.

## Arquivos a criar/editar
```
src/hooks/useIAChat.ts               (novo)
src/hooks/useAutoSync.ts             (novo)
src/components/pages/IAPage.tsx      (refatorar → IA real)
src/components/IAAssistantFAB.tsx    (usar hook compartilhado)
src/components/pages/AdminPage.tsx   (abas + CRUD completo)
src/components/admin/IntegracoesTab.tsx (finalizar UI)
src/components/admin/QuickLinksDnD.tsx (novo — DnD isolado)
src/lib/admin.functions.ts           (add reset/desativar/excluir/convite reenvio)
src/lib/sheets.functions.ts          (add mergeFromSheet lógica)
src/lib/powerbi.functions.ts         (add rota de consumo helper)
src/routes/api/public/powerbi/vendas.ts (nova rota)
src/data/vendasStore.ts              (add campo origem + merge)
src/OrionApp.tsx                     (montar useAutoSync)
```

## Detalhes técnicos
- Envio de e-mail de convite: usar Lovable email (fallback: gerar link `/welcome?token=...` copiável se serviço indisponível).
- RBAC: gerente/supervisor podem gerenciar usuários da própria filial; apenas admin cria/exclui outros admins e edita Integrações globais.
- Auditoria registra: `acao, alvo_tipo, alvo_id, autor_id, autor_email, metadata` em todas as mutações admin.
- Nenhuma alteração de schema — todas as tabelas necessárias já existem (`profiles`, `invites`, `quick_links`, `sheet_sync_config`, `sheet_sync_log`, `powerbi_tokens`, `audit_log`).
