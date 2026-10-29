# Specs por módulo

Uma spec é o **contrato durável** de um módulo: versionada, revisável em pull request, evoluindo junto do código. A issue do GitHub é a **atribuição** — aponta para a spec e fecha quando o trabalho termina. Ver "Especificação e trabalho com agentes" no `Plano_Geral_de_Desenvolvimento.md`.

Toda spec é **autossuficiente**: o agente lê `CLAUDE.md` + `CONTEXT.md` + as ADRs que a spec cita + a própria spec, e nada mais. Não há histórico de conversa a recuperar. Se uma spec exigir contexto que não está nesses arquivos, é bug da spec — corrija a spec, não adivinhe.

## Esqueleto fixo

```
Objetivo · Vocabulário · Decisões que governam · Modelo de dados ·
Regras de negócio · Contratos de API · Telas e componentes ·
Critérios de aceite · Fora de escopo · Depende de
```

Seção sem conteúdo é omitida, não preenchida com "n/a".

## Transversais

| Spec | O que cobre |
|---|---|
| [`modelo-de-dados.md`](modelo-de-dados.md) | **Canônico.** Todas as tabelas das seis fases. Nenhuma spec de módulo redefine coluna; cita esta |
| [`design-system.md`](design-system.md) | `packages/ui` a partir do export do Claude Design |

## Fase 0 — Fundação

Ordem de execução. As setas são bloqueios reais, não preferência.

```
fase-0-monorepo
      ├──> fase-0-banco-e-rls ──> fase-0-autenticacao-e-contexto ──> fase-0-permissoes
      │                                                                     │
      ├──> design-system                                                    │
      │                                                                     v
      └──────────────────────────────────────────────────────> fase-0-ci-e-deploy
```

| Spec | Entrega | Depende de |
|---|---|---|
| [`fase-0-monorepo.md`](fase-0-monorepo.md) | Monorepo, Postgres em container, infraestrutura de testes, lint, env validado | — |
| [`fase-0-banco-e-rls.md`](fase-0-banco-e-rls.md) | Drizzle, os dois papéis, RLS com os testes de guarda, wrapper de transação, wrapper de auditoria | monorepo |
| [`fase-0-autenticacao-e-contexto.md`](fase-0-autenticacao-e-contexto.md) | Better Auth, vínculos, resolução de empresa por slug, super admin, CLIs | banco-e-rls |
| [`fase-0-permissoes.md`](fase-0-permissoes.md) | Catálogo de permissões, perfis de acesso semeados, middleware, escopo de dados | autenticacao-e-contexto |
| [`design-system.md`](design-system.md) | `packages/ui` | monorepo |
| [`fase-0-ci-e-deploy.md`](fase-0-ci-e-deploy.md) | CI, deploy contínuo, "hello world" autenticado em produção | permissoes, design-system |

`design-system` é paralelizável com toda a trilha de banco — não há código compartilhado entre as duas.

## Fase 1 — Cadastros base

Divisão fechada; as specs são escritas uma a uma, na ordem do grafo — nome sem link é spec ainda não escrita. Cada uma é uma **fatia vertical** de cerca de uma semana — migration, API, tela e testes —, e os itens da ordem de corte são specs inteiras, para que cortar seja "não começar", nunca editar uma spec em andamento.

```
fundacao ──> municipios ──> configuracoes ──┬──> contatos ──┬──> perfil-de-compra
                                            │               │
                                            └──> fazendas <─┘
                                                    ├──> fazendas-mapa
                                                    ├──> cotacoes
r2 ─────────────────────────────────────────────────├──> fazendas-galerias ──> fazendas-videos
                                                    └──> fazendas-documentos

          contatos + fazendas ──> cadeia-de-indicacao
          contatos + fazendas ──> campos-personalizados

                                   homologacao   (fim da fase; sem bloqueio de código)
```

`configuracoes` depende de `municipios` pela praça e os seus municípios atendidos. `perfil-de-compra` e `fazendas` continuam listando `municipios` na coluna "Depende de", porque também o usam diretamente.

