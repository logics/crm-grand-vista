# UFs no topo da busca de municípios

## Objetivo

Permitir que o consumidor da rota de municípios solicite UFs como regiões de
interesse junto dos municípios, sem alterar a paginação municipal.

## Contrato

`GET /e/:tenant/municipalities` recebe o parâmetro opcional
`includeUf=true`. Quando ele está ativo e a requisição é da primeira página,
a resposta antecipa opções `{ uf }` cujos nomes ou siglas correspondem ao
termo de busca. As opções de UF precedem os municípios. Nas páginas seguintes
e sem o parâmetro, a resposta contém apenas municípios.

`ids` continua sendo somente a hidratação de municípios e não recebe itens de
UF. A paginação e o `nextCursor` continuam calculados exclusivamente sobre a
consulta de municípios.

## Implementação

O módulo reutiliza o catálogo de UFs de `@crm/shared`, evitando uma lista
duplicada de nomes na API. A comparação normaliza caixa e acentos e verifica o
termo tanto contra a sigla quanto contra o nome da UF.

O serviço acrescenta as UFs apenas depois de obter a página municipal e apenas
quando não há cursor. O tipo da resposta passa a aceitar a união das opções de
município e UF; os dados municipais e sua ordenação permanecem inalterados.

## Erros e compatibilidade

O novo parâmetro é opcional. Valores inválidos seguem a validação de query da
rota; consumidores atuais, que não o enviam, observam exatamente a resposta
anterior. A ausência de termo não adiciona UFs, pois não há critério de busca.

## Testes

Os testes de integração exercitam a rota HTTP de produção, que é o seam
público do recurso:

- `q=goias&includeUf=true` retorna `{ uf: 'GO' }` no topo da primeira página;
- `q=go` também encontra GO, enquanto a mesma busca sem `includeUf` não traz
  UFs;
- a página com cursor não traz UFs e a coleção de municípios continua completa,
  sem repetição nem salto.

## Fora de escopo

Não há mudança no `MunicipalityPicker`, na tabela `municipalities`, no cursor,
nem no comportamento de hidratação por `ids`.
