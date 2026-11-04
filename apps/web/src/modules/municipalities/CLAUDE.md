# municipalities (front)

Adaptador do `MunicipalityPicker` à rota `GET /e/:tenant/municipalities`. Sem tela própria; contrapartida de `apps/api/src/modules/municipalities`.

- **Spec:** `docs/specs/fase-1-municipios.md`

## Convenções locais

- `municipality-source.ts` entrega ao picker `search` (`searchMunicipalities(slug, { allowUf })`) e `resolve` (`resolveMunicipalities(slug)`). Quem consome passa o slug da empresa ativa (`useTenantSlug`).
- `resolveMunicipalityItems(slug)` é a hidratação para seletor sem `allowUf`: descarta o que não é município (a sigla de UF), para o tipo do picker fechar.
- `allowUf` manda `includeUf=true`; sem ele a busca só devolve municípios.
- A hidratação manda à rota só códigos IBGE (`ids`); sigla de UF vira `{ uf }` localmente, porque a rota rejeita o que não tem sete dígitos.
- O rótulo "Rio Verde — GO" é de `municipalityLabel` (`@crm/shared`), usado pelo picker; o adaptador não formata nada.
