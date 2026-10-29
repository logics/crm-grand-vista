# Spec — Municípios: carga do IBGE e busca

> **Leitura obrigatória:** `CLAUDE.md`, `CONTEXT.md` (**Município**, **Praça**), `docs/specs/modelo-de-dados.md` (seção 1 e a lista "Fora do RLS"), `docs/specs/fase-1-fundacao.md` (metadados de campo, busca com `unaccent`, cursor no `AsyncCombobox`) e `packages/shared/src/region.ts`. Esta spec é autossuficiente — não há histórico de conversa a recuperar.

## Objetivo

A tabela `municipalities` carregada com os municípios do IBGE, a rota de busca que alimenta o `MunicipalityPicker` e o rótulo único de município ("Rio Verde — GO") usado no seletor e no histórico. Sem tela própria: município não se cadastra.

É a base de praça (`fase-1-configuracoes`), fazenda, perfil de compra e matching regional.

## Vocabulário

`CONTEXT.md`: **Município**, **Praça**, **Empresa ativa**, **Histórico de alterações**.

"Região de interesse" — município **ou** UF — já tem forma em `packages/shared/src/region.ts` e é usada por `MunicipalityPicker` com `allowUf`.

## Decisões que governam

- `docs/specs/modelo-de-dados.md` — `municipalities` fica **fora do RLS** (lista nominal, teste de varredura da Fase 0) e usa o código IBGE como PK, exceção à regra do UUIDv7
- `fase-1-fundacao.md` — busca insensível a acento com `unaccent`; `AsyncCombobox` pagina por cursor; referência no histórico resolvida pelo registro de metadados
- Migrations entre fases são somente aditivas — município nunca é excluído

## Modelo de dados

**`municipalities`**: `ibge_code` text PK (7 dígitos), `name` text, `uf` char(2), `region` text CHECK `('Norte','Nordeste','Centro-Oeste','Sudeste','Sul')`, `active` boolean NOT NULL DEFAULT true. Sem `tenant_id`, sem policy, sem timestamps de auditoria — é dado de referência, não registro de negócio.

`region` é a **grande região**, derivável da UF, guardada para que os gráficos regionais da Fase 4 agrupem direto no SQL. Região intermediária e imediata do IBGE e coordenadas do município ficam de fora: a tabela é recarregável a partir do snapshot, e acrescentá-las depois não toca dado de cliente.

## Regras de negócio

### Carga

**Snapshot versionado.** `packages/db/data/municipalities.json` — a lista completa (código, nome, UF, grande região), ordenada por código, gerada da API de localidades do IBGE (`servicodados.ibge.gov.br/api/v1/localidades/municipios`). A UF é lida pelo caminho `regiao-imediata → regiao-intermediaria → UF`, não pela microrregião, que vem nula nos municípios mais recentes.

**Script `pnpm municipalities:snapshot`.** Baixa a lista, compara com o snapshot do repositório e:

- sem diferença, avisa e não grava nada;
- com diferença, regrava o snapshot e **gera uma migration SQL** com o delta: `INSERT` do município novo, `UPDATE` do nome ou da UF alterados, `active = false` do que sumiu da lista do IBGE. Nunca `DELETE` — fazendas, praças e regiões de interesse apontam para o município.

A primeira execução gera a carga inicial (todos os municípios). A migration roda como `crm_owner`, como qualquer outra; o deploy e os testes **não** dependem do IBGE estar no ar — o banco zerado recebe os municípios pelas próprias migrations.

O script é ferramenta de desenvolvedor, rodada à mão quando o IBGE publicar mudança; o resultado entra por pull request como qualquer migration.

### Município inativo

Some das opções de busca. Continua exibido nos registros que já o usam (hidratação por código) e no histórico. Mesma lógica da entrada inativa de cadastro auxiliar.

### Rótulo

Uma função única em `packages/shared` produz **"Rio Verde — GO"**. O `MunicipalityPicker` já usa esse formato e passa a chamá-la. O registro de metadados de campo ganha, no tipo **referência**, a opção de declarar a função de rótulo em vez de só a coluna de nome; as colunas que referenciam `municipalities` a usam, e o histórico mostra "Município: Bom Jesus — GO", nunca o nome sozinho.

### Busca

