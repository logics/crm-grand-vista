# CRM Rural (Grand Vista)

CRM multi-tenant sob medida para corretagem de fazendas de alto valor: cadastro técnico de propriedades, relacionamento com compradores/investidores, funil comercial consultivo, cadeia de indicação em N níveis e comissão por grupo.

## Language

### Fazenda

**Fazenda**:
O imóvel rural captado pela corretora. Existe independentemente de haver qualquer comprador interessado.

**Potencial de venda**:
Nota atribuída à fazenda na captação, indicando quão promissora ela é como ativo vendável. Não depende da existência de um comprador ou de uma oportunidade.
_Avoid_: Classificação da oportunidade, classificação (quando o assunto é a fazenda em si)

**Status comercial**:
Situação da fazenda na carteira — disponível, em negociação, vendida, suspensa. Resume o conjunto de negociações da fazenda; uma fazenda "em negociação" pode ter várias oportunidades em etapas diferentes.

**Prioridade**:
Urgência com que a equipe deve trabalhar aquela captação.

### Oportunidade e funil

**Oportunidade**:
Uma negociação entre um comprador e uma ou mais fazendas. Só existe quando há um comprador; antes disso, o que existe é a fazenda com seu potencial de venda.
_Avoid_: Negociação (aceitável em prosa, mas não como nome de tabela/campo/rótulo de tela — usar "oportunidade")

**Etapa do funil**:
Posição de uma oportunidade específica nas 10 etapas do funil (qualificação, visita técnica, due diligence…). Pertence à oportunidade, não à fazenda.

**Probabilidade**:
Chance de fechamento estimada para uma oportunidade específica.

**Demanda**:
Os critérios de uma oportunidade específica — área alvo, região, cultura, faixa de valor. Nasce pré-preenchida a partir do perfil de compra do contato, mas é editável e vale só para aquela negociação. O mesmo comprador pode ter duas demandas simultâneas e diferentes (soja em Goiás numa, pecuária no Mato Grosso noutra).
_Avoid_: Perfil de compra (esse é o padrão permanente do contato, não a necessidade de uma negociação)

**Fazenda candidata**:
Fazenda colocada em consideração dentro de uma oportunidade. É mutável e descartável — entra e sai conforme o corretor apresenta alternativas ao comprador, sem carga comercial nenhuma.
_Rótulo na tela_: "opção" / "opções apresentadas", o termo que o funil já usa na etapa 4

**Venda**:
Fazenda efetivamente vendida a um comprador dentro de uma oportunidade. Ao contrário da candidatura, é um fato fechado com peso contratual: tem valor, data e os termos de precificação congelados no fechamento. Uma oportunidade pode gerar várias vendas — o comprador que precisa de 1.000 ha pode fechar cinco fazendas de 200 ha para completar a área.
_Avoid_: Fechamento (é a etapa 9 do funil, não a transação)

### Corretores

Três conceitos distintos compartilham a palavra "corretor" — nunca usar a palavra sozinha em código ou texto de UI; usar sempre um dos termos abaixo.

**Corretor interno**:
Pessoa da equipe da corretora, com login no sistema.
_Avoid_: Corretor (sozinho, sem qualificação)

**Corretor responsável**:
O corretor interno dono de uma fazenda ou de uma oportunidade específica. É o nome de um papel/atribuição, não de uma entidade própria.

**Corretor externo**:
Parceiro sem acesso ao sistema que traz uma fazenda ou um comprador. É um contato com esse papel — não aparece em seletor de responsável, e pode acumular outros papéis (ex.: virar comprador depois).

**Perfil de acesso Corretor**:
Um dos perfis de acesso (RBAC) semeados por tenant — apenas um pacote de permissões. Independente de responsabilidade: um Gestor pode ser corretor responsável por fazendas, e alguém com o perfil de acesso Corretor pode não responder por nenhuma.

### Indicação e comissão

**Indicador**:
Quem trouxe um contato ou uma fazenda para a cadeia de indicação. Campo polimórfico — pode ser um corretor interno ou um corretor externo.

**Participante da comissão**:
Quem recebe parte da comissão de uma venda. Campo polimórfico como o indicador (interno ou externo). Independente do indicador: quem indica não necessariamente recebe comissão, e vice-versa.

