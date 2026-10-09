# Spec — CI, deploy e "hello world" autenticado (Fase 0)

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md`, e as seções "Infraestrutura e deploy", "Estratégia de testes" e "Verificação" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

Fechar a Fase 0: CI rodando a suíte inteira em pull request, deploy contínuo para produção, e um "hello world" autenticado publicado — login, empresa resolvida pelo slug, nome do usuário e da empresa na tela.

Entrega **uma casca vazia mas publicada e testada**. A partir daqui todo incremento vai para produção, e é isso que faz a Fase 0 valer: o pipeline é montado uma vez, enquanto ninguém usa o sistema.

## Vocabulário

`CONTEXT.md`: **Empresa**, **Empresa ativa**, **Papel do banco**.

## Decisões que governam

- **Build no CI, nunca no servidor.** O GitHub Actions roda testes, compila e envia o artefato pronto por SSH; o webhook do painel só reinicia o processo. O VPS é compartilhado com outros projetos, e build de monorepo não deve competir por CPU e memória com eles. De brinde: build que falha nunca chega a tocar produção, e o servidor não precisa das dependências de desenvolvimento
- **API como processo nativo**, administrada por aaPanel, que resolve certificado SSL, backup e deploy por webhook. Sem container em produção
- **Postgres 18 no mesmo servidor da aplicação, escutando apenas em `localhost`** — sem porta exposta, sem SSL na conexão, sem regra de firewall. A instância é compartilhada com outros projetos do servidor
- **Frontend no Netlify**, com `base = "apps/web"` e instalação a partir da raiz do workspace — monorepo pnpm não é obstáculo
- **Sem homologação na Fase 0.** Local direto para produção, que é o que a fase pede e ninguém está usando ainda. O ambiente de homologação nasce ao fim da Fase 1, quando a Grand Vista começa a usar de verdade: a partir daí, subir migration quebrada na produção do cliente é risco de outra natureza. É o mesmo pipeline apontando para outro diretório e outro banco

## Modelo de dados

Nenhum. Esta spec não cria tabela.

## Regras de negócio

### Pipeline de CI

Em pull request e no merge para `main`, nesta ordem, parando no primeiro erro:

1. instalar com lockfile congelado — `pnpm install --frozen-lockfile`, para que um lockfile desatualizado falhe aqui e não produza um build que ninguém reproduz
2. `typecheck` — `tsc --noEmit` em todos os pacotes
3. `lint` — oxlint
4. testes **unitários**, sem banco
5. testes de **integração**, contra Postgres **18** como service container, com as migrations aplicadas **de banco zerado**
6. `build` de todos os pacotes

Os quatro testes de guarda da spec de banco e a varredura de rotas da spec de permissões rodam no passo 5. **Eles são o principal motivo de o CI existir**: provam o isolamento entre empresas e falham quando alguém cria tabela sem policy ou rota sem permissão. CI que roda feature e não roda guarda é CI decorativo.

A major version do Postgres do CI é fixada pela mesma tag do Compose local — nunca `latest`, nunca uma major diferente da de produção.

Status de verificação obrigatório para merge. Branch `main` protegida.

### Deploy da API

Disparado pelo merge em `main`, **depois** do pipeline verde. Nesta ordem:

1. **migrations**, com o papel `crm_owner`, como passo próprio e anterior ao resto
2. envio do artefato compilado por SSH
3. webhook do painel reiniciando o processo

Se a migration falhar, o deploy **para** e o processo antigo continua rodando com o código antigo contra o banco antigo. Enviar o código novo antes da migration produz a janela em que a aplicação consulta coluna que não existe, e é a razão da ordem.

O artefato enviado contém só o que produção precisa: nada de dependência de desenvolvimento, nada de `design-system-export/`, nada de teste.

### Travas de boot em produção

Dois testes da suíte precisam valer **também no processo que está rodando**, e por isso viram verificação de inicialização, não só teste:

- **Papel da aplicação.** A API **recusa subir** se o papel da sua conexão for superusuário, tiver `BYPASSRLS` ou for dono de alguma tabela de negócio. É a trava que pega o caso que nenhum teste pega: alguém editar a string de conexão no servidor. O custo é uma consulta no boot; o que ela evita é o isolamento desligado em silêncio em produção
- **Variáveis de ambiente.** Já exigido pela spec do monorepo: ausente ou inválida derruba o boot com mensagem nomeando a variável, em vez de virar `undefined` dentro de uma query

Falhar o boot é o comportamento desejado: o painel mantém o processo anterior, e o erro aparece no log em vez de em produção.

### Deploy do front

Netlify a partir de `main`, com `base = "apps/web"` e instalação na raiz do workspace. Variáveis de build no painel do Netlify, nunca no repositório. Redirecionamento de SPA configurado — sem ele, abrir `/e/<empresa>/fazendas/123` direto devolve 404 do CDN, e o link compartilhado por WhatsApp, que é o motivo de a empresa estar na URL, não funciona.

### Segredos

Inventário da Fase 0, todos em cofre de segredos — do GitHub, do Netlify ou do painel —, **nenhum no repositório** e nenhum em arquivo de exemplo:

senha de `crm_owner` · senha de `crm_app` · segredo do Better Auth · chave SSH de deploy · URL do webhook do painel · token do Netlify

O provisionamento desses valores é trabalho humano, não de agente: é o que a skill `/wizard` existe para conduzir. Esta spec consome os segredos; não os cria.

### Rotação

A chave SSH de deploy e o segredo do Better Auth precisam ser rotacionáveis sem downtime, e o procedimento é documentado agora, enquanto é barato — não quando houver cliente usando.

## Contratos de API

Um endpoint de **saúde**, sem autenticação, respondendo versão e conectividade com o banco. É o que o painel e o monitoramento consultam. **Não** expõe nome de banco, papel, host nem contagem de empresas — endpoint de saúde é superfície pública.

## Telas e componentes

O "hello world" autenticado, que é o teste de ponta a ponta da fase inteira:

1. acessar a raiz sem sessão → login
2. autenticar → redirecionamento para a empresa padrão do vínculo
3. `/e/<empresa>/` exibindo nome do usuário, nome da empresa e seletor de empresa quando houver mais de um vínculo
4. logout → volta ao login

Consome de `packages/ui`: `TopBar`, `SidebarNav`, `Button`, `Wordmark`. Não cria componente novo.

A marca aparece pelo `Wordmark`, **somente tipográfico**: o logotipo vetorial da Grand Vista ainda não existe, e o monograma **não deve ser aproximado ou reconstruído**.

## Critérios de aceite

1. Pull request com teste falhando **não pode** ser mesclado.
2. Pull request que adiciona tabela de negócio sem `tenant_id`, sem policy ou sem `FORCE ROW LEVEL SECURITY` **falha o CI** — a varredura de schema rodando de verdade no pipeline.
3. Pull request que adiciona rota sem permissão declarada **falha o CI**.
4. Pull request com lockfile fora de sincronia falha na instalação.
5. O CI roda as migrations de banco zerado, na major version de produção.
6. Merge em `main` leva a produção, nesta ordem: migration, artefato, reinício.
7. Migration que falha **interrompe** o deploy e deixa o processo anterior rodando.
8. A API **recusa subir** com string de conexão apontando para papel superusuário, com `BYPASSRLS` ou dono de tabela — testado forçando a configuração.
9. O endpoint de saúde responde em produção e **não** revela nome de banco, papel ou host.
10. Em produção: login → empresa resolvida pelo slug → nome do usuário e da empresa na tela → logout. Teste **Playwright** rodando contra o ambiente publicado.
11. Abrir `/e/<empresa>/` direto na URL, sem navegar, funciona (redirecionamento de SPA configurado).
12. Nenhum segredo no repositório — verificado por varredura, não por inspeção visual.
13. `pnpm build` gera os artefatos de produção sem erro, e `pnpm dev` sobe o ambiente local completo.

## Fora de escopo

- **Ambiente de homologação** — nasce ao fim da Fase 1, por decisão fechada
- **Backup do servidor de banco** — o mecanismo do aaPanel cobre o servidor da aplicação; o banco precisa de estratégia própria, e isso é Fase 5
- Monitoramento de erros e alertas (Fase 5)
- Documentação OpenAPI publicada (Fase 5) — os schemas Zod já a geram, mas publicá-la não é desta fase
- Provisionar servidor, instalar Postgres, criar os papéis, configurar DNS e SSL: trabalho humano, conduzido por `/wizard`
- Qualquer módulo de negócio

## Depende de

- `fase-0-permissoes.md` — o "hello world" precisa de usuário autenticado dentro de uma empresa, e a varredura de rotas precisa existir para rodar no CI
- `design-system.md` — a casca consome `TopBar`, `SidebarNav` e `Wordmark`

É a última tarefa da Fase 0.
