# Deploy, segredos e rotação

Operação de produção da Fase 0. A decisão de arquitetura está em `docs/specs/fase-0-ci-e-deploy.md` e na seção "Infraestrutura e deploy" do `Plano_Geral_de_Desenvolvimento.md`; aqui fica o **como**. Provisionar servidor, banco, papéis, DNS e SSL é trabalho humano conduzido por `/wizard` — este documento parte do servidor já pronto.

## O caminho de um merge até produção

Tudo em `.github/workflows/ci.yml`. No push para `main`:

1. **Verificação** — o mesmo job dos pull requests (varredura de segredos, instalação congelada, typecheck, lint, testes unitários, Postgres 18, testes de integração, build). Ao fim, monta o artefato da API (`tools/deploy/build-api-artifact.sh`) e o verifica (`tools/deploy/check-api-artifact.ts`): só `dist/`, dependências de produção e as migrations — nada de teste, código-fonte, dependência de desenvolvimento ou `design-system/`. Em pull request o artefato também é montado e verificado, só não é publicado.
2. **Deploy da API** (`tools/deploy/deploy-api.sh`), parando no primeiro erro:
   1. **migrations**, como `crm_owner`, por túnel SSH até o Postgres do servidor (que só escuta em `localhost`), executadas a partir do próprio artefato;
   2. **envio** do artefato para `releases/<commit>` e troca atômica do link `current`;
   3. **webhook** do painel, que reinicia o processo;
   4. **confirmação**: o endpoint de saúde precisa responder `status: ok` com a versão do commit em até 2 minutos.
3. **Deploy do front** — `netlify deploy --prod` no runner: build do `netlify.toml` com as variáveis lidas do painel do Netlify, publicado em produção. Vem depois da API para o front nunca chamar rota que a API no ar ainda não tem.

Execuções em `main` não se cancelam: um deploy em andamento sempre termina. Merges que chegam durante ele esperam, e o GitHub guarda só o mais recente — os intermediários não são publicados um a um, o que é inofensivo, porque o mais recente os contém.

### Quando algo falha

| Falha | O que acontece | Estado de produção |
|---|---|---|
| Qualquer passo da verificação | Nenhum deploy roda | Intocado |
| Migration | O script para antes de enviar qualquer arquivo | Código antigo contra banco antigo — a migration roda em transação |
| Envio | O script para antes de trocar `current` | Release anterior, com as migrations novas aplicadas |
| Webhook | O script volta `current` para o release anterior | Release anterior, sem reinício |
| Processo novo não sobe (trava de boot, env inválido, crash) | O script volta `current` para o release anterior e reinicia de novo | Release anterior, **com as migrations novas aplicadas** |

O último caso é o motivo de toda migration ser **compatível com o código anterior** (expandir antes, contrair num deploy seguinte): o rollback volta o código, não o banco. Não há `down()`: um `down()` automático apagaria dados escritos depois do deploy, e desfazer uma mudança no banco é uma migration nova, revisada e testada como qualquer outra.

A regra é verificada no CI (`packages/db/test/migration-safety.test.ts`): comando que quebra o código anterior — apagar tabela ou coluna, renomear, mudar tipo, tornar coluna obrigatória, `TRUNCATE`, `DELETE` — só passa com a marcação `-- contração: <motivo>` logo antes dele, que só se escreve quando o release no ar já não depende do que sai.

### Rollback manual

```sh
ssh deploy@<servidor>
cd <DEPLOY_PATH>
ls -1t releases/            # os 5 últimos releases ficam guardados
ln -sfn releases/<commit> current.next && mv -T current.next current
# depois: reiniciar pelo webhook (curl -X POST "<URL do webhook>") ou pelo painel
```

## O servidor

