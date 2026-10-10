// O que toda tabela de negócio carrega: a coluna `tenant_id` e a policy de
// isolamento. Declarados uma vez para que as tabelas não divirjam entre si.
//
// O Drizzle gera o `ENABLE ROW LEVEL SECURITY` e a policy; o
// `FORCE ROW LEVEL SECURITY` e os grants do `crm_app` ele não gera, e são
// acrescentados à mão na migration da tabela.
import { sql } from 'drizzle-orm';
import { pgPolicy, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/** Variável de sessão que carrega a empresa ativa da transação. */
export const TENANT_SETTING = 'app.tenant_id';

export const tenantId = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id);

// `missing_ok` (o `true`) faz a variável ausente virar NULL em vez de exceção.
// O `nullif` cobre o outro caso de ausência: depois de um `SET LOCAL`
// confirmado, o Postgres deixa a variável como string vazia na conexão, e o
// cast de '' para uuid estouraria. Nos dois casos a comparação é falsa e a
// consulta devolve zero linhas — falha fechada.
const belongsToActiveTenant = sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`;

/**
 * Policy de isolamento entre empresas. `USING` filtra leitura, atualização e
 * exclusão; `WITH CHECK` recusa gravar linha com o `tenant_id` de outra empresa.
 */
export const tenantIsolationPolicy = () =>
  pgPolicy('tenant_isolation', {
    as: 'permissive',
    for: 'all',
    to: 'public',
    using: belongsToActiveTenant,
    withCheck: belongsToActiveTenant,
  });
