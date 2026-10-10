// Varredura do schema por introspecção. Não lê o schema do Drizzle: lê o
// catálogo do Postgres, que é o que de fato isola — uma tabela criada por SQL
// cru numa migration é varrida igual.
import type pg from 'pg';

/**
 * Tabelas fora do RLS — a lista nominal de `docs/specs/fase-0-banco-e-rls.md`.
 *
 * NÃO é um padrão de nome nem uma convenção: tabela nova é tabela de negócio
 * até que alguém a escreva aqui, e escrever aqui é decisão de revisão de
 * código. Na dúvida, a tabela leva `tenant_id`, policy e FORCE.
 */
export const TABLES_OUTSIDE_RLS: readonly string[] = [
  'tenants',
  'users',
  'sessions',
  'accounts',
  'verifications',
  'memberships',
  'permissions',
  'user_platform_permissions',
  'municipalities',
];

/**
 * Tabelas de negócio cujo `tenant_id` aceita nulo — também nominal. Em
 * `audit_log` o nulo é ação de plataforma, que a policy esconde da aplicação.
 */
export const TABLES_WITH_NULLABLE_TENANT_ID: readonly string[] = ['audit_log'];

/** O predicado de `tenantIsolationPolicy()`, como o Postgres 18 o devolve em `pg_get_expr`. */
export const TENANT_PREDICATE =
  "(tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)";

/** Conexão avulsa ou pool: a varredura só precisa consultar. */
type Queryable = pg.ClientBase | pg.Pool;

interface PolicyInfo {
  name: string;
  permissive: boolean;
  /** `*` é `FOR ALL`. */
  command: string;
  toPublic: boolean;
  using: string | null;
  withCheck: string | null;
}

interface TableInfo {
  schema: string;
  name: string;
  rlsEnabled: boolean;
  rlsForced: boolean;
  tenantId: { type: string; notNull: boolean; referencesTenants: boolean } | null;
  policies: PolicyInfo[];
}

// Todo schema que não é do Postgres nem o do controle de migrations do Drizzle:
// tabela criada fora do `public` não escapa da varredura.
const TABLES_QUERY = `
  select n.nspname as "schema",
         c.relname as "name",
         c.relrowsecurity as "rlsEnabled",
         c.relforcerowsecurity as "rlsForced",
         (select jsonb_build_object(
                   'type', format_type(a.atttypid, a.atttypmod),
                   'notNull', a.attnotnull,
                   'referencesTenants', exists (
                     select 1
                       from pg_constraint k
                      where k.conrelid = c.oid
                        and k.contype = 'f'
                        and k.conkey = array[a.attnum]
                        and k.confrelid = to_regclass('public.tenants')))
            from pg_attribute a
           where a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped) as "tenantId",
         coalesce((select jsonb_agg(jsonb_build_object(
                            'name', p.polname,
                            'permissive', p.polpermissive,
                            'command', p.polcmd,
                            'toPublic', p.polroles @> array[0::oid],
                            'using', pg_get_expr(p.polqual, p.polrelid),
                            'withCheck', pg_get_expr(p.polwithcheck, p.polrelid)) order by p.polname)
                     from pg_policy p
                    where p.polrelid = c.oid), '[]'::jsonb) as "policies"
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where c.relkind in ('r', 'p')
     and n.nspname not in ('information_schema', 'drizzle')
     and n.nspname !~ '^pg_'
   order by 1, 2
`;

const isOutsideRls = (table: TableInfo) => table.schema === 'public' && TABLES_OUTSIDE_RLS.includes(table.name);

async function listTables(client: Queryable): Promise<TableInfo[]> {
  const { rows } = await client.query<TableInfo>(TABLES_QUERY);
  return rows;
}

/** Nomes das tabelas de negócio: tudo o que existe e não está na lista nominal. */
export async function listBusinessTables(client: Queryable): Promise<string[]> {
  const tables = await listTables(client);
  return tables.filter((table) => !isOutsideRls(table)).map((table) => table.name);
}

function violationsOf(table: TableInfo): string[] {
  const violations: string[] = [];
  const { tenantId, policies } = table;

  if (!tenantId) {
    violations.push('sem tenant_id');
  } else {
    if (tenantId.type !== 'uuid') violations.push(`tenant_id é ${tenantId.type}, não uuid`);
    if (!tenantId.referencesTenants) violations.push('tenant_id sem chave estrangeira para tenants');
    if (!tenantId.notNull && !TABLES_WITH_NULLABLE_TENANT_ID.includes(table.name)) {
      violations.push('tenant_id aceita nulo');
    }
  }

  if (!table.rlsEnabled) violations.push('sem ROW LEVEL SECURITY habilitado');
  if (!table.rlsForced) violations.push('sem FORCE ROW LEVEL SECURITY');

  // Policies permissivas se somam com OR: uma segunda policy qualquer reabre o
  // que a de isolamento fecha. Por isso exatamente uma, e a canônica.
  const [policy] = policies;
  if (!policy) {
    violations.push('sem policy');
  } else if (policies.length > 1) {
    violations.push(`${policies.length} policies (${policies.map((p) => p.name).join(', ')}); só a de isolamento é aceita`);
  } else {
    if (!policy.permissive || policy.command !== '*') violations.push('a policy não é PERMISSIVE FOR ALL');
    if (!policy.toPublic) violations.push('a policy não vale para PUBLIC');
    if (policy.using !== TENANT_PREDICATE) violations.push('USING não é o predicado de isolamento');
    if (policy.withCheck !== TENANT_PREDICATE) violations.push('WITH CHECK não é o predicado de isolamento');
  }

  return violations;
}

/**
 * Devolve uma linha por regra quebrada, `schema.tabela: motivo`. Vazio é o
 * único resultado aceito.
 */
export async function findIsolationViolations(client: Queryable): Promise<string[]> {
  const tables = await listTables(client);
  return tables
    .filter((table) => !isOutsideRls(table))
    .flatMap((table) => violationsOf(table).map((violation) => `${table.schema}.${table.name}: ${violation}`));
}
