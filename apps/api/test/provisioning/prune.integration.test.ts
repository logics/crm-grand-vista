// Limpeza de sessões e verificações vencidas contra o Postgres real, pela
// função que o CLI chama.
import { createDatabase, createPool, sessions, uuidv7, verifications } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { pruneExpired } from '../../src/provisioning/prune.js';
import { createUserWithPassword } from '../support/fixtures.js';

const env = loadApiEnv();

describe('limpeza de sessões e verificações vencidas', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  afterAll(() => pool.end());

  const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000);

  it('apaga o que venceu, mantém o válido e a segunda rodada não apaga nada', async () => {
    const user = await createUserWithPassword(db, 'Carla');
    const tag = uuidv7();
    const tokens = { vencida: `${tag}-vencida`, valida: `${tag}-valida` };
    const identifiers = { vencida: `${tag}-vencida`, valida: `${tag}-valida` };

    await db.semTenant({ reason: 'cli' }, async (tx) => {
      await tx.insert(sessions).values([
        { userId: user.id, token: tokens.vencida, expiresAt: hoursFromNow(-1) },
        { userId: user.id, token: tokens.valida, expiresAt: hoursFromNow(1) },
      ]);
      await tx.insert(verifications).values([
        { identifier: identifiers.vencida, value: 'x', expiresAt: hoursFromNow(-1) },
        { identifier: identifiers.valida, value: 'x', expiresAt: hoursFromNow(1) },
      ]);
    });

    const first = await pruneExpired(db);
    expect(first.sessions).toBeGreaterThanOrEqual(1);
    expect(first.verifications).toBeGreaterThanOrEqual(1);

    const remaining = await db.semTenant({ reason: 'cli' }, async (tx) => ({
      sessions: await tx.select({ token: sessions.token }).from(sessions).where(eq(sessions.userId, user.id)),
      verifications: await tx
        .select({ identifier: verifications.identifier })
        .from(verifications)
        .where(inArray(verifications.identifier, Object.values(identifiers))),
    }));
    expect(remaining.sessions).toEqual([{ token: tokens.valida }]);
    expect(remaining.verifications).toEqual([{ identifier: identifiers.valida }]);

    expect(await pruneExpired(db)).toEqual({ sessions: 0, verifications: 0 });
  });
});
