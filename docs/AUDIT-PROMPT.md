# Auditoria Completa de Engenharia — Orion (Pague Menos)

> **Prompt-mestre de auditoria técnica do projeto Orion.**
> Este documento contém o prompt completo utilizado para realizar a auditoria
> de prontidão para 100.000 usuários ativos. Ele deve ser re-executado a cada
> grande mudança arquitetural, ou no mínimo a cada 6 meses, para garantir que
> o sistema continua seguro e escalável.

---

## Como usar este documento

1. **Reexecutar a auditoria:** copie o prompt abaixo e cole em uma sessão com
   acesso ao repositório. O auditor deve estar em **modo somente leitura** —
   nenhuma alteração deve ser feita durante a inspeção.
2. **Comparar com baseline:** o relatório de auditoria de 2026-08-04 está em
   `docs/audit-2026-08-04-baseline.md`. Use-o como referência para verificar
   se os problemas identificados foram resolvidos.
3. **Atualizar após correções:** a cada fase do plano de correção concluída,
   adicionar uma seção "Pós-Fase N" ao baseline documentando o que foi
   corrigido e o que ainda pendente.

---

## Prompt-mestre de auditoria

```
Seu objetivo é realizar uma auditoria e varredura completa ("Code & Architecture
Review") no sistema que criamos até aqui, avaliando sua prontidão para suportar
100.000 usuários ativos.

Quero que você analise toda a estrutura do projeto sob a ótica de engenharia de
software de ponta e me entregue um diagnóstico rigoroso, sem floreios, apontando
exatamente onde estão os gargalos, falhas de arquitetura, buracos de segurança
e riscos de escalabilidade.

### Mapeamento e Análise Requerida

Por favor, faça uma varredura considerando os seguintes pilares:

#### 1. Arquitetura do Sistema e Escalabilidade
- O modelo atual de arquitetura (Monólito, Microserviços, Serverless, etc.) se
  sustenta com 100k usuários?
- Onde estão os Pontos Únicos de Falha (SPOFs)?
- O sistema é *stateless* o suficiente para escalar horizontalmente de forma
  simples?
- Quais gargalos de concorrência ou I/O você prevê sob alta carga?

#### 2. Banco de Dados e Camada de Dados
- Como os modelos e relacionamentos atuais vão se comportar com milhões de
  registros?
- Onde faltam índices, e quais queries correm o risco de fazer *table scans*
  custosos?
- Há estratégias adequadas de caching (ex: Redis), conexão em pool, réplicas
  de leitura ou estresse de escrita?
- Risco de gargalo em transações (*locks* excessivos, condições de corrida)?

#### 3. Código, Padrões e Dívida Técnica
- O código segue boas práticas de engenharia (SOLID, Clean Architecture,
  separação clara de responsabilidades)?
- Existem vazamentos de memória (*memory leaks*), loops ineficientes ou falta
  de tratamento assíncrono/filas para tarefas pesadas?
- Qual o nível de acoplamento do código e o quão difícil será dar manutenção
  no futuro?

#### 4. Segurança e Resiliência
- Onde estão os riscos de segurança mais críticos (ex: OWASP Top 10,
  autenticação, autorização/RBAC, vazamento de dados de usuários)?
- O sistema possui controle de taxa (*rate limiting*) para prevenir ataques DoS
  ou abuso de APIs?
- Como o sistema se comporta se um serviço externo/API falhar? Há mecanismos de
  *circuit breaker*, *retries* ou *degradation* graciosa?

#### 5. Observabilidade e Operação
- O sistema tem logs, métricas e rastreamento (*tracing*) suficientes para
  diagnosticarmos um problema rapidamente em produção?

### Formato da Resposta Esperada

1. **Resumo Executivo:** Diagnóstico geral da saúde do sistema (Nota de 1 a 10
   para prontidão de 100k usuários).
2. **Riscos Críticos (P0 - Blocker):** O que vai quebrar ou derrubar o sistema
   assim que a carga aumentar.
3. **Riscos Médios (P1 - High):** Ineficiências de código/dados que vão custar
   caro em infraestrutura ou deixar o sistema lento.
4. **Melhorias de Arquitetura (P2 - Medium):** Refatorações recomendadas para
   manter a manutenibilidade a longo prazo.
5. **Plano de Ação Passo a Passo:** Lista priorizada das primeiras coisas que
   devemos ajustar no projeto.

---

# AUDITORIA COMPLETA DE ENGENHARIA — ORION (PAGUE MENOS)

Faça uma auditoria técnica completa, profunda e independente de todo o sistema
do Orion.

Atue como um Principal Software Architect + Principal Engineer + especialista
em sistemas distribuídos, segurança, bancos de dados, escalabilidade,
performance, SRE/DevOps e engenharia de software, com nível técnico equivalente
ao de um pesquisador PhD de uma das melhores universidades do mundo e,
principalmente, com experiência prática em sistemas SaaS de grande escala.

Não quero uma revisão superficial de código.

Quero descobrir o que existe hoje, como o sistema realmente funciona, onde estão
as falhas, quais são os riscos ocultos e o que precisa ser feito para que o
Orion possa crescer até 100.000 usuários sem precisarmos reconstruir tudo às
pressas.

# REGRA ABSOLUTA: NÃO ALTERE NADA

Nesta primeira etapa você está em MODO SOMENTE LEITURA / AUDITORIA.

NÃO:
- altere arquivos;
- refatore código;
- corrija problemas;
- instale dependências;
- atualize dependências;
- execute migrations;
- altere banco de dados;
- altere configurações;
- faça deploy;
- remova arquivos;
- crie arquivos;
- altere variáveis de ambiente;
- faça qualquer mudança permanente no projeto.

Você pode executar comandos não destrutivos para inspeção, análise, testes e
diagnóstico.

# ETAPAS

1. Inventário completo do projeto (estrutura, configs, package.json, migrations)
2. Identificação da stack (framework, auth, DB, hosting, integrações)
3. Mapeamento da arquitetura atual
4. Análise da arquitetura de software (coesão, acoplamento, dívida)
5. Banco de dados (tabelas, índices, RLS, race conditions, locks)
6. Multi-tenancy (isolamento efetivo entre tenants)
7. Segurança (OWASP Top 10, SQL injection, XSS, CSRF, SSRF, IDOR)
8. Autenticação e autorização (RBAC, sessões, tokens)
9. APIs (inventário, validação, rate limiting, paginação)
10. Performance (frontend bundle, backend queries, N+1)
11. Escalabilidade (1k → 10k → 50k → 100k usuários)
12. Concorrência e race conditions
13. Resiliência (timeout, circuit breaker, retries, idempotência)
14. Filas e processamento assíncrono
15. Observabilidade (logs, métricas, traces, alertas)
16. Custos (onde podem explodir)
17. Dependências (vulneráveis, antigas, duplicadas)
18. Testes (cobertura por área)
19. Ataque adversarial (hacker, usuário malicioso, crescimento 10x)
20. "Buracos encontrados" (incompleto, frágil, improvisado)
21. Classificação dos riscos (CRÍTICO/ALTO/MÉDIO/BAIXO)
22. O que quebra primeiro (1º a 5º componente)
23. Roadmap de escala (AGORA → 1k → 10k → 50k → 100k)
24. Arquitetura alvo (precisamos agora? podemos esperar?)
25. Overengineering a evitar

# FORMATO FINAL DO RELATÓRIO

1. Resumo Executivo
2. Nota da Engenharia Atual (0-10 por dimensão)
3. Arquitetura Atual
4. Diagrama (Mermaid)
5. Top 20 Problemas (tabela com severidade, evidência, impacto, prioridade)
6. Buracos Encontrados
7. Segurança (OWASP completo)
8. Multi-Tenancy
9. Banco de Dados
10. Escalabilidade (1k → 10k → 50k → 100k)
11. Performance
12. Resiliência
13. Observabilidade
14. Custos
15. O Que Quebra Primeiro?
16. Roadmap (AGORA / 1k / 10k / 50k / 100k)
17. Arquitetura Recomendada
18. Overengineering a Evitar
19. Plano de Ação (FAZER IMEDIATAMENTE / EM SEGUIDA / PODE ESPERAR / NÃO MEXER)
20. Veredito Final

# REGRAS ABSOLUTAS

1. Não faça elogios genéricos.
2. Não diga "está bom" sem evidência.
3. Não presuma que algo funciona. Verifique.
4. Não invente infraestrutura.
5. Não invente métricas.
6. Diferencie claramente: fato observado / inferência / hipótese / recomendação.
7. Sempre que possível, cite arquivo e linha.
8. Priorize segurança, escala, custo, disponibilidade e manutenção.
9. Não proponha reescrever tudo sem necessidade.
10. Não faça alterações no projeto.
11. Não instale nada.
12. Não atualize nada.
13. Não faça migrations.
14. Não faça deploy.
15. Não tente me agradar.
16. Se algo estiver errado, diga que está errado.
17. Se algo estiver perigoso, diga que está perigoso.
18. Se algo estiver excelente, explique tecnicamente por quê.
19. Se não houver dados suficientes para concluir, escreva:
   "NÃO FOI POSSÍVEL DETERMINAR COM OS DADOS DISPONÍVEIS."
20. Não confunda "funciona hoje" com "está preparado para escala".

# PERGUNTA FINAL

> Se o Orion crescer 10x nos próximos meses, quais são os 5 problemas que mais
> podem colocar o negócio em risco?
>
> Qual é o menor conjunto de mudanças que devemos fazer AGORA para reduzir
> drasticamente esses riscos sem fazer overengineering?
```

