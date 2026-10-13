// Adapter de banco do Better Auth. A biblioteca não recebe o Drizzle: cada
// operação dela abre a própria transação pelo caminho nominal `semTenant()`,
// porque autenticação acontece antes de haver empresa ativa.
import { accounts, memberships, sessions, tenants, users, verifications, type Database, type Transaction } from '@crm/db';
import type { BetterAuthOptions, DBAdapter, DBTransactionAdapter } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

/**
 * A borda de nomenclatura: o Better Auth fala `organization` e `member`; as
 * tabelas são `tenants` e `memberships`. As chaves são os nomes de modelo que a
 * biblioteca usa — os do plugin de organizations são renomeados em `auth.ts`.
 */
const AUTH_TABLES = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  tenant: tenants,
  membership: memberships,
};

const OPERATIONS = [
  'create',
  'findOne',
  'findMany',
  'count',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'consumeOne',
  'incrementOne',
] as const satisfies readonly (keyof DBTransactionAdapter)[];

export function createAuthDatabaseAdapter(db: Database) {
  return (options: BetterAuthOptions): DBAdapter => {
    const adapterOn = (tx: Transaction) => drizzleAdapter(tx, { provider: 'pg', schema: AUTH_TABLES })(options);

    const operations = Object.fromEntries(
      OPERATIONS.map((operation) => [
        operation,
        (input: unknown) =>
          db.semTenant({ reason: 'login' }, (tx) =>
            (adapterOn(tx)[operation] as (input: unknown) => Promise<unknown>)(input),
          ),
      ]),
    ) as Pick<DBAdapter, (typeof OPERATIONS)[number]>;

    return {
      id: 'crm-sem-tenant',
      ...operations,
      // Operações que a biblioteca agrupa compartilham uma transação só.
      transaction: (callback) => db.semTenant({ reason: 'login' }, (tx) => callback(adapterOn(tx))),
    };
  };
}