| Spec | Entrega | Depende de |
|---|---|---|
| [`fase-1-fundacao.md`](fase-1-fundacao.md) | Registro de metadados de campo em `packages/shared`; leitura genérica do histórico de alterações (rota + `AuditTimeline`); padrão de listagem — paginação, ordenação e filtro validados por Zod, helper de consulta paginada no servidor, `DataTable` + `Pagination` | — |
| [`fase-1-municipios.md`](fase-1-municipios.md) | Carga do IBGE em `municipalities` (fora do RLS, compartilhada entre empresas) por snapshot versionado e migration de delta; busca do `MunicipalityPicker`; rótulo único "Rio Verde — GO" no seletor e no histórico | fundacao |
| `fase-1-r2.md` | Upload direto ao R2 por URL assinada, chave com prefixo da empresa, confirmação do upload. Infra humana via `/wizard` | — |
| [`fase-1-configuracoes.md`](fase-1-configuracoes.md) | Motor genérico de cadastros auxiliares (uma rota e uma tela parametrizadas pelo cadastro, com ordem alfabética ou manual, significado de sistema e campos extras), em que os cadastros das fases seguintes só se registram; praça com os municípios atendidos; `VocabularyPicker`; tela de parâmetros com **só** o tipo de alqueire padrão e a unidade de exibição de área — as demais colunas de `tenant_settings` entram com a spec que as consome; semente (status comercial, categorias de documento, culturas) aplicada uma vez por empresa, no `tenant:provision` e por migration nas existentes | fundacao, municipios |
| `fase-1-contatos.md` | Contato PF/PJ, papéis acumuláveis, classificação, origem do lead e do relacionamento, observações estratégicas, filtros, histórico | configuracoes |
| `fase-1-perfil-de-compra.md` | `buyer_profiles`, `buyer_regions` (município **ou** UF), `buyer_crops`, `buyer_payment_methods` — a seção da ficha que só existe com o papel comprador | contatos, municipios |
| `fase-1-fazendas.md` | `farms` completa: identificação, áreas, técnico, comercial, os dois modos de precificação na entrada, derivados em reais, filtros da listagem (os critérios de busca do escopo), histórico na ficha, e a **prova de integração do escopo de dados `own`** que a `fase-0-permissoes` deixou para cá. Latitude e longitude como campos numéricos | contatos, configuracoes, municipios |
| `fase-1-fazendas-mapa.md` | Mapa MapLibre na ficha: exibir o ponto e escolhê-lo no mapa | fazendas |
| `fase-1-cotacoes.md` | `crop_quotes` por cultura, praça e data, e o cálculo puro do equivalente em reais de uma avaliação em sacas. Até ela chegar, a ficha mostra a avaliação em sacas sem equivalente | fazendas |
| `fase-1-fazendas-galerias.md` | Galerias nomeadas e fotos | fazendas, r2 |
| `fase-1-fazendas-videos.md` | Vídeos nas galerias — sem migration, `farm_media.kind` já aceita `video` | fazendas-galerias |
| `fase-1-fazendas-documentos.md` | Documentos por categoria | fazendas, r2 |
| `fase-1-cadeia-de-indicacao.md` | `referral_links` nos dois lados (contato e fazenda) de uma vez, com o `ReferralChainEditor` nas duas fichas | contatos, fazendas |
| `fase-1-campos-personalizados.md` | Definição em Configurações (`custom_field_defs`) e renderização e validação do `custom_fields` nas fichas de contato e de fazenda. Última da fase | contatos, fazendas |
| `fase-1-homologacao.md` | Troca de ambientes e pipeline com aprovação — ver abaixo | fim da fase |

**Não há spec de busca.** Cada módulo é dono dos próprios filtros; busca global na barra superior não está no escopo. **Impostos** não entram nesta fase: o cadastro vai para a Fase 2, junto da venda, único lugar onde tem efeito.

**Ordem de corte**, se a fase atrasar: tela de configuração do matching (Fase 2) → `campos-personalizados` → `fazendas-videos`. `cadeia-de-indicacao` é inegociável.

**Homologação, por troca.** O ambiente publicado na Fase 0 (`crmgv.logics.com.br` / `api.crmgv.logics.com.br`) vira homologação, e a produção nasce nova, no domínio da Grand Vista — pré-requisito humano da spec. Merge em `main` publica em homologação automaticamente; produção recebe **o mesmo artefato**, sem novo build, quando o passo de deploy do Environment `production` do GitHub é aprovado (revisor obrigatório). Mesma instância Postgres, com banco e par de papéis (`crm_owner`/`crm_app`) próprios por ambiente — papéis valem para a instância inteira, e um par compartilhado deixaria uma string de conexão trocada abrir a produção sem erro.

## Fases 2–5

Escritas quando a fase chegar, contra o modelo de dados que já está fechado. Não antecipe: spec escrita cedo demais envelhece sem ninguém notar, e a fase anterior ainda pode ensinar algo que muda a forma delas.
