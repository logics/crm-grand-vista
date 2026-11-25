# referrals (front)

Cadeia de indicação nas telas dos sujeitos.

- **Spec:** `docs/specs/fase-1-cadeia-de-indicacao.md` (Telas); issues #186 (contato) e #187 (fazenda)
- **Depende de:** `@crm/shared`, `@crm/ui` (`ReferralChainEditor`), `modules/contacts` (busca de contatos), `modules/users` (`searchTeamUsers`)

## Convenções locais

- `ReferralChainField` é o `ReferralChainEditor` ligado à empresa: busca de equipe para o corretor interno e `searchContactOptions` com `role: 'external_broker'` (ordena, não filtra) para o externo, esta só com `contatos.ver`. Não reescreve o editor nem as funções puras do shared.
- No formulário do contato o valor do campo é a lista de elos do editor (com nome e posição); `save` o converte com `referralChainInputOf` e **só envia `referralChain` se a seção foi tocada** — sem isso, qualquer edição de outro campo apagaria a cadeia.
- A ficha registra a seção `referral-chain` (`order: 15`) em `contact-sections.tsx`: editor sem `onChange` (somente leitura) e, vazia, estado vazio com "Registrar indicação" para quem tem `contatos.editar`.
- Cadastro rápido (#188): com `contatos.ver` e `contatos.criar`, o seletor de contato oferece "Cadastrar contato" e abre o `QuickContactDialog` com `role="external_broker"` pré-marcado; o `ReferralChainField` devolve ao editor, por `onCreateContact` (`Promise<Referrer | null>`), o contato criado (ou `null` se cancelado; rejeitar vale como `null`), resolvida só depois do diálogo fechar (`onCloseAutoFocus` com `preventDefault`). O `add` do editor é quem inclui o elo como último (limite, elegibilidade, anúncio e foco no seletor ou no Remover do 10º); o campo não repete essas guardas. O limite de 10 elos e a marca "Sem acesso" são do editor; `toReferralLinks` repassa `linked` só do usuário.
- Fazenda (#187): a ficha registra `referral-chain` (`order: 15`) em `farm-sections.tsx` com `FarmReferralSection`, e o formulário da fazenda tem a seção `indicacao` depois de Proprietários, com a mesma regra de só enviar `referralChain` se a seção foi tocada.
