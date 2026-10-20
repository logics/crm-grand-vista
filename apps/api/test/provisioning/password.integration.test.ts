// Redefinição de senha contra o Postgres real, pelas funções que o CLI chama.
import { auditLog, createDatabase, createPool, sessions, uuidv7 } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createAuth } from '../../src/modules/auth/auth.js';
import { findPasswordResetTarget, resetPassword } from '../../src/provisioning/password.js';
import { createUserWithPassword } from '../support/fixtures.js';
import { jsonRequest } from '../support/http.js';

const env = loadApiEnv();

describe('redefinição de senha', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  afterAll(() => pool.end());

  const login = (email: string, password: string) =>
    app.request('/auth/login', jsonRequest('POST', { email, password }));

  const sessionsOf = (userId: string) =>
    db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(sessions).where(eq(sessions.userId, userId)));

  it('encontra o usuário pelo e-mail, sem diferenciar maiúsculas, e devolve nulo se não existe', async () => {
    const user = await createUserWithPassword(db, 'Ana');
    expect(await findPasswordResetTarget(db, ` ${user.email.toUpperCase()} `)).toEqual({
      id: user.id,
      name: 'Ana',
      email: user.email,
    });
    expect(await findPasswordResetTarget(db, 'ninguem@teste.local')).toBeNull();
  });

  it('troca a credencial e encerra todas as sessões', async () => {
    const user = await createUserWithPassword(db, 'Bruno');
    expect((await login(user.email, user.password)).status).toBe(200);
    expect((await login(user.email, user.password)).status).toBe(200);
    expect(await sessionsOf(user.id)).toHaveLength(2);

    const novaSenha = await resetPassword(db, user.id);

    expect(novaSenha).not.toBe(user.password);
    expect(await sessionsOf(user.id)).toEqual([]);
    expect((await login(user.email, user.password)).status).toBe(401);
    expect((await login(user.email, novaSenha)).status).toBe(200);
  });

  it('vale para super admin, sem diferença', async () => {
    const admin = await createUserWithPassword(db, 'Raiz', { isSuperAdmin: true });
    const novaSenha = await resetPassword(db, admin.id);
    expect((await login(admin.email, novaSenha)).status).toBe(200);
  });

  it('registra que a senha mudou, sem valor nem hash, como ação de plataforma', async () => {
    const user = await createUserWithPassword(db, 'Carla');
    const novaSenha = await resetPassword(db, user.id);

    const rows = await db.semTenant({ reason: 'cli' }, (tx) =>
      tx.select().from(auditLog).where(eq(auditLog.entityId, user.id)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tenantId: null, userId: null, entity: 'users', field: 'password' });
    expect(JSON.stringify(rows)).not.toContain(novaSenha);
    expect(rows[0]!.newValue).toBe('redefinida');
  });

  it('usuário inexistente não grava nada', async () => {
    const before = (await db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(auditLog))).length;
    expect(await findPasswordResetTarget(db, `${uuidv7()}@teste.local`)).toBeNull();
    expect((await db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(auditLog))).length).toBe(before);
  });
});
