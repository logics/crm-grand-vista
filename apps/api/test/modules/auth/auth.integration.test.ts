// A instância do Better Auth contra o Postgres real: por onde ela fala com o
// banco e como o plugin de organizations enxerga as tabelas de empresa.
import { createDatabase, createPool, type Database, type SemTenantContext } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';

const env = loadApiEnv();

describe('Better Auth', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  afterAll(() => pool.end());

  it('fala com o banco só por semTenant(), com o motivo de login', async () => {
    const user = await createUserWithPassword(db, 'Auditada');
    const calls: (SemTenantContext['reason'] | 'withTenant' | 'ping')[] = [];
    const recording: Database = {
      withTenant: (tenantId, fn) => {
        calls.push('withTenant');
        return db.withTenant(tenantId, fn);
      },
      semTenant: (context, fn) => {
        calls.push(context.reason);
        return db.semTenant(context, fn);
      },
      ping: () => {
        calls.push('ping');
        return db.ping();
      },
    };
    const app = createApp({ auth: createAuth({ db: recording, env }), db: recording, env });

    const login = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    const cookie = login.headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
    await app.request('/auth/session', { headers: { cookie } });
    await app.request('/auth/logout', { method: 'POST', headers: { cookie } });

    expect(login.status).toBe(200);
    expect(calls.length).toBeGreaterThan(0);
    expect(new Set(calls)).toEqual(new Set(['login']));
  });

  it('mapeia a organization do plugin para as tabelas de empresa e vínculo', async () => {
    const user = await createUserWithPassword(db, 'Vinculada');
    const tenant = await createTenant(db, 'auth-plugin');
    await createMembership(db, user.id, tenant.id, { isDefault: true });
    const auth = createAuth({ db, env });

    const { headers } = await auth.api.signInEmail({
      body: { email: user.email, password: user.password },
      returnHeaders: true,
    });
    const cookie = headers.getSetCookie().map((item) => item.split(';')[0]).join('; ');
    const organizations = await auth.api.listOrganizations({ headers: new Headers({ cookie }) });

    expect(organizations).toEqual([expect.objectContaining({ id: tenant.id, slug: tenant.slug, name: tenant.name })]);
  });
});
