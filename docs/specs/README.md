# Specs por módulo

Uma spec é o **contrato durável** de um módulo: versionada, revisável em pull request, evoluindo junto do código. A issue do GitHub é a **atribuição** — aponta para a spec e fecha quando o trabalho termina. Ver "Especificação e trabalho com agentes" no `Plano_Geral_de_Desenvolvimento.md`.

Toda spec é **autossuficiente**: o agente lê `CLAUDE.md` + `CONTEXT.md` + as ADRs que a spec cita + a própria spec, e nada mais. Não há histórico de conversa a recuperar. Se uma spec exigir contexto que não está nesses arquivos, é bug da spec — corrija a spec, não adivinhe.

## Esqueleto fixo

```
Objetivo · Vocabulário · Decisões que governam · Modelo de dados ·
Regras de negócio · Contratos de API · Telas e componentes ·
Critérios de aceite · Fora de escopo · Depende de
```

Seção sem conteúdo é omitida, não preenchida com "n/a".

## Transversais

| Spec | O que cobre |
|---|---|
| [`modelo-de-dados.md`](modelo-de-dados.md) | **Canônico.** Todas as tabelas das seis fases. Nenhuma spec de módulo redefine coluna; cita esta |
| [`design-system.md`](design-system.md) | `packages/ui` a partir do export do Claude Design |

## Fase 0 — Fundação

Ordem de execução. As setas são bloqueios reais, não preferência.

```
fase-0-monorepo
      ├──> fase-0-banco-e-rls ──> fase-0-autenticacao-e-contexto ──> fase-0-permissoes
      │                                                                     │
      ├──> design-system                                                    │
      │                                                                     v
      └──────────────────────────────────────────────────────> fase-0-ci-e-deploy
```

| Spec | Entrega | Depende de |
|---|---|---|
| [`fase-0-monorepo.md`](fase-0-monorepo.md) | Monorepo, Postgres em container, infraestrutura de testes, lint, env validado | — |
| [`fase-0-banco-e-rls.md`](fase-0-banco-e-rls.md) | Drizzle, os dois papéis, RLS com os testes de guarda, wrapper de transação, wrapper de auditoria | monorepo |
| [`fase-0-autenticacao-e-contexto.md`](fase-0-autenticacao-e-contexto.md) | Better Auth, vínculos, resolução de empresa por slug, super admin, CLIs | banco-e-rls |
| [`fase-0-permissoes.md`](fase-0-permissoes.md) | Catálogo de permissões, perfis de acesso semeados, middleware, escopo de dados | autenticacao-e-contexto |
| [`design-system.md`](design-system.md) | `packages/ui` | monorepo |
| [`fase-0-ci-e-deploy.md`](fase-0-ci-e-deploy.md) | CI, deploy contínuo, "hello world" autenticado em produção | permissoes, design-system |

`design-system` é paralelizável com toda a trilha de banco — não há código compartilhado entre as duas.

## Fases 1–5

Escritas quando a fase chegar, contra o modelo de dados que já está fechado. Não antecipe: spec escrita cedo demais envelhece sem ninguém notar, e a Fase 0 ainda pode ensinar algo que muda a forma delas.