```
/www/wwwroot/api.crmgv.logics.com.br/      # DEPLOY_PATH; dono deploy, grupo crmgv, setgid
├── releases/<commit>/    # um artefato por deploy; os 5 mais recentes
│   ├── dist/             # API compilada
│   ├── node_modules/     # só dependências de produção, @crm/db com as migrations
│   ├── package.json
│   ├── release.json      # versão respondida pelo /health
│   └── .env -> ../../shared/.env
├── shared/.env           # variáveis da API; dono crmgv, 400 (shared/: root:crmgv, 710) — só no servidor
├── current -> releases/<commit>
└── previous_release      # alvo do rollback automático
```

Três usuários, cada um com o mínimo:

| Usuário | Faz | Não pode |
|---|---|---|
| `deploy` | Recebe os releases pelo SSH do GitHub Actions e troca o link `current`; a chave só abre túnel para o Postgres local. Membro do grupo `crmgv`, para acertar o grupo do código | Ler o `.env` (liberado pelo dono, não pelo grupo), `sudo` |
| `crmgv` | Roda a API (projeto PM2 do aaPanel); dono do `.env` e único, além do root, que o lê | Alterar os releases |
| `www` | nginx e os sites PHP do servidor | Ler o `.env` ou a memória do processo da API |

O usuário próprio da API é o que protege os segredos: os sites PHP do servidor rodam todos como `www`, e uma falha em qualquer um deles daria acesso ao que o `www` lê — inclusive às variáveis de um processo `www` em memória.

No aaPanel, o **projeto PM2** da API (*Site → Node → Adicionar projeto Node → Projeto PM2*):

- **arquivo de início:** `<DEPLOY_PATH>/current/dist/index.js`; **diretório:** `<DEPLOY_PATH>/current`; **Node:** v22.18.0; **instâncias:** 1; **usuário:** `crmgv`; **porta:** 3010 (3000 e 3001 já são de outros projetos); domínio `api.crmgv.logics.com.br`, com SSL Let's Encrypt;
- **"Não instalar o node_module" marcado:** o artefato chega com as dependências; sem isso, o painel instalaria no servidor;
- **variáveis ambientais vazias:** a API carrega o `shared/.env` no boot, pelo link no release (`loadEnvFileIfPresent`, em `apps/api/src/index.ts`). O arquivo tem as de `packages/shared/src/env.ts` — `DATABASE_URL` (papel `crm_app`, `localhost`), `BETTER_AUTH_SECRET`, `API_URL`, `WEB_URL`, `PORT`. Nunca `MIGRATION_DATABASE_URL`: a API não a lê.

### Reinício pelo deploy

O PM2 da API é do usuário `crmgv` (`PM2_HOME=/home/crmgv/.pm2`), fora do alcance do `deploy`. O reinício passa pelo painel, que roda como root: no projeto PM2, **Git Manager** (sem repositório configurado), a aba **Script** tem o conteúdo de `tools/deploy/restart-api.sh`, e a aba **Webhook** dá a URL que vira o segredo `DEPLOY_WEBHOOK_URL`. O script fica versionado para não se perder numa troca de servidor: ao migrar, cole-o de novo e troque o segredo pela URL nova.

O script faz `pm2 delete` + `pm2 start` de dentro de `current`, não `pm2 restart`: o PM2 guarda o diretório de trabalho já resolvido (`releases/<commit>`), e um restart seguiria no release antigo.

A API **recusa subir** se `DATABASE_URL` apontar para superusuário, papel com `BYPASSRLS` ou dono de alguma tabela (`assertApplicationRole`, em `packages/db/src/role-guard.ts`), e se faltar ou for inválida qualquer variável. O erro sai no log do projeto no painel, começando por `A API não subiu.`.

A configuração inicial de servidor, aaPanel, Cloudflare, Netlify e GitHub é conduzida por `tools/deploy/setup-wizard.sh`.

### Endpoint de saúde

`GET /health`, sem autenticação: `{"status":"ok","version":"<commit>","database":"ok"}`, ou **503** com `"status":"unavailable"` se o banco não responder em 3 s. Nunca devolve nome de banco, papel, host nem a mensagem do driver — é superfície pública. Fora de um release (`pnpm dev`), a versão é `local`.

## Segredos e variáveis

