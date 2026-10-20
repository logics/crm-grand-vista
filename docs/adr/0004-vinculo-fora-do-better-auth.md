# Empresa e vínculo ficam fora do Better Auth

O Better Auth cuida de identidade — usuário, conta, sessão e verificação. Empresa (`tenants`) e vínculo (`memberships`) são nossos, e quem grava vínculo é um serviço próprio sobre `memberships`, nunca a biblioteca. O plugin de organizations foi removido.

## Por que

O plugin exige o que o modelo canônico não tem: `role` no vínculo, uma tabela de convites e `active_organization_id` na sessão. Aqui a autorização é por perfil de acesso (ver a spec de permissões), a empresa ativa vem do slug na URL (ADR 0002) e o vínculo carrega `is_default`, que o plugin desconhece. Acrescentar essas colunas só para o plugin funcionar criaria um segundo caminho de autorização (`role`) concorrendo com os perfis, e uma segunda noção de empresa ativa concorrendo com a URL.

Na prática o plugin só servia para leitura, que já é feita por `listUserTenants` e `resolveTenantAccess` — e a leitura é a parte que ele não precisava fazer por nós.

## Consequences

- A escrita de vínculo (tela de gestão de usuários, convite por e-mail — Fase 3) é de um serviço próprio, que também aplica a regra de uma única empresa padrão por usuário e escreve a auditoria. Hoje a escrita é só o CLI de provisionamento.
- O adapter de banco do Better Auth expõe apenas `user`, `session`, `account` e `verification`.
- `tenants` e `memberships` continuam fora do RLS pelos motivos da spec de banco; nada muda no schema.
