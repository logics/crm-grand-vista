# auth (front)

Tela de login, sessão e logout. Contrapartida de `apps/api/src/modules/auth`.

- **Spec:** `docs/specs/fase-0-autenticacao-e-contexto.md`
- **Depende de:** `@crm/shared` (`loginSchema`, `Session`, mensagens), `@crm/ui`

## Convenções locais

- A API só é chamada pelo cliente RPC de `src/lib/api.ts` (`hc<AppType>`, com `credentials: 'include'`): sem ele, o cookie de sessão não vai para a outra origem.
- A sessão vive no cache do TanStack Query (`session.ts`). Login e logout a reescrevem lá; nada lê a sessão por outro caminho. Rota que exige login fica sob `RequireSession` e lê a sessão por `useAuthenticatedSession`.
- O redirecionamento depois do login é um só: `LandingRedirect`, quando a sessão existe. Não navegue no `onSuccess` do login.
- Credencial inválida mostra só `INVALID_CREDENTIALS_MESSAGE`; falha do servidor tem mensagem própria e nunca se passa por credencial inválida.
- Testes (`apps/web/test/`) montam as rotas de produção com `renderApp` e trocam só o `fetch`, pela API falsa de `test/support/fake-api.ts`.
