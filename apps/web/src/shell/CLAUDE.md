# shell (front)

Casca da aplicação: a empresa ativa, o seletor de empresa, as telas de empresa inacessível e de estado de página.

- **Spec:** `docs/specs/fase-0-autenticacao-e-contexto.md`; decisão em `docs/adr/0002-empresa-e-contexto-nao-filtro.md`

## Convenções locais

- Página de empresa entra como filha da rota `TENANT_PAGES_ROUTE_ID` (`src/routes.tsx`): fica sob `TenantLayout`, que só a monta depois de a API aceitar a empresa da URL, e sob `TenantRouteError`.
- Consulta de empresa usa `useTenantQuery` (`tenant-query.ts`), que põe o slug na chave do cache. Chave de empresa montada à mão é bug: trocar de empresa poderia mostrar o registro da anterior.
- Registro que a API responde 404 lança `ResourceNotFoundError`. Vindo da troca de empresa, `TenantRouteError` leva à raiz da empresa; fora dela, diz que o registro não existe.
- Caminhos de empresa saem de `tenant-path.ts` (`tenantRootPath`, `switchTenantPath`), nunca de concatenação à mão.
- O seletor de empresa fica no menu de conta da topbar (`account-menu.tsx`), junto da saída, e é o único (ADR 0002): filtro de módulo não tem seletor de empresa.
