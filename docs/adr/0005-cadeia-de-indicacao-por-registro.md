# A cadeia de indicação é uma lista própria de cada registro

Cada contato e cada fazenda guarda a sua cadeia de indicação como uma lista ordenada e completa de indicadores (`referral_links` com `position` 1..N). A cadeia de um registro não é montada a partir das cadeias dos indicadores: se o Pedro veio pelo João, que pegou com o Sebastião, a cadeia do Pedro tem os dois elos escritos nela, mesmo que o João, como contato, tenha a sua própria cadeia com o Sebastião.

## Por que

A cadeia descreve o caminho que **esta** indicação percorreu, e não a genealogia de quem indicou. O modelo recursivo (guardar só o indicador direto e subir pelas cadeias dos indicadores) não serve aos dois lados:

- **Fazenda.** "Essa fazenda veio pelo corretor Carlos, que soube pelo Antônio" é um fato sobre a fazenda. O Antônio não trouxe o Carlos para a corretora.
- **Corretor interno.** Usuário não tem cadeia, então a recursão pararia nele, embora a informação continue além dele.
- **Estabilidade.** Com recursão, editar a cadeia do João mudaria sozinha a cadeia do Pedro, e o histórico do Pedro não registraria nada.

O preço é escrever duas vezes o mesmo fato quando os dois caminhos coincidem, o que é aceitável para uma informação curta e editada raramente.

## Consequences

- Não há navegação recursiva na consulta nem na tela. "Quem o João já trouxe" é a visão inversa (**Indicações feitas**): os registros em cujas cadeias o João aparece, em qualquer posição.
- Corrigir um elo que aparece em várias cadeias é corrigir cada uma delas.
- Voltar ao modelo recursivo depois exigiria decidir, registro a registro, qual dos elos guardados é "o mesmo fato" que a cadeia do indicador. Por isso a decisão é difícil de desfazer.