---

## Histórico de auditorias

| Data | Versão | Auditor | Nota geral | Relatório |
|---|---|---|---|---|
| 2026-08-04 | v1.0 | GLM (Principal Architect) | 2.6 / 10 | `docs/audit-2026-08-04-baseline.md` |

## Próxima auditoria recomendada

- **Data:** 2026-11-04 (3 meses após correções P0+P1)
- **Foco:** verificar se correções resistiram ao uso real
- **Métrica-alvo:** nota geral ≥ 7.0 / 10

---

## Plano de correção

O plano de correção completo está em `docs/CORRECTION-PLAN.md`. Resumo:

| Fase | Duração | Severidade | Status |
|---|---|---|---|
| 0 | 2h | Preparação | Pendente |
| 1 | 1 dia | P0 | Pendente |
| 2 | 1 dia | P0 | Pendente |
| 3 | 2 dias | P0 | Pendente |
| 4 | 1 dia | P0 | Pendente |
| 5 | 2 dias | P1 | Pendente |
| 6 | 2 dias | P1 | Pendente |
| 7 | 2 dias | P1 | Pendente |
| 8 | 2 dias | P2 | Pendente |
| 9 | 3 dias | P2 | Pendente |

**Total: 16 dias úteis (~3 semanas)** para resolver P0+P1+P2 críticos.
