# Docs de domínio

Como as skills de engenharia devem consumir a documentação de domínio deste repositório ao explorar o código.

## Antes de explorar, leia isto

- **`CONTEXT.md`** na raiz do repositório, ou
- **`CONTEXT-MAP.md`** na raiz, se existir: aponta para um `CONTEXT.md` por contexto. Leia cada um relevante ao tópico.
- **`docs/adr/`**: leia as ADRs que tocam a área em que você está prestes a trabalhar. Em repositórios multi-contexto, verifique também `src/<context>/docs/adr/` para decisões específicas do contexto.

Se algum desses arquivos não existir, **prossiga silenciosamente**. Não sinalize a ausência; não sugira criá-los de antemão. A skill `/domain-modeling` (acessada via `/grill-with-docs` e `/improve-codebase-architecture`) os cria de forma preguiçosa (lazy) quando termos ou decisões forem de fato resolvidos.

## Estrutura de arquivos

Repositório single-context (caso deste projeto, por enquanto):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-....md
│   └── 0002-....md
└── apps/ | src/
```

Repositório multi-contexto (indicado pela presença de `CONTEXT-MAP.md` na raiz) — não se aplica hoje, mas fica registrado caso o monorepo planejado (`apps/api`, `apps/web`, `packages/*`) justifique a migração:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← decisões de todo o sistema
└── apps/ | packages/
    ├── api/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← decisões específicas do contexto
    └── web/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (em um título de issue, uma proposta de refatoração, uma hipótese, um nome de teste), use o termo como definido em `CONTEXT.md`. Não migre para sinônimos que o glossário evita explicitamente.

Se o conceito de que você precisa ainda não estiver no glossário, isso é um sinal: ou você está inventando linguagem que o projeto não usa (reconsidere) ou há uma lacuna real (anote para o `/domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradizer uma ADR existente, sinalize isso explicitamente em vez de sobrescrever silenciosamente:

> _Contradiz a ADR-0007 (nome da decisão), mas vale reabrir porque…_
