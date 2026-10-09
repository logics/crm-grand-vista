# Venda é entidade própria, e a comissão pertence à venda

Uma oportunidade liga um comprador a várias fazendas, e o comprador pode fechar mais de uma para suprir sua demanda — quem precisa de 1.000 ha pode comprar cinco fazendas de 200 ha. Por isso a venda não é um atributo da oportunidade nem um sinalizador na junção oportunidade↔fazenda: é a tabela `sales`, uma linha por fazenda efetivamente vendida, com valor, data, status e os termos de precificação congelados no fechamento. Os grupos de comissão penduram em `sales`, não em `opportunities`.

## Considered Options

Marcar a fazenda vendida na própria junção `opportunity_farms` (um booleano `sold` mais o valor) foi considerado e recusado. A junção significa "esta fazenda está em consideração para este comprador": é mutável e descartável, o corretor adiciona e remove candidatas livremente ao apresentar opções. Uma venda é o oposto — fato fechado com peso contratual. Misturar as duas faria com que remover uma candidatura pudesse apagar histórico financeiro, e obrigaria toda consulta de faturamento a filtrar por um sinalizador.

## Consequences

A comissão ficar na venda, e não na oportunidade, decorre da regra de negócio de que a comissão é obrigação do vendedor: cinco fazendas são cinco proprietários, cinco vendedores e cinco acordos distintos, cada um possivelmente com cadeia de indicação e participantes próprios.

O serviço puro de rateio não muda — continua calculando um grupo por vez; apenas passa a ser invocado por venda em vez de por oportunidade. "Valor Vendido" no painel vira uma soma direta sobre `sales` com status concluída, sem filtrar sinalizador. A mesma fazenda pode ser vendida, o negócio cair e ela ser vendida de novo, cada tentativa com sua própria linha e seu próprio motivo de cancelamento preservado.
