// Listagem de equipe e atualização de usuário contra o Postgres real: o super
// admin sai como usuário comum, e a flag não muda por payload nenhum.
import { auditLog, createDatabase, createPool, users, type Database } from '@crm/db';
import type { UpdateUserInput } from '@crm/shared';
import { loadApiEnv } from '@crm/shared/env';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listTeamMembers, updateUser } from '../../../src/modules/users/service.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
} from '../../support/fixtures.js';

const env = loadApiEnv();

const flagOf = (db: Database, userId: string): Promise<boolean | undefined> =>
  db.semTenant({ reason: 'cli' }, async (tx) => {
    const [row] = await tx.select({ isSuperAdmin: users.isSuperAdmin }).from(users).where(eq(users.id, userId));
    return row?.isSuperAdmin;
  });

describe('usuários', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;
  let editTenant: Awaited<ReturnType<typeof createTenant>>;
  let broker: Awaited<ReturnType<typeof createUserWithPassword>>;
  let superAdmin: Awaited<ReturnType<typeof createUserWithPassword>>;
  let bareSuperAdmin: Awaited<ReturnType<typeof createUserWithPassword>>;
  let outsider: Awaited<ReturnType<typeof createUserWithPassword>>;
  let brokerProfile: { id: string; name: string };
  let managerProfile: { id: string; name: string };

  beforeAll(async () => {
    tenant = await createTenant(db, 'equipe');
    otherTenant = await createTenant(db, 'equipe-alheia');
    editTenant = await createTenant(db, 'equipe-edicao');
    broker = await createUserWithPassword(db, 'Bruno Corretor');
    superAdmin = await createUserWithPassword(db, 'Ana Gestora', { isSuperAdmin: true });
    bareSuperAdmin = await createUserWithPassword(db, 'Carla Sem Perfil', { isSuperAdmin: true });
    outsider = await createUserWithPassword(db, 'Diego de Outra Empresa');

    await createMembership(db, broker.id, tenant.id, { isDefault: true });
    await createMembership(db, broker.id, editTenant.id);
    await createMembership(db, superAdmin.id, tenant.id, { isDefault: true });
    await createMembership(db, bareSuperAdmin.id, tenant.id, { isDefault: true });
    await createMembership(db, outsider.id, otherTenant.id, { isDefault: true });
    // O super admin também tem vínculo e perfil na outra empresa: não pode vazar para cá.
    await createMembership(db, superAdmin.id, otherTenant.id);

    brokerProfile = await createLinkedAccessProfile(db, tenant.id, broker.id, 'Corretor');
    managerProfile = await createLinkedAccessProfile(db, tenant.id, superAdmin.id, 'Gestor');
    await createLinkedAccessProfile(db, otherTenant.id, superAdmin.id, 'Admin da outra');
    await createLinkedAccessProfile(db, otherTenant.id, outsider.id, 'Corretor da outra');
  });

  afterAll(() => pool.end());

  describe('listagem de equipe', () => {
    const listTeam = () => db.withTenant(tenant.id, (tx) => listTeamMembers(tx, tenant.id));

    it('traz os usuários com vínculo na empresa, por nome, com os perfis de acesso vinculados', async () => {
      expect(await listTeam()).toEqual([
        { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email, image: null, accessProfiles: [managerProfile] },
        { id: broker.id, name: broker.name, email: broker.email, image: null, accessProfiles: [brokerProfile] },
        { id: bareSuperAdmin.id, name: bareSuperAdmin.name, email: bareSuperAdmin.email, image: null, accessProfiles: [] },
      ]);
    });

    it('mostra o super admin como usuário comum: mesmas chaves, nenhum sinal da flag', async () => {
      const team = await listTeam();

      expect(new Set(team.map((member) => Object.keys(member).sort().join()))).toEqual(
        new Set(['accessProfiles,email,id,image,name']),
      );
      expect(JSON.stringify(team)).not.toMatch(/super/i);
    });

    it('não inventa perfil para o super admin: sem vínculo de perfil, lista vazia', async () => {
      const team = await listTeam();

      expect(team.find((member) => member.id === bareSuperAdmin.id)?.accessProfiles).toEqual([]);
    });

    it('deixa de fora quem não tem vínculo com a empresa e os perfis de outra empresa', async () => {
      const team = await listTeam();

      expect(team.map((member) => member.id)).not.toContain(outsider.id);
      expect(team.flatMap((member) => member.accessProfiles.map((profile) => profile.name))).toEqual([
        'Gestor',
        'Corretor',
      ]);
    });
  });

  describe('atualização de usuário', () => {
    const update = (userId: string, input: unknown) =>
      db.withTenant(editTenant.id, (tx) =>
        // O corpo chega cru de propósito: é o serviço que precisa descartar a flag.
        updateUser(tx, { tenantId: editTenant.id, userId: broker.id }, userId, input as UpdateUserInput),
      );

    /** Usuário com vínculo numa empresa só destes testes, para não mexer na equipe listada acima. */
    const createMember = async (name: string, options: { isSuperAdmin?: boolean } = {}) => {
      const member = await createUserWithPassword(db, name, options);
      await createMembership(db, member.id, editTenant.id, { isDefault: true });
      return member;
    };

    const auditedFields = (userId: string): Promise<string[]> =>
      db.withTenant(editTenant.id, async (tx) => {
        const rows = await tx
          .select({ field: auditLog.field })
          .from(auditLog)
          .where(and(eq(auditLog.entity, 'users'), eq(auditLog.entityId, userId)));
        return rows.map((row) => row.field).sort();
      });

    it('altera os campos editáveis, audita e devolve o usuário serializado', async () => {
      const target = await createMember('Nome Antigo');

      const updated = await update(target.id, { name: 'Nome Novo' });

      expect(updated).toEqual({ id: target.id, name: 'Nome Novo', email: target.email, image: null });
      expect(await auditedFields(target.id)).toEqual(['name']);
    });

    it.each([
      ['isSuperAdmin', { name: 'Promovido', isSuperAdmin: true }],
      ['is_super_admin', { name: 'Promovido', is_super_admin: true }],
    ])('enviar %s não torna ninguém super admin', async (_key, body) => {
      const target = await createMember('Usuário comum');

      const updated = await update(target.id, body);

      expect(updated?.name).toBe('Promovido');
      expect(JSON.stringify(updated)).not.toMatch(/super/i);
      expect(await flagOf(db, target.id)).toBe(false);
      expect(await auditedFields(target.id)).toEqual(['name']);
    });

    it('enviar a flag como falsa não rebaixa um super admin', async () => {
      const target = await createMember('Super discreto', { isSuperAdmin: true });

      await update(target.id, { name: 'Super discreto II', isSuperAdmin: false, is_super_admin: false });

      expect(await flagOf(db, target.id)).toBe(true);
    });

    it('corpo só com a flag não altera nada nem acusa erro', async () => {
      const target = await createMember('Intocado');

      const updated = await update(target.id, { is_super_admin: true });

      expect(updated).toEqual({ id: target.id, name: 'Intocado', email: target.email, image: null });
      expect(await flagOf(db, target.id)).toBe(false);
      expect(await auditedFields(target.id)).toEqual([]);
    });

    it('não alcança usuário sem vínculo com a empresa ativa', async () => {
      expect(await update(outsider.id, { name: 'Invadido' })).toBeNull();
      expect(await update(outsider.id, {})).toBeNull();

      const [row] = await db.semTenant({ reason: 'cli' }, (tx) =>
        tx.select({ name: users.name }).from(users).where(eq(users.id, outsider.id)),
      );
      expect(row?.name).toBe(outsider.name);
    });

    it('devolve nulo para usuário inexistente', async () => {
      expect(await update('0198c0de-0000-7000-8000-00000000dead', { name: 'Ninguém' })).toBeNull();
    });
  });
});
