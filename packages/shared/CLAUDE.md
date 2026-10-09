# packages/shared

Schemas Zod, tipos, metadados de campo e constantes usados pela API e pelo front. Não depende de nenhum outro pacote.

- **Spec:** `docs/specs/fase-0-monorepo.md`

## Convenções locais

- `src/env.ts` é o **único** arquivo do projeto que lê o ambiente do processo. Variável nova entra no schema dali e no `.env.example`, comentada. Um teste (`test/no-process-env.test.ts`) falha se outro arquivo ler o ambiente.
- O módulo de ambiente é exportado só em `@crm/shared/env`, nunca pelo índice: o front importa o índice, e no navegador não há `process`.
- Tudo aqui precisa rodar no navegador e no Node: sem I/O, sem dependência de Node no índice.