**Parcela da venda**:
Uma das prestações em que o pagamento da fazenda foi fechado (entrada + 3x, por exemplo), com vencimento e valor. É o cronograma que as parcelas da comissão referenciam.

**Parcela da comissão**:
Uma das prestações em que a comissão será paga. Carrega dois valores distintos: o **previsto** (o que foi acordado) e o **recebido** (o que de fato entrou, congelado na baixa). Os dois divergem quando o pagamento real foi feito em sacas, permuta ou bens — a forma efetiva fica registrada em observação, em texto livre.

**Valor previsto**:
Valor acordado de uma parcela, enquanto ela não é paga.

**Valor recebido**:
Valor efetivamente pago em uma parcela, congelado na data da baixa junto com a observação de como foi pago.

### Cliente/comprador

**Classificação do cliente**:
Nota atribuída a um contato na condição de comprador.

**Grau de qualificação**:
Maturidade do comprador dentro do processo consultivo de venda.

**Perfil de compra**:
Comportamento comercial de um contato como comprador — ticket, urgência, formas de pagamento, capacidade. Guardado em `buyer_profiles`, que também contém a coluna `purchase_profile` (investidor, produtor, especulador…) — a mesma etiqueta "Perfil de compra" cobre a tabela inteira e essa coluna específica, porque na tela é uma única seção da ficha.
_Avoid_: "Perfil" sozinho — sempre qualificar como "perfil de compra" ou "perfil de acesso" (ver abaixo), nunca deixar ambíguo em nome de tabela, rota, componente ou rótulo.

**Perfil de acesso**:
Pacote de permissões (RBAC) atribuível a um usuário. Sem relação alguma com perfil de compra, apesar de compartilharem a palavra "perfil".
_Avoid_: "Perfil" sozinho

### Área e unidades

**Hectare**:
Unidade única de área no banco. Toda área é armazenada em hectares (`numeric`), sem exceção — é o que mantém matching por faixa de área, relatórios e agregações regionais comparáveis entre si.

**Alqueire**:
Unidade de entrada e exibição, nunca de armazenamento. Não é uma medida única — o goiano/mineiro (geométrico) tem 4,84 ha, o paulista 2,42 ha, o do norte 2,72 ha — então informar área em alqueires exige dizer qual. O corretor digita em alqueires, o sistema converte e guarda hectares. A unidade de exibição preferida é parâmetro do tenant.

### Valores e impostos

**Preço pedido**:
Valor em reais que o proprietário pede pela fazenda. É estático: só muda quando alguém edita o cadastro.

**Avaliação**:
Precificação da fazenda em sacas por unidade de área (ex.: 7.000 sacas por alqueire), com cultura de referência. Diferente do preço pedido, é um valor **móvel** — o equivalente em reais muda junto com a cotação, sem ninguém tocar no cadastro. O histórico de alterações registra mudança na quantidade de sacas, não a variação diária da cotação.

**Modo de precificação**:
Qual das duas naturezas acima a fazenda usa — reais ou sacas. Determina o que é digitado e o que é calculado; o equivalente em reais de uma avaliação nunca é persistido.

**Praça**:
Praça de comercialização que serve de referência para a cotação. Não existe cotação nacional única, então cultura + praça + data é o que identifica uma cotação. Normalmente derivada do município da fazenda, mas sobrescrevível — a praça de comercialização nem sempre é o município onde a fazenda está.

**Imposto**:
Tributo incidente sobre a venda, cadastrado por tenant com nome e alíquota vigente. Hoje o caso real é o Funrural, mas o catálogo é genérico de propósito: o governo pode criar outros, alterar alíquotas ou extinguir o atual, como já fez. Cada venda congela os impostos e as alíquotas que valiam no fechamento.

**Valor bruto**:
Valor da venda antes de descontar os impostos.

**Valor líquido**:
Valor da venda após descontar os impostos. **É a base de cálculo da comissão.**

**Valor da venda**:
Valor efetivo pelo qual a fazenda foi vendida, registrado no fechamento. Distinto do preço pedido (o que se pedia) e do valor potencial da oportunidade (estimativa durante a negociação).

### Matching

**Compatibilidade**:
Aderência calculada (0–100%) entre uma fazenda e um comprador, a partir das regras de matching configuráveis do tenant. Não é persistida — é sempre recalculada.
