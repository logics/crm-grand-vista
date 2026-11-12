# farms

Fazendas da empresa ativa: o imóvel captado. Cadastro mínimo (#145) e ficha técnica e comercial (#147): níveis, distâncias, situação documental, textos, coordenadas, aptidões e culturas.

- **Spec:** `docs/specs/fase-1-fazendas.md`; issue #145
- **Tabelas que possui:** `farms` (migration `0021_farms.sql`), com todas as colunas do modelo (precificação e `custom_fields` ainda sem rota), e as junções `farm_aptitudes` e `farm_crops` (migration `0022_farm_aptitudes_crops.sql`).
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
- **Junções** (`aptitudeIds`, `cropIds`): se presentes no corpo, substituem o conjunto **por diferença** (insere os adicionados, remove os retirados; nunca delete + insert), numa só instância de `auditedWrites` com a fazenda — um `change_id`, e os filhos aparecem no histórico (`children` em `routes.ts`, nomeados pela referência). Ausente não toca; `[]` limpa. Id de outra empresa ou inexistente é 400 no campo; os que **entram** têm de estar ativos, o já gravado que ficou inativo passa. O `PATCH` lê a fazenda com `FOR UPDATE` antes da diferença (dois saves concorrentes não geram `23505`). Ids repetidos são deduplicados pelo schema.
- **Coordenadas** (latitude e longitude, as duas ou nenhuma): o schema confere o par enviado junto; no `PATCH` de um lado só, o serviço confere o par efetivo contra o cadastro (senão o `CHECK` do banco viraria 500).
- Status comercial: qualquer entrada ativa, trocada à mão pelo `PATCH`.