- **Texto:** insensível a acento e a caixa (`unaccent`), encontra o termo **em qualquer parte** do nome. "sao jose" acha "São José do Rio Claro" e "Bom Jesus de São José".
- **Ordem:** primeiro os nomes que **começam** pelo termo, depois os demais; em cada grupo, pelo nome (collation pt-BR) e depois pela UF.
- **UF no fim do texto:** se o último token for uma sigla de UF e houver ao menos outro token antes, ele vira filtro de UF — "bom jesus go" traz só Bom Jesus — GO. Um token sozinho ("go") é busca por nome, não filtro.
- **Filtro explícito** `uf`, para telas que já sabem a UF.
- **Com `includeUf`:** as UFs cujo nome ou sigla casam com o termo ("goias", "go") vêm **no topo da primeira página**, antes dos municípios, na forma `{ uf }`. É a lista única que o `MunicipalityPicker` com `allowUf` consome.
- **Paginação por cursor**, 20 por página.
- **Inativos** nunca aparecem na busca; `ids` hidrata códigos gravados, ativos ou não.

Volume de 5.571 linhas: varredura sequencial com `unaccent` é suficiente. Índice trigram fica para quando a medição pedir.

### Acesso

Qualquer usuário com vínculo na empresa ativa, sem permissão específica. A rota fica sob `/e/:tenant` mesmo sendo dado público: não há rota anônima para varrer a base, e toda rota de negócio vive sob a empresa. Não existe rota de escrita.

## Contratos de API

```
GET /e/:tenant/municipalities?q&uf&includeUf=true&cursor&ids=<código,código>
→ 200 {
    items: [{ uf }  /* só com includeUf, só na primeira página */
          | { ibgeCode, name, uf, active }],
    nextCursor?
  }
→ 400 uf fora da lista, código fora do formato de 7 dígitos, cursor não emitido pela API
```

Com `ids`, devolve exatamente os municípios pedidos (sem busca nem paginação) — é a hidratação do `AsyncCombobox`. Os itens seguem `municipalityOptionSchema` / `ufOptionSchema` de `packages/shared/src/region.ts`, acrescidos de `active`.

## Telas e componentes

- **`MunicipalityPicker`** (`packages/ui`) já existe; esta spec o liga à rota real em `apps/web` e passa o rótulo para a função de `packages/shared`. Story com município inativo hidratado.
- Nenhuma tela nova.

## Critérios de aceite

1. **Integração:** com as migrations aplicadas do zero, `municipalities` tem exatamente o conteúdo do snapshot — mesma contagem, mesmos códigos, nomes, UFs e regiões.
2. **Unitário:** o gerador do delta, dados um snapshot anterior e uma lista nova, produz `INSERT` para município novo, `UPDATE` para nome ou UF alterados, `active = false` para o que sumiu, e **nunca** `DELETE`; sem diferença, não produz nada.
3. **Unitário:** a leitura da resposta do IBGE tira a UF pelo caminho da região imediata, inclusive quando a microrregião é nula.
4. **Teste de schema:** `municipalities` continua na lista nominal fora do RLS, e o teste de varredura passa.
5. **Integração:** "rio verde" traz Rio Verde — GO antes de Rio Verde de Mato Grosso — MS; "sao jose" acha nomes com "São José" no meio; "bom jesus go" traz só o de Goiás; "go" sozinho busca por nome.
6. **Integração:** com `includeUf`, "goias" traz `{ uf: 'GO' }` no topo da primeira página e nunca nas seguintes.
7. **Integração:** município inativo não aparece na busca e é devolvido por `ids`.
8. **Integração:** usuário com vínculo busca; sem sessão é 401; sem vínculo com a empresa é 404, como em toda rota sob `/e/:tenant`.
9. **Integração:** cursor percorre todas as páginas de uma busca ampla ("sa") sem repetir nem pular município.
10. **Unitário:** a função de rótulo produz "Rio Verde — GO"; o histórico de um registro que referencia município exibe o rótulo com UF (prova com o resolvedor de referência do registro de metadados).
11. Story do `MunicipalityPicker` com valor inativo hidratado passando em `test/stories.test.tsx`; `tsc --noEmit` limpo; migrations aplicam de banco zerado; `pnpm lint` verde.

## Fora de escopo

- Região intermediária e imediata do IBGE, e coordenadas do município — acréscimos sem retrabalho, quando um requisito pedir
- Índice trigram (`pg_trgm`) — quando o volume ou a medição pedir
- Execução periódica do snapshot — é manual, por pull request
- Busca por região intermediária como região de interesse — região de interesse é município ou UF

## Depende de

`fase-1-fundacao` (registro de metadados de campo, `unaccent`, convenção de cursor do `AsyncCombobox`).
