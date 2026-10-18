# packages/shared

Schemas Zod, tipos, metadados de campo e constantes usados pela API e pelo front. Não depende de nenhum outro pacote.

- **Spec:** `docs/specs/fase-0-monorepo.md`; `docs/specs/fase-0-permissoes.md` (catálogo de permissões)

## Convenções locais

- `src/env.ts` é o **único** arquivo do projeto que lê o ambiente do processo. Variável nova entra no schema dali e no `.env.example`, comentada. Um teste (`test/no-process-env.test.ts`) falha se outro arquivo ler o ambiente.
- O front não tem `process`: valida `import.meta.env` por `webEnvSchema` (em `apps/web/src/env.ts`, o único lugar do front que lê o ambiente). Só entra ali o que pode ir para o bundle. Os schemas do módulo levam `/* @__PURE__ */`, para os da API não irem junto.
- O módulo de ambiente é exportado só em `@crm/shared/env`, nunca pelo índice: o front importa o índice, e no navegador não há `process`.
- `src/user.ts` tem os **únicos** serializadores de usuário: `serializeUser` e, para listagem de equipe e seletor de responsável, `serializeTeamMember` (que passa por `serializeUser`). São o único caminho pelo qual um usuário atravessa a borda HTTP. Campo público novo entra em `userSchema`; `is_super_admin` nunca. Rota que altera usuário valida o corpo com `updateUserSchema`, que descarta em silêncio o que não é editável.
- `src/permissions.ts` é o catálogo de permissões (`<modulo>.<acao>`, em pt-BR), fonte da verdade da tabela `permissions`. Permissão nova entra ali e chega ao banco no próximo `db:migrate`; remover dali não apaga do banco (ver `packages/db/CLAUDE.md`). Escopo `platform` é decisão de revisão — o teste trava a lista.
- Tudo aqui precisa rodar no navegador e no Node: sem I/O, sem dependência de Node no índice.
