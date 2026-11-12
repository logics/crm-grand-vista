# farms

Fazendas da empresa ativa: o imóvel captado. Esta issue (#145) entrega o cadastro mínimo ponta a ponta e a prova de integração do escopo de dados `own`.

- **Spec:** `docs/specs/fase-1-fazendas.md`; issue #145
- **Tabela que possui:** `farms` (migration `0021_farms.sql`), já com todas as colunas do modelo — níveis, técnico, precificação com o `CHECK` completo e `custom_fields` sem uso. As colunas além do mínimo ainda não têm rota nem tela.
- **Depende de:** `@crm/db`, `@crm/shared`, `src/authorization`, `src/history`, `src/listing`, `modules/settings` (só `defaultEntries`)

## Convenções locais

- Rotas sob `/e/:tenant/farms`: `GET /`, `POST /`, `GET|PATCH /:id`, `GET /:id/history`. `fazendas.ver|criar|editar` recusam com 403 antes do banco. Ainda sem `DELETE`, `/options`, `/duplicates`, `q` e filtros.
- **Escopo de dados** (`dataScopeClause(access, 'fazendas', farms.responsibleUserId)`) em lista, `total`, detalhe, histórico e `PATCH`: fora dele é 404, nunca 403. O 403 é só para quem tem escopo `own` e tenta atribuir a fazenda a outro corretor, e só depois de a fazenda ter sido encontrada no escopo (não revela fazenda alheia).
- Corretor responsável: padrão o usuário logado; precisa de vínculo na empresa (`memberships`, fora do RLS) — senão 400.
- Referências (município, praça, status, corretor) são conferidas pelo serviço antes de gravar (a FK não passa pelo RLS): inexistente ou de outra empresa é 400 no campo. As que **mudam** têm de apontar para entrada ativa; a que já estava gravada e ficou inativa continua valendo ao salvar sem tocá-la.
- Fazenda nova nasce com a primeira entrada ativa de `available` (`defaultEntries`, de configurações), se o corpo não traz `commercialStatusId`.
- A API grava a praça que recebe; a sugestão pelo município é só do front.
- Área útil ≤ total: o schema confere o par enviado junto, o serviço confere contra o cadastro (edição de um só lado) e o `CHECK` da tabela é a rede final.
- Resposta traz as referências com o nome de hoje (ativas ou não), hidratadas em lote por `serialize`.
