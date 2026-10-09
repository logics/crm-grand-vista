# Spec — Banco, RLS e auditoria (Fase 0)

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md`, `docs/specs/modelo-de-dados.md`, `docs/adr/0002-empresa-e-contexto-nao-filtro.md`, e as seções "Arquitetura multi-tenant e segurança" e "Verificação" do `Plano_Geral_de_Desenvolvimento.md`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

Estabelecer o isolamento entre empresas no nível do banco, com os testes que provam que ele funciona. Entrega o schema da Fase 0 em Drizzle, as policies de RLS, os dois papéis, o wrapper de transação que torna impossível consultar sem empresa definida, o wrapper de auditoria, e **quatro testes de guarda** que falham o CI quando alguém, meses depois, cria uma tabela sem policy.

**Vazamento entre empresas é a pior falha possível neste sistema, e ela não dá erro — só vaza.** Esta é a tarefa mais crítica da Fase 0. Se houver conflito entre entregar rápido e entregar provado, entregue provado.

## Vocabulário

`CONTEXT.md`: **Empresa**, **Empresa ativa**, **Vínculo**, **Auditoria**, **Papel do banco**.

## Decisões que governam

- `docs/adr/0002-empresa-e-contexto-nao-filtro.md` — empresa é contexto da requisição, nunca filtro de consulta
- `docs/specs/modelo-de-dados.md` — modelo canônico. **Esta spec não redefine nenhuma coluna**; implementa em Drizzle o que está lá
- "Dois papéis no banco — o RLS depende disso" no plano
- "Tabelas de autenticação ficam fora do RLS" no plano

## Modelo de dados

Tabelas da Fase 0, conforme `modelo-de-dados.md`. As demais tabelas nascem nas fases seguintes; o schema é desenhado para que essas migrations sejam **somente aditivas**.

**Fora do RLS** (lista nominal, usada como exceção pelo teste de varredura): `tenants`, `users`, `sessions`, `accounts`, `verifications`, `memberships`, `permissions`, `user_platform_permissions`, `municipalities`.

**Dentro do RLS:** `access_profiles`, `profile_permissions`, `profile_data_scopes`, `user_profiles`, `audit_log`.

Esta tarefa cria **as tabelas**. O povoamento do catálogo de permissões e dos perfis semeados é da spec de permissões; Better Auth é da spec de autenticação. Aqui a `users` nasce com a flag `is_super_admin`, porque a coluna é do schema — o comportamento dela não é.

As convenções transversais (UUIDv7, `timestamptz`, ausência de soft delete, tipos numéricos, `text` + `CHECK` em vez de enum) estão em `modelo-de-dados.md` e valem sem repetição.

## Regras de negócio

### Os dois papéis

**`crm_owner`** é dono do schema e roda as migrations. Nunca é usado pela aplicação.

**`crm_app`** é o que a API usa. Não é superusuário, não é dono de tabela nenhuma, não tem `BYPASSRLS`, e recebe apenas `SELECT`/`INSERT`/`UPDATE`/`DELETE` nas tabelas de negócio.

A razão é que **o Postgres não aplica RLS ao dono da tabela nem a superusuário**. Se a aplicação conectar com o papel errado, todas as policies são ignoradas em silêncio: as queries funcionam, os testes de feature passam, e o isolamento não existe.

Duas strings de conexão distintas, em duas variáveis de ambiente distintas. A de migration nunca é lida pelo processo da API.

### Policies

Toda tabela de negócio recebe:

- `ENABLE ROW LEVEL SECURITY`
- `FORCE ROW LEVEL SECURITY` — aplica as policies **inclusive ao dono**, para que apontar a aplicação para o papel errado algum dia não desligue o isolamento
- uma policy `FOR ALL` com **`USING` e `WITH CHECK`**, as duas

`WITH CHECK` não é redundância: sem ele, `USING` filtra leitura e atualização, mas um `INSERT` pode gravar uma linha com o `tenant_id` de outra empresa. Com ele, o banco recusa.

O predicado compara `tenant_id` com `current_setting('app.tenant_id', true)::uuid`. O segundo argumento (`missing_ok`) é deliberado: sem ele, consulta sem a variável definida **estoura exceção**; com ele, retorna `NULL`, a comparação é falsa e a consulta devolve **zero linhas**. Falhar fechado, nunca aberto.

Isso não substitui o wrapper estourar erro — são duas camadas, e a do banco é a que vale quando alguém contorna a de cima.

### Wrapper de transação

Único caminho pelo qual a aplicação fala com o banco. Recebe a empresa ativa, abre transação, aplica o contexto, executa e confirma:

```
BEGIN;
SET LOCAL app.tenant_id = $1;
-- consultas
COMMIT;
```

**`SET LOCAL`, nunca `SET`.** Com pool de conexões, `SET` persiste na conexão depois do `COMMIT` e a próxima requisição que pegar aquela conexão herda a empresa da anterior. É vazamento entre empresas com todas as policies corretamente instaladas, e é um dos bugs mais difíceis de reproduzir que existem — depende de qual conexão o pool entregou.

O wrapper **exige** empresa e estoura erro se não houver: consulta de negócio sem empresa definida é bug de isolamento, não caso de uso.

### `semTenant()` — a escape hatch nominal

Três casos legítimos escrevem ou leem antes de haver empresa, e passam por uma função de nome próprio, fácil de auditar por busca no código:

- **login**, que ainda não tem empresa
- **script de CLI** que provisiona empresa nova, que escreve antes de a empresa existir
- **super admin** atravessando empresas — e aqui o `SET LOCAL` recebe **a empresa que ele está inspecionando, nunca um curinga**, para que ele veja uma empresa por vez como qualquer usuário e nenhuma consulta misture dados de duas corretoras

O nome é o mecanismo: se um dia `semTenant()` aparecer dentro de um módulo de negócio, salta aos olhos na revisão. Não criar atalho, alias ou wrapper que esconda a chamada.

### Wrapper de auditoria

Envolve as escritas do Drizzle, compara o estado anterior com o novo e grava **uma linha de `audit_log` por campo alterado**, com valor anterior, valor novo, autor e instante. Alimentado por mecanismo, não por disciplina do desenvolvedor — é o que o escopo pede como "logs de auditoria" e como "histórico de alterações" da ficha da fazenda, que são a mesma coisa.

Duas propriedades que não são opcionais:

- **Na mesma transação da escrita.** Em transação separada, um rollback deixa registro de auditoria de alteração que não aconteceu — pior que não auditar, porque mente com aparência de prova.
- **`audit_log` é append-only para a aplicação.** `crm_app` recebe `INSERT` e `SELECT`, e **não** `UPDATE` nem `DELETE`. Log de auditoria editável pela aplicação que ele audita não é log de auditoria.

Campo não alterado não gera linha. Valores vão como `text`, para caber qualquer tipo; a formatação e o rótulo legível vêm dos metadados de campo, não do log.

O autor vem do contexto da requisição e é **nulo** para ação de CLI ou de sistema — nulo é a verdade, e inventar um usuário de sistema criaria um autor que não existe em `users`.

## Contratos de API

Nenhum. Esta spec não expõe rota — entrega as peças que todas as rotas usarão.

## Critérios de aceite

Os quatro primeiros são **testes de guarda**: existem para falhar o CI quando alguém quebrar a regra daqui a seis meses, não para provar que hoje funciona.

1. **Isolamento multi-tenant.** Cria duas empresas com dados em cada tabela de negócio e confirma que a empresa A não enxerga nada da B — **inclusive com `SELECT` propositalmente sem cláusula de filtro**, que é o que valida o RLS em vez de validar a query. Conecta como `crm_app`: rodando como dono, este teste passaria sem o RLS fazer nada.

2. **Varredura de schema.** Percorre o schema por introspecção e **falha o CI** diante de qualquer tabela de negócio sem `tenant_id`, sem policy ativa ou sem `FORCE ROW LEVEL SECURITY`. A exceção é a **lista nominal** desta spec, escrita no teste — não um padrão de nome, não uma convenção. Tabela nova é tabela de negócio até que alguém a adicione explicitamente à lista, o que força a decisão a passar por revisão de código.

3. **Papel da aplicação.** Falha se o papel usado na conexão da aplicação for superusuário, tiver `BYPASSRLS` ou for dono de alguma tabela de negócio. Sem este teste, toda a suíte de isolamento pode passar sem que o RLS esteja fazendo nada.

4. **Empresa obrigatória.** O wrapper estoura erro quando não há empresa definida. E, no mesmo pool: abrir uma transação com empresa A, confirmar, e provar que a transação seguinte **na mesma conexão** não herda A — o teste que pega a troca de `SET LOCAL` por `SET`.

Mais:

5. `INSERT` com `tenant_id` de outra empresa é recusado pelo banco (prova o `WITH CHECK`).
6. Consulta sem a variável de sessão definida devolve **zero linhas**, não exceção (prova o `missing_ok`).
7. Alterar dois campos de um registro gera exatamente duas linhas de `audit_log`, com valor anterior, valor novo e autor; alterar e dar rollback gera **zero**.
8. `crm_app` não consegue `UPDATE` nem `DELETE` em `audit_log`.
9. `semTenant()` com o caminho do super admin aplica a empresa inspecionada, e uma consulta nesse caminho **não** retorna linhas de duas empresas.
10. Migrations aplicam de banco zerado e `tsc --noEmit` fica limpo.

## Fora de escopo

- Better Auth, login, sessão, vínculo usuário↔empresa (`fase-0-autenticacao-e-contexto.md`)
- Resolução da empresa pelo slug da URL — esta spec entrega o wrapper, não quem decide qual empresa passar para ele
- Catálogo de permissões e perfis semeados (`fase-0-permissoes.md`)
- Tabelas das Fases 1–5
- Tela de histórico de alterações — aqui só o mecanismo que a alimenta

## Depende de

`fase-0-monorepo.md` — precisa de `packages/db`, do container de Postgres com os dois papéis e do projeto de testes de integração.
