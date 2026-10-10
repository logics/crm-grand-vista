// Único caminho pelo qual a aplicação fala com o banco. O Drizzle não é
// exportado: toda consulta acontece dentro de `withTenant()` ou, nos três casos
// nominais, de `semTenant()`.
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import * as schema from './schema/index.js';
import { TENANT_SETTING } from './schema/tenant-scope.js';

type Orm = NodePgDatabase<typeof schema>;

/** Transação aberta pelo wrapper, já com o contexto da empresa aplicado. */
export type Transaction = Parameters<Parameters<Orm['transaction']>[0]>[0];

/**
 * Os três casos legítimos de falar com o banco fora de `withTenant()`. No
 * caminho do super admin a empresa inspecionada é obrigatória — nunca um
 * curinga —, para que ele veja uma empresa por vez como qualquer usuário.
 */
export type SemTenantContext =
  | { reason: 'login' }
  | { reason: 'cli' }
  | { reason: 'super_admin'; tenantId: string };

export interface Database {
  /** Executa `fn` numa transação com a empresa ativa aplicada. Estoura erro sem empresa. */
  withTenant<T>(tenantId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>;
  /**
   * Escape hatch nominal: transação sem empresa validada por vínculo. Não crie
   * alias nem wrapper em volta — o nome é o que a torna auditável por busca.
   */
  semTenant<T>(context: SemTenantContext, fn: (tx: Transaction) => Promise<T>): Promise<T>;
}

/** Consulta de negócio sem empresa definida é bug de isolamento, não caso de uso. */
export class MissingTenantError extends Error {
  constructor() {
    super('Empresa ativa ausente ou inválida: a transação exige o id (uuid) de uma empresa.');
    this.name = 'MissingTenantError';
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertTenantId(tenantId: unknown): asserts tenantId is string {
  if (typeof tenantId !== 'string' || !UUID_PATTERN.test(tenantId)) throw new MissingTenantError();
}

export function createDatabase(pool: pg.Pool): Database {
  const orm = drizzle(pool, { schema });

  const transaction = <T>(tenantId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> =>
    orm.transaction(async (tx) => {
      if (tenantId !== null) {
        // Equivale a `SET LOCAL` (o `true` é o `is_local`), que não aceita
        // parâmetro. Nunca `SET`: a empresa persistiria na conexão depois do
        // COMMIT e a próxima requisição que a pegasse do pool a herdaria.
        await tx.execute(sql`select set_config(${TENANT_SETTING}, ${tenantId}, true)`);
      }
      return fn(tx);
    });

  return {
    async withTenant(tenantId, fn) {
      assertTenantId(tenantId);
      return transaction(tenantId, fn);
    },

    async semTenant(context, fn) {
      if (context.reason !== 'super_admin') return transaction(null, fn);

      assertTenantId(context.tenantId);
      return transaction(context.tenantId, fn);
    },
  };
}
