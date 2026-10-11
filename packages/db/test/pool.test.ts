import { describe, expect, it } from 'vitest';
import { createPool, POOL_MAX_CONNECTIONS } from '../src/pool.js';

describe('createPool', () => {
  it('limita o pool a 10 conexões, não ao padrão da biblioteca', async () => {
    // pg.Pool só conecta na primeira consulta: aqui não há rede.
    const pool = createPool('postgres://crm_app:senha@localhost:5432/crm_dev');

    expect(POOL_MAX_CONNECTIONS).toBe(10);
    expect(pool.options.max).toBe(POOL_MAX_CONNECTIONS);

    await pool.end();
  });
});
