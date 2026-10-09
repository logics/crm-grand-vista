# Spec — Monorepo e infraestrutura local (Fase 0)

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md`, e as seções "Stack", "Estrutura", "Infraestrutura e deploy" e "Estratégia de testes" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

Criar o monorepo vazio mas funcional: cinco pacotes, Postgres em container espelhando produção, infraestrutura de testes rodando, lint configurado e variáveis de ambiente validadas no boot. Nenhuma tabela, nenhuma rota, nenhuma tela.

É a primeira tarefa do projeto e bloqueia todas as outras. O critério de pronto é mecânico: os comandos da seção "Critérios de aceite" passam num clone limpo.

## Vocabulário

Nenhum termo de domínio. Um único termo de infraestrutura importa: **papel do banco** (`CONTEXT.md`) — o container de desenvolvimento cria os dois papéis, `crm_owner` e `crm_app`, porque é o que torna os testes de RLS capazes de provar algo.

## Decisões que governam

- **Runtime Node 22 LTS.** Bun foi avaliado e recusado: o ganho é em velocidade de instalação e de teste, e o custo é a compatibilidade com Better Auth, Drizzle e o ambiente de produção administrado por aaPanel, que roda Node nativo.
- **Docker só em desenvolvimento e CI.** Em produção a API roda como processo nativo e o Postgres é instalado no servidor — o painel resolve SSL, backup e deploy, e foi isso que motivou não containerizar. O Compose desta spec nunca é usado em produção.
- **Postgres 18** em qualquer ambiente, fixado por tag exata. A produção já está em 18.0; divergir de major version no local é descobrir incompatibilidade de migration no deploy.
- **Build no CI, nunca no servidor** — fora do escopo desta spec, mas define a estrutura: nenhum script de build pode depender de algo que só existe na máquina do desenvolvedor.

## Modelo de dados

Nenhum. Esta spec cria o banco vazio e os papéis; o schema é da spec `fase-0-banco-e-rls.md`.

## Regras de negócio

### Estrutura de pacotes

Exatamente esta, fixada pelo plano:

```
crm/
├── apps/
│   ├── api/          # Hono + Drizzle + Better Auth + OpenAPI
│   └── web/          # React + Vite + Design System
└── packages/
    ├── db/           # schema Drizzle + migrations (fonte única da verdade)
    ├── shared/       # schemas Zod, tipos, metadados de campo, constantes
    └── ui/           # Design System