Nenhum segredo vive no repositório nem em arquivo de exemplo. O CI faz a varredura do **histórico inteiro** com o gitleaks (`.gitleaks.toml`); as exceções são valores exatos de teste, nunca arquivos inteiros.

### Segredos

| Segredo | Onde vive | Quem lê |
|---|---|---|
| Senha de `crm_owner` | GitHub, environment `production`: `MIGRATION_DATABASE_URL` (`postgres://crm_owner:<senha>@localhost:5432/<banco>`) | O passo de migration do deploy, pelo túnel |
| Senha de `crm_app` | Servidor, na `DATABASE_URL` de `shared/.env` | A API |
| Segredo do Better Auth | Servidor, `BETTER_AUTH_SECRET` de `shared/.env` | A API |
| Chave SSH de deploy | GitHub, `DEPLOY_SSH_KEY` (chave privada); a pública no `authorized_keys` do usuário de deploy | O deploy da API |
| URL do webhook do painel | GitHub, `DEPLOY_WEBHOOK_URL` | O deploy da API |
| Token do Netlify | GitHub, `NETLIFY_AUTH_TOKEN` | O deploy do front |

### Variáveis (não secretas), no mesmo environment

| Variável | Exemplo |
|---|---|
| `DEPLOY_SSH_TARGET` | `deploy@api.exemplo.com.br` |
| `DEPLOY_SSH_PORT` | `22` (opcional) |
| `DEPLOY_KNOWN_HOSTS` | saída de `ssh-keyscan -t ed25519 <servidor>`, conferida contra a impressão digital do servidor |
| `DEPLOY_PATH` | `/www/wwwroot/api.crmgv.logics.com.br` |
| `API_HEALTH_URL` | `https://api.exemplo.com.br/health` |
| `NETLIFY_SITE_ID` | id do site, em *Site configuration → General* |

O site do Netlify é criado **sem build automático pelo Git**: quem publica é o CI, depois da API e só com a verificação verde. As variáveis de build do front ficam no painel do Netlify.

## Rotação

### Chave SSH de deploy

Sem downtime: a chave só é usada durante um deploy, e as duas valem ao mesmo tempo durante a troca.

1. Gere a chave nova, sem senha: `ssh-keygen -t ed25519 -N '' -C 'deploy crm <data>' -f deploy_nova`.
2. No servidor, **acrescente** `deploy_nova.pub` ao `~/.ssh/authorized_keys` do usuário de deploy, sem remover a antiga.
3. No GitHub (*Settings → Environments → production*), troque `DEPLOY_SSH_KEY` pelo conteúdo de `deploy_nova`.
4. Rode o workflow de novo no último commit de `main` (*Actions → CI → Re-run all jobs*) e confirme o deploy verde — prova que a chave nova funciona.
5. Só então remova a linha da chave antiga do `authorized_keys`, e apague `deploy_nova` e `deploy_nova.pub` da máquina local.

Se a chave vazou, a ordem inverte: remova a antiga do `authorized_keys` primeiro e aceite que nenhum deploy roda até o passo 3.

### Segredo do Better Auth

Sem downtime do processo, mas **toda sessão aberta termina**: o cookie de sessão é assinado com o segredo, e o Better Auth 1.7 verifica só contra o atual (a lista versionada `secrets`/`BETTER_AUTH_SECRETS` dele cobre criptografia e JWT, não a assinatura do cookie). Cada usuário faz login de novo; nenhum dado se perde, porque a sessão é só uma linha em `sessions`.

1. Escolha um horário de pouco uso e avise quem estiver usando que será preciso entrar de novo.
2. Gere o segredo: `openssl rand -base64 32`.
3. No servidor, como root, troque `BETTER_AUTH_SECRET` em `<DEPLOY_PATH>/shared/.env` e reinicie o projeto PM2 pelo painel. Segredo inválido (menos de 32 caracteres) derruba o boot com o nome da variável — o processo anterior segue no ar.
4. Confirme `GET /health` com `status: ok` e um login completo.
5. Opcional: as sessões antigas ficam órfãs em `sessions` até expirar; a limpeza é a issue #32.
