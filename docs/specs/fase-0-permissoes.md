# Spec — Motor de permissões e escopo de dados (Fase 0)

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md`, `docs/specs/modelo-de-dados.md`, e as seções "Arquitetura multi-tenant e segurança", "Perfis de acesso configuráveis" e "Permissões de escopo de plataforma" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

O **motor** de autorização: catálogo de permissões granulares em código, perfis de acesso configuráveis por empresa com os três semeados, middleware que valida rota contra permissão efetiva, e a cláusula de escopo de dados reutilizável.

A **tela** de administração de perfis de acesso é deliberadamente da Fase 3. A decisão de sequenciamento é o que segura o cronograma: como as verificações já consultam permissões desde a Fase 0, a tela é apenas um CRUD sobre estruturas que já existirão — não há retrabalho. A alternativa (papéis fixos agora, RBAC depois) custaria reescrever toda verificação já espalhada pelos módulos.

## Vocabulário

`CONTEXT.md`: **Permissão**, **Permissão efetiva**, **Perfil de acesso**, **Perfil de acesso Corretor**, **Escopo de dados**, **Corretor responsável**, **Super admin**, **AdminMaster**.

A ressalva do glossário vale em código, rota, componente e rótulo: **"perfil" nunca aparece sozinho** — sempre "perfil de acesso" ou "perfil de compra". São conceitos sem nenhuma relação que compartilham a palavra.

## Decisões que governam

- `docs/specs/modelo-de-dados.md` — `permissions`, `access_profiles`, `profile_permissions`, `profile_data_scopes`, `user_profiles`, `user_platform_permissions`
- "O sistema não tem papéis fixos em código" — Admin, Gestor e Corretor são **dados semeados**, não constantes do código, e a empresa pode renomear, ajustar ou remover
- Quatro camadas de controle, do mais amplo ao mais fino: empresa (RLS) → permissão (middleware) → escopo de dados (por módulo) → visibilidade de comissão (camada de serviço). Esta spec entrega a segunda e a terceira

## Modelo de dados

Conforme `modelo-de-dados.md`, criadas pela spec de banco. Três pontos que governam comportamento:

- `permissions.code` é **PK em texto** (`fazendas.criar`), com `module`, `action`, `scope` CHECK `('tenant','platform')` e `description`. Catálogo **global**, definido em código e sincronizado por migration — não é cadastrável pelo usuário, não tem `tenant_id`, fica fora do RLS
- `profile_permissions` só aceita permissão de `scope='tenant'`. Perfil de acesso pertence a uma empresa e **não pode conceder poder sobre outra**. Como isso atravessa duas tabelas, nenhum `CHECK` de coluna resolve: a garantia é um **trigger** no banco, não validação só na aplicação
- `profile_data_scopes` tem PK `(profile_id, module)` e `scope` CHECK `('own','all')`

## Regras de negócio

### Catálogo em código, sincronizado por migration

O catálogo é a fonte da verdade em código; a migration o espelha no banco. Sincronização **aditiva e idempotente**: permissão nova é inserida, descrição alterada é atualizada, e permissão removida do código **não é apagada em silêncio** — apagar remove linhas de `profile_permissions` por cascata, e uma empresa perderia acesso configurado sem que ninguém decidisse isso. Remoção é migration própria, escrita à mão, com a decisão explícita.

Nomenclatura `<modulo>.<acao>`, em pt-BR, como nos exemplos do plano: `fazendas.criar`, `oportunidades.editar`, `comissao.ver_de_terceiros`, `configuracoes.gerenciar`. A Fase 0 cadastra o catálogo **das seis fases**, não só o que já tem rota: é dado, custa nada, e evita que cada fase mexa no catálogo e nos perfis semeados junto.

### Permissões de escopo de plataforma

O catálogo tem permissões que não pertencem a nenhuma empresa — `empresas.gerenciar`, `empresas.ver_todas` — e elas vivem **fora dos perfis de empresa**, em `user_platform_permissions`.

Na Fase 0 essa tabela fica **vazia**: só o `is_super_admin` passa pelas permissões de plataforma. É estrutura pronta para o **AdminMaster**, o papel visível de administrador da plataforma, que é adiado — hoje o dono do negócio e o desenvolvedor são a mesma pessoa, e o papel só existe de verdade quando houver licenciamento para outras corretoras. Quando existir, é um vínculo novo apontando para permissões que já estarão lá: aditivo, sem reestruturação.

Os dois mecanismos não podem ser o mesmo: o AdminMaster é **visível e normal**, o super admin é **invisível por requisito**.

### Permissão efetiva

A **união** das permissões de todos os perfis de acesso vinculados ao usuário. Não há subtração: um perfil nunca remove o que outro concede. Negação explícita seria um segundo mecanismo, com ordem de precedência a definir, e é a origem clássica de "o usuário tem a permissão mas não consegue".

Resolvida **uma vez por requisição** e cacheada apenas durante ela. Não cacheada na sessão: revogar um perfil tem de surtir efeito na próxima requisição, não no próximo login.

### Middleware de permissão

Declarativo na rota. O handler só executa se a permissão efetiva contiver o código exigido.

**Negar por padrão.** Rota sem permissão declarada é erro, não rota pública. Para isso esta spec entrega uma **varredura do registro de rotas** que falha o CI se qualquer rota não declarar explicitamente ou uma permissão, ou o marcador nominal de rota pública. É o mesmo princípio da varredura de schema da spec de banco: a regra precisa falhar sozinha daqui a seis meses, quando houver duzentas rotas e ninguém lembrar dela.

A varredura também verifica que toda rota de negócio está registrada sob `/e/:empresa/` — o complemento que a spec de autenticação deixou aqui.

### Escopo de dados

Por módulo, cada perfil de acesso define se enxerga **apenas os próprios registros** ou os de todos.

"Próprios" significa ser o **corretor responsável** pelo registro — **não** ter o perfil de acesso Corretor. Os dois eixos são independentes: um Gestor pode responder por fazendas, e alguém com o perfil Corretor pode não responder por nenhuma. Confundir os dois é o erro que o glossário existe para impedir.

Com vários perfis, vale o **mais amplo**: `all` em qualquer perfil vence `own`. É coerente com a união das permissões.

A cláusula é **uma função reutilizável**, aplicada tanto nas listagens quanto nos guards de detalhe. Aplicada em dois lugares com código diferente é a forma como a listagem fica correta e o acesso por ID direto vaza.

**O que a Fase 0 pode provar, e o que ela não pode.** Não existe nenhuma tabela com corretor responsável nesta fase — `farms` e `opportunities` nascem nas Fases 1 e 2. Então a Fase 0 entrega a cláusula e a prova por **teste unitário**: a função é pura, recebe escopo e usuário e devolve um predicado, e isso é verificável sem tabela nenhuma. A prova de integração — usuário de escopo `own` recebendo 404 ao acessar por ID direto o registro de outro responsável — é **critério de aceite da spec de Fazendas**, o primeiro módulo que tem um responsável. Escrever esse teste agora exigiria uma tabela que só existe no schema de teste, e teste que exercita caminho diferente do de produção não vale nada.

### Como o escopo de dados falha: 404

Usuário de escopo `own` acessando registro de outro responsável por **ID direto** recebe **404**, não 403.

Não é a mesma razão do 404 da empresa — ali o segredo é a existência da empresa. Aqui é **coerência**: se a listagem não mostra o registro, o detalhe não pode confirmar que ele existe, senão o ID vira canal lateral para enumerar a carteira dos colegas. A listagem e o detalhe têm de contar a mesma história.

**Falha de permissão, por outro lado, é 403.** O usuário sabe que a ação existe e que o recurso existe — ele simplesmente não pode executá-la, e dizer isso é informação útil, não vazamento.

### Perfis de acesso semeados

Admin, Gestor e Corretor, criados pelo CLI de provisionamento de empresa, marcados com `is_seeded`. Cobrem o uso desde o primeiro dia, e o administrador da empresa depois ajusta, cria novos ou remove conforme a corretora trabalha.

`is_seeded` é **informativo, não protetivo**: a empresa pode editar e apagar os três. Se fossem imutáveis, não seriam configuráveis, e a decisão fechada é que são.

Conteúdo:

- **Admin** — tudo de `scope='tenant'`, escopo `all` em todos os módulos. Semeado por consulta ao catálogo, não por lista fixa, para que permissão nova de fase futura entre no Admin sem migration de perfil
- **Gestor** — tudo exceto gestão de perfis de acesso e de empresas; escopo `all`; **tem** `comissao.ver_de_terceiros`
- **Corretor** — criar e editar fazendas, contatos e oportunidades; escopo `own` nos módulos de fazendas e oportunidades; **não tem** `comissao.ver_de_terceiros`, nem gestão de configurações

### Super admin

Atravessa todas as verificações desta spec — permissão, escopo de dados, e entre empresas. O curto-circuito fica em **um lugar só**, dentro da resolução da permissão efetiva, nunca espalhado como condicional nas rotas.

## Contratos de API

A Fase 0 não entrega CRUD de perfis de acesso — é da Fase 3. Expõe o que a aplicação precisa para se desenhar:

- **Permissões efetivas do usuário na empresa ativa**, com o escopo de dados por módulo. É o que o front usa para esconder botão e item de menu que levariam a 403
- **Catálogo de permissões** com módulo, ação e descrição, atrás de `configuracoes.gerenciar`

Esconder botão no front é **cortesia, não controle**: a verificação que vale é a do middleware. Nenhuma decisão de autorização pode existir só no front.

## Telas e componentes

Nenhuma tela. A única consequência visual na Fase 0 é o menu e os botões respeitarem as permissões efetivas — comportamento da casca, não tela nova.

## Critérios de aceite

1. Rota sem a permissão exigida devolve **403**; com ela, executa.
2. Usuário com **dois perfis de acesso** tem a **união** das permissões.
3. **Unitário:** a cláusula de escopo devolve predicado restrito para `own` e irrestrito para `all`; perfil com `own` em um módulo e `all` em outro produz predicados diferentes nos dois.
4. **Unitário:** dois perfis com escopos divergentes no mesmo módulo resolvem para o **mais amplo**.
5. A resolução de escopo por módulo devolve o escopo correto para usuário com um e com vários perfis.
7. Permissão de `scope='platform'` **não** pode ser vinculada a perfil de acesso — recusada **pelo banco**, não só pela aplicação.
8. Os três perfis semeados nascem com o conteúdo desta spec, e o Admin contém **todas** as permissões de empresa do catálogo.
9. Revogar um perfil de um usuário surte efeito **na requisição seguinte**, sem novo login.
10. Super admin passa por permissão e escopo sem nada vinculado a ele.
11. **Varredura de rotas:** o CI falha se alguma rota não declarar permissão nem marcador de rota pública, ou se alguma rota de negócio estiver fora de `/e/:empresa/`.
12. A sincronização do catálogo é idempotente, e permissão removida do código **não desaparece** do banco.
13. Mudanças em perfis e vínculos aparecem em `audit_log`.
14. `tsc --noEmit` limpo; migrations aplicam de banco zerado.

## Fora de escopo

- **Tela** de administração de perfis de acesso (Fase 3)
- Módulo de gestão de empresas e do vínculo usuário↔empresa (Fase 3)
- AdminMaster como papel ativo — só a estrutura
- **Filtro de visibilidade de comissão** (quarta camada): o código `comissao.ver_de_terceiros` nasce no catálogo aqui, mas o filtro de serviço é da Fase 2, com a comissão
- Qualquer permissão de módulo de negócio sendo *verificada* — nesta fase existe o motor e o catálogo; as rotas que os consomem nascem com cada módulo
- **Prova de integração do escopo de dados** (404 por ID direto, Gestor com carteira própria): migra para a spec de Fazendas, por não haver tabela com corretor responsável nesta fase

## Depende de

`fase-0-autenticacao-e-contexto.md` — precisa de usuário autenticado, empresa ativa resolvida e dos perfis semeados criados pelo CLI de provisionamento.