```

`packages/ui` nasce aqui como pacote vazio compilável — é a pasta de destino que a spec do Design System exige.

### Dependências entre pacotes

Dirigidas e sem ciclo: `apps/*` dependem de `packages/*`; `packages/db` e `packages/ui` dependem de `packages/shared`; `packages/shared` não depende de ninguém. O grafo do Turborepo reflete isso, para que `pnpm build` compile na ordem certa sem que o desenvolvedor saiba qual é.

Nenhum pacote importa de outro por caminho relativo atravessando fronteira (`../../packages/...`) — sempre pelo nome do pacote do workspace. Importação relativa entre pacotes compila no local e quebra no build.

### Versões fixadas

Node por `.nvmrc` **e** `engines`, pnpm por `packageManager`, Postgres por tag exata. Nenhum `latest` em lugar nenhum: a reprodutibilidade entre a máquina do desenvolvedor, o CI e produção é o que esta spec existe para garantir.

### Container de Postgres

Dois bancos: um de desenvolvimento e um de teste, para que rodar a suíte não apague o que está na tela do navegador.

O script de inicialização do container **cria os dois papéis e replica os grants de produção**: `crm_owner` dono do schema, `crm_app` sem superusuário, sem `BYPASSRLS` e sem posse de tabela. Sem isso os testes de isolamento rodariam como dono, passariam, e não provariam nada — é o modo de falha mais perigoso do projeto, porque a suíte fica verde.

Também revoga `CONNECT` de `PUBLIC` nos dois bancos, espelhando produção, onde a instância é compartilhada com outros projetos.

### Pool de conexões

Dimensionado em torno de **10 conexões**, não no padrão da biblioteca. A instância de produção é compartilhada e o `max_connections` é dividido entre os projetos do servidor; o padrão da maioria das bibliotecas esgotaria a cota sozinho.

### Variáveis de ambiente

Um único módulo em `packages/shared` lê `process.env`, valida com Zod e exporta o objeto tipado. **Nenhum outro arquivo do projeto lê `process.env`** — é regra verificável por busca, e é o que impede que uma variável faltando se manifeste como `undefined` dentro de uma query em produção em vez de erro no boot.

A aplicação **falha ao subir**, com mensagem nomeando a variável, se qualquer uma estiver ausente ou inválida. Um `.env.example` completo e comentado acompanha, sem nenhum valor real.

Variáveis da Fase 0: string de conexão da aplicação (papel `crm_app`), string de conexão de migration (papel `crm_owner`), segredo do Better Auth, URL base da API, URL base do front.

### Lint

A config `_adherence.oxlintrc.json` do `design-system-export/` (formato **oxlint**) **vira** a config de lint do projeto — não há config existente na qual integrá-la. Mover e renomear aqui; as regras de aderência ao Design System só têm o que verificar quando `packages/ui` existir, e isso não impede a config de já estar no lugar e rodando.

### Infraestrutura de testes

Vitest com **dois projetos declarados e separados por nome**:

- `unit` — sem banco, sem rede, rodando em paralelo. Regras puras.
- `integration` — Postgres real do container, migrations aplicadas **do zero** a cada execução da suíte, não a partir do estado que ficou da última vez. Migration que só funciona sobre um banco já povoado é exatamente o que o deploy descobre.

A separação é por nome porque o CI e o desenvolvedor precisam rodar só os unitários em segundos, sem subir container.

Playwright instalado e com um teste de fumaça que abre a aplicação. O fluxo E2E real é da spec de CI e deploy.

### `CLAUDE.md` de módulo

Cada pasta de módulo carrega um `CLAUDE.md` curto — quais tabelas o módulo possui, onde está a spec dele, convenções locais. É **ponteiro, não spec**: se começar a crescer, o conteúdo pertence à spec. Esta tarefa entrega o modelo em branco e o de `packages/db`, `packages/shared` e `packages/ui`.

## Critérios de aceite

Num clone limpo, sem nada em cache:

- `pnpm install` conclui sem erro
- `pnpm build` gera os artefatos dos cinco pacotes
- `pnpm typecheck` roda `tsc --noEmit` em todos os pacotes, limpo, em modo `strict`
- `pnpm lint` roda oxlint e passa
- `pnpm test` roda o projeto `unit` sem subir container e sai com código 0
- `docker compose up` sobe Postgres **18** — verificado por `show server_version`, não pela tag — com os dois bancos e os dois papéis
- Teste provando que `crm_app` **não** é superusuário, **não** tem `BYPASSRLS` e **não** é dono de nenhuma tabela
- Teste provando que `CONNECT` está revogado de `PUBLIC` nos dois bancos
- Subir a API com uma variável de ambiente ausente falha no boot com mensagem que **nomeia a variável**
- Busca por `process.env` fora do módulo de ambiente não retorna nada
- `pnpm test:integration` aplica as migrations de um banco zerado (sem migration ainda, aplica zero e passa)
- Playwright executa o teste de fumaça

## Fora de escopo

- Qualquer tabela, rota, componente ou tela — cada um tem sua spec
- CI e deploy (`fase-0-ci-e-deploy.md`)
- Triagem do `design-system-export` (`design-system.md`)
- Qualquer configuração de container para produção: produção é processo nativo, por decisão fechada

## Depende de

Nada. É a primeira tarefa do projeto.
