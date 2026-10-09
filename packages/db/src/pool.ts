import pg from 'pg';

/**
 * A instância de produção é compartilhada com outros projetos e o
 * `max_connections` é dividido entre eles: o padrão da biblioteca esgotaria
 * a cota do CRM sozinho.
 */
export const POOL_MAX_CONNECTIONS = 10;

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString, max: POOL_MAX_CONNECTIONS });
}
