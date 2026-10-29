# municipalities

Busca de municípios do IBGE para o `MunicipalityPicker`. Sem tela própria e sem rota de escrita: a carga vem das migrations (`packages/db`).

- **Spec:** `docs/specs/fase-1-municipios.md`
- **Tabelas que possui:** nenhuma — lê `municipalities`, de `packages/db`, fora do RLS
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- `GET /e/:tenant/municipalities?q&uf&cursor&ids` é `noPermissionRequired`: qualquer usuário com vínculo na empresa ativa. Sem sessão é 401 e sem vínculo é 404, pelo contexto de empresa.
- Busca por `unaccent` + `ilike` em qualquer parte do nome; começa-pelo-termo primeiro, depois nome (collation `pt-BR-x-icu`), UF e código. Último token sigla de UF, com outro token antes, vira filtro de UF (`splitSearch`).
- Inativos nunca saem da busca; `ids` devolve exatamente os códigos pedidos, ativos ou não, sem busca nem paginação.
- O cursor é o deslocamento codificado, opaco; o que a API não emitiu é 400.
