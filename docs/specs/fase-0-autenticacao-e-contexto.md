# Spec — Autenticação, vínculo e contexto de empresa (Fase 0)

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md`, `docs/specs/modelo-de-dados.md`, `docs/adr/0002-empresa-e-contexto-nao-filtro.md`, e as seções "Empresa ativa: contexto, não filtro", "Requisições sem tenant", "Tabelas de autenticação ficam fora do RLS" e "Super Admin" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

Responder duas perguntas a cada requisição: **quem é** e **em qual empresa está**. Entrega Better Auth com o plugin de organizations, os vínculos usuário↔empresa, a resolução da empresa pelo slug da URL, a flag invisível de super admin, e os scripts de CLI que provisionam empresa e marcam super admin.

Não entrega autorização — o que o usuário **pode fazer** é da spec de permissões. Aqui termina em "este usuário autenticado está legitimamente nesta empresa".

## Vocabulário

`CONTEXT.md`: **Empresa**, **Empresa ativa**, **Vínculo**, **Super admin**, **AdminMaster**, **Corretor interno**.

Nota de nomenclatura: o plugin do Better Auth chama a entidade de `organization`. No domínio ela é **empresa**, e a tabela é `tenants`. O mapeamento acontece na borda da biblioteca; nenhum texto de UI, rótulo, rota de negócio ou nome de tabela nossa usa "organização".

## Decisões que governam

- `docs/adr/0002-empresa-e-contexto-nao-filtro.md` — slug no caminho, validado contra o vínculo, **404 e não 403**
- `docs/specs/modelo-de-dados.md` — `tenants`, `users`, `sessions`, `accounts`, `verifications`, `memberships`, todas **fora do RLS**
- "Tabelas de autenticação ficam fora do RLS": o vínculo é o que *define* a pertinência, então filtrá-lo por empresa seria circular — para saber a quais empresas o usuário pertence, o banco precisaria já saber em qual empresa ele está. O login quebraria. O isolamento dessas tabelas é da camada de aplicação

## Modelo de dados

`tenants`, `users` (com `is_super_admin`), `sessions`, `accounts`, `verifications`, `memberships` — conforme `modelo-de-dados.md`, criadas pela spec de banco. Esta spec as usa e não altera nenhuma coluna.

Dois pontos do modelo que governam comportamento aqui:

- `tenants.slug` é **UNIQUE** e vai na URL
- `memberships` tem UNIQUE `(user_id, tenant_id)` e um **índice único parcial** em `(user_id) WHERE is_default`, que garante no máximo uma empresa padrão por usuário. A garantia é do banco, não da aplicação

## Regras de negócio

### Autenticação

Better Auth com o plugin de organizations, e-mail e senha, sessão em cookie `httpOnly`. Logout invalida a sessão no servidor, não só apaga o cookie.

Recuperação de senha e convite de usuário por e-mail **não** entram na Fase 0: não há provedor de e-mail configurado e a criação de usuário é por CLI. Entram na Fase 3, junto do módulo de gestão de empresas.

As rotas de autenticação passam pelo caminho `semTenant()` da spec de banco — login legitimamente ainda não tem empresa.

### Resolução da empresa ativa

A empresa vem do **slug no caminho**: `/e/<empresa>/fazendas/123`. A URL **pede** uma empresa, nunca autoriza. O fluxo por requisição, nesta ordem, sem atalho:

1. resolver o slug para uma empresa
2. verificar o **vínculo** do usuário logado com ela
3. só então aplicar o contexto, chamando o wrapper de transação

Pular ou reordenar o passo 2 é o bug que esta spec existe para impedir.

### 404, nunca 403 — e a mesma resposta nos dois casos

Sem vínculo, a resposta é **404**. Um 403 confirmaria que aquela empresa existe, permitindo a alguém varrer slugs e descobrir a carteira de clientes da plataforma.

Por isso **slug inexistente e slug sem acesso produzem resposta idêntica** — mesmo status, mesmo corpo, mesma mensagem. Distinguir os dois no corpo da resposta recria o vazamento que o 404 fecha, com mais passos.

Na tela isso não precisa ser hostil: "Você não tem acesso a esta empresa, ou ela não existe", seguido da lista das empresas que ele acessa — que ele tem direito de ver, porque são as dele.

### Troca de empresa

Num único lugar, na topbar, valendo para toda a aplicação. **Não existe seletor de empresa dentro dos filtros de nenhum módulo** — um filtro de empresa implicaria que a consulta pode atravessar empresas e que só o filtro a contém, exatamente a consulta que vaza quando alguém esquece o filtro.

Quem tem acesso a uma empresa só **não vê seletor algum**. Quem tem a várias define a empresa padrão no vínculo, pré-selecionada no login.

Trocar de empresa é navegar para o mesmo recurso sob outro slug quando ele existe lá, e para a raiz da empresa quando não existe — jamais mostrar o recurso da empresa anterior sob o slug novo.

Duas abas em duas empresas diferentes, simultaneamente, **precisam funcionar**. É um dos motivos de a empresa estar na URL e não só na sessão, e é um teste, não uma expectativa.

### Super admin

Flag `is_super_admin` em `users`, marcada **exclusivamente por script de CLI**. Não existe rota, tela ou payload que a altere — inclusive, e principalmente, a rota de atualização de usuário: enviar o campo no corpo não deve surtir efeito algum, nem erro revelador. O campo é descartado antes da validação chegar ao banco.

O sigilo é requisito, não detalhe. A flag é removida de **toda** serialização de usuário, e as listagens de equipe, os seletores de responsável e os relatórios exibem o super admin como usuário comum, com os perfis de acesso que estiverem de fato vinculados a ele.

A garantia é estrutural, não por disciplina: existe **um único serializador de usuário** em `packages/shared`, e é o único caminho pelo qual um usuário atravessa a borda HTTP. Nenhuma rota devolve a entidade crua do banco. Isso é o que faz a regra sobreviver às vinte rotas que ainda não existem.

Quem tem a flag atravessa todas as verificações de permissão e escopo, inclusive entre empresas — pelo caminho `semTenant()`, que recebe **a empresa inspecionada, nunca um curinga**.

### Scripts de CLI

Dois, ambos pelo caminho `semTenant()`, ambos registrando em `audit_log` com autor nulo:

**Provisionar empresa.** Cria a empresa com slug validado, os três perfis de acesso semeados (Admin, Gestor, Corretor — conteúdo definido na spec de permissões), o primeiro usuário administrador e o vínculo entre eles marcado como padrão. É idempotente por slug: rodar duas vezes não cria duplicata nem apaga nada, falha dizendo que já existe.

**Marcar/desmarcar super admin.** Recebe um identificador de usuário, exige confirmação interativa explícita, e nunca lista quem já é — nem no CLI. Listagem de super admins é a ferramenta que torna a flag descobrível.

Validação do slug: minúsculas, números e hífen, sem hífen no início ou fim, tamanho mínimo que evite colisão acidental, e uma lista de reservados (`api`, `admin`, `app`, `e`, `assets`, `static`, `login`) para que nenhuma empresa ocupe um caminho que a aplicação precisa.

## Contratos de API

Forma, não assinatura — os tipos saem do RPC do Hono, e os schemas Zod da borda são a fonte da validação e da documentação OpenAPI.

**Sem empresa**, sob `semTenant()`: login, logout, sessão corrente. A sessão corrente devolve o usuário serializado e **a lista das empresas vinculadas**, com a padrão marcada — é o que a topbar e a tela de "sem acesso" consomem.

**Com empresa**, sob `/e/:empresa/`: tudo o mais. O middleware de resolução roda antes de qualquer handler e não é opcional por rota — rota de negócio registrada fora de `/e/:empresa/` é bug, e a spec de permissões entrega a varredura de rotas que o detecta.

Status: 401 sem sessão válida; **404** para slug inexistente ou sem vínculo, com corpo idêntico nos dois casos.

## Telas e componentes

Mínimo viável para provar o fluxo; o acabamento visual vem do Design System.

- **Login** — e-mail, senha, erro de credencial sem distinguir "e-mail não existe" de "senha errada"
- **Seletor de empresa na topbar** — só aparece com mais de um vínculo
- **Tela de empresa inacessível** — a mensagem única mais a lista das empresas do usuário

Consome de `packages/ui`: `Input`, `Button`, `Field`, `EmptyState`, `TopBar`. Não cria componente novo em `packages/ui`.

## Critérios de aceite

1. Login com credencial válida cria sessão; inválida devolve 401 **sem** distinguir e-mail de senha.
2. Usuário **sem vínculo** acessando o slug de outra empresa recebe **404** — testado por **listagem e por ID direto**.
3. Slug inexistente e slug sem vínculo devolvem **status e corpo idênticos**.
4. Usuário com vínculo acessa normalmente, e o wrapper de transação recebeu a empresa certa.
5. Duas sessões simultâneas em duas empresas diferentes não interferem uma na outra.
6. `is_super_admin` **não aparece em nenhuma resposta da API, para nenhum papel** — teste que varre as respostas procurando a chave, não que verifica rota por rota.
7. Enviar `is_super_admin` no corpo da rota de atualização de usuário **não** altera o valor no banco.
8. Super admin aparece como usuário comum na listagem de equipe e no seletor de responsável.
9. O CLI de provisionamento cria empresa, os três perfis semeados, o administrador e o vínculo padrão; rodar de novo com o mesmo slug falha sem efeito colateral.
10. Slug reservado e slug com formato inválido são recusados pelo CLI.
11. Um usuário não consegue ter duas empresas padrão — garantia do índice único parcial, testada.
12. Ações dos dois CLIs aparecem em `audit_log` com autor nulo.
13. `tsc --noEmit` limpo; migrations aplicam de banco zerado.

## Fora de escopo

- Autorização: permissões, perfis de acesso, escopo de dados (`fase-0-permissoes.md`)
- Conteúdo dos três perfis semeados — esta spec os cria vazios de permissão, a de permissões os popula
- Recuperação de senha, convite por e-mail, autoatendimento de cadastro
- Tela de gestão de usuários e vínculos (Fase 3)
- AdminMaster — a estrutura existe, o papel é adiado
- Qualquer módulo de negócio

## Depende de

`fase-0-banco-e-rls.md` — precisa das tabelas, do wrapper de transação com `semTenant()` e do wrapper de auditoria.
