import { afterAll, describe, expect, it, vi } from 'vitest';
import { createDatabase, MissingTenantError } from './database.js';
import { createPool } from './pool.js';

describe('empresa obrigatória', () => {
  // pg.Pool só conecta na primeira consulta: aqui não há rede, e o wrapper tem
  // de estourar antes de pedir uma conexão.
  const pool = createPool('postgres://crm_app:senha@localhost:5432/crm_dev');
  const connect = vi.spyOn(pool, 'connect');
  const db = createDatabase(pool);
  const callback = vi.fn(async () => 'executou');

  afterAll(() => pool.end());

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string vazia', ''],
    ['texto que não é uuid', 'grand-vista'],
    ['curinga', '*'],
  ])('withTenant estoura erro com empresa %s', async (_label, tenantId) => {
    // @ts-expect-error — o tipo já proíbe; a guarda é para o valor que chega em runtime.
    await expect(db.withTenant(tenantId, callback)).rejects.toBeInstanceOf(MissingTenantError);

    expect(callback).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it('semTenant no caminho do super admin estoura erro sem a empresa inspecionada', async () => {
    // @ts-expect-error — o tipo já exige `tenantId`; a guarda é para o valor em runtime.
    const inspecting = db.semTenant({ reason: 'super_admin' }, callback);

    await expect(inspecting).rejects.toBeInstanceOf(MissingTenantError);
    expect(callback).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });
});
