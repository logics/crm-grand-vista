# municipalities

Busca de municípios do IBGE para o `MunicipalityPicker`. Sem tela própria e sem rota de escrita: a carga vem das migrations (`packages/db`).

- **Spec:** `docs/specs/fase-1-municipios.md`
- **Tabelas que possui:** nenhuma — lê `municipalities`, de `packages/db`, fora do RLS
- **Depende de:** `@crm/db`, `@crm/shared`

## Convenções locais

- `GET /e/:tenant/municipalities?q&uf&includeUf&cursor&ids` é `noPermissionRequired`: qualquer usuário com vínculo na empresa ativa. Sem sessão é 401 e sem vínculo é 404, pelo contexto de empresa.
- Busca por `unaccent` + `ilike` em qualquer parte do nome; começa-pelo-termo primeiro, depois nome (collation `pt-BR-x-icu`), UF e código. Último token sigla de UF, com outro token antes, vira filtro de UF (`splitSearch`).
- `includeUf=true` põe no topo da **primeira** página as UFs cujo nome ou sigla casam com o termo (`{ uf }`), antes dos municípios; elas somam-se aos 20 municípios e não entram no cursor. Com filtro de UF, só essa UF pode aparecer. Ignorado com `ids`.
- Inativos nunca saem da busca; `ids` devolve exatamente os códigos pedidos, ativos ou não, sem busca nem paginação.
- O cursor é o deslocamento codificado, opaco; o que a API não emitiu é 400.
