// Marcação da flag de super admin contra o Postgres real, pelas mesmas funções
// que o CLI chama.
import { auditLog, createDatabase, createPool, users } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as superAdmin from '../../src/provisioning/super-admin.js';
import { findSuperAdminTarget, setSuperAdmin } from '../../src/provisioning/super-admin.js';
import { createLinkedAccessProfile, createMembership, createTenant, createUserWithPassword } from '../support/fixtures.js';

describe('marcação de super admin', () => {
  const pool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(pool);

  let user: Awaited<ReturnType<typeof createUserWithPassword>>;
  let tenant: Awaited<ReturnType<typeof createTenant>>;

  const flagOf = async (userId: string) => {
    const [row] = await db.semTenant({ reason: 'cli' }, (tx) =>
      tx.select({ flag: users.isSuperAdmin }).from(users).where(eq(users.id, userId)),
    );
    return row?.flag;
  };

  const platformLogOf = (userId: string) =>
    db.semTenant({ reason: 'cli' }, (tx) =>
      tx
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entityId, userId), isNull(auditLog.tenantId)))
        .orderBy(asc(auditLog.id)),
    );

  beforeAll(async () => {
    user = await createUserWithPassword(db, 'Desenvolvedor');
    tenant = await createTenant(db, 'super-admin');
    await createMembership(db, user.id, tenant.id, { isDefault: true });
    await createLinkedAccessProfile(db, tenant.id, user.id, 'Corretor');
  });

  afterAll(() => pool.end());

  it('encontra o usuário pelo e-mail, sem diferenciar maiúsculas', async () => {
    expect(await findSuperAdminTarget(db, ` ${user.email.toUpperCase()} `)).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    expect(await findSuperAdminTarget(db, 'ninguem@teste.local')).toBeNull();
  });

  it('marca e desmarca a flag', async () => {
    expect(await setSuperAdmin(db, user.id, true)).toBe(true);
    expect(await flagOf(user.id)).toBe(true);

    expect(await setSuperAdmin(db, user.id, false)).toBe(true);
    expect(await flagOf(user.id)).toBe(false);
  });

  it('pedir o estado em que o usuário já está não grava nada', async () => {
    const before = (await platformLogOf(user.id)).length;

    expect(await setSuperAdmin(db, user.id, false)).toBe(false);
    expect(await platformLogOf(user.id)).toHaveLength(before);
  });

  it('registra cada mudança em audit_log como ação de plataforma, com autor nulo', async () => {
    const before = (await platformLogOf(user.id)).length;

    await setSuperAdmin(db, user.id, true);
    await setSuperAdmin(db, user.id, false);

    const rows = (await platformLogOf(user.id)).slice(before);
    expect(rows.map((row) => [row.entity, row.field, row.oldValue, row.newValue, row.userId])).toEqual([
      ['users', 'is_super_admin', 'false', 'true', null],
      ['users', 'is_super_admin', 'true', 'false', null],
    ]);
  });

  it('não aparece no histórico da empresa do usuário', async () => {
    await setSuperAdmin(db, user.id, true);

    const tenantLog = await db.withTenant(tenant.id, (tx) =>
      tx.select().from(auditLog).where(eq(auditLog.entityId, user.id)),
    );

    expect(tenantLog.filter((row) => row.field === 'is_super_admin')).toEqual([]);
  });

  it('o serviço não oferece listagem de quem tem a flag', () => {
    expect(Object.keys(superAdmin).sort()).toEqual(['findSuperAdminTarget', 'setSuperAdmin']);
  });
});
