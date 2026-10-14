// Listagem de equipe e atualização de usuário por HTTP, contra o Postgres real:
// o super admin sai como usuário comum, e a flag não muda por payload nenhum.
import { createDatabase, createPool, users, type Database } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
} from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

type User = Awaited<ReturnType<typeof createUserWithPassword>>;

const storedUser = (db: Database, userId: string) =>
  db.semTenant({ reason: 'cli' }, async (tx) => {
    const [row] = await tx
      .select({ name: users.name, isSuperAdmin: users.isSuperAdmin })
      .from(users)
      .where(eq(users.id, userId));
    return row;
  });

describe('rotas de usuários', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let broker: User;
  let superAdmin: User;
  let bareSuperAdmin: User;
  let outsider: User;
  let brokerProfile: { id: string; name: string };
  let managerProfile: { id: string; name: string };

  const listTeam = (cookie: string) => app.request(`/e/${tenant.slug}/users`, { headers: { cookie } });

  const update = (userId: string, body: unknown, cookie: string) =>
    app.request(`/e/${tenant.slug}/users/${userId}`, jsonRequest('PATCH', body, cookie));

  beforeAll(async () => {
    tenant = await createTenant(db, 'rotas-equipe');
    const otherTenant = await createTenant(db, 'rotas-equipe-alheia');
    broker = await createUserWithPassword(db, 'Bruno Corretor');
    superAdmin = await createUserWithPassword(db, 'Ana Gestora', { isSuperAdmin: true });
    bareSuperAdmin = await createUserWithPassword(db, 'Carla Sem Perfil', { isSuperAdmin: true });
    outsider = await createUserWithPassword(db, 'Diego de Outra Empresa');

    await createMembership(db, broker.id, tenant.id, { isDefault: true });
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
    it('devolve a equipe da empresa ativa, por nome, e o super admin como usuário comum', async () => {
      const response = await listTeam(await loginAs(app, broker));

      expect(response.status).toBe(200);
      // `toEqual` exato: nenhuma chave a mais marca quem tem a flag.
      expect(await response.json()).toEqual({
        users: [
          { id: superAdmin.id, name: superAdmin.name, email: superAdmin.email, image: null, accessProfiles: [managerProfile] },
          { id: broker.id, name: broker.name, email: broker.email, image: null, accessProfiles: [brokerProfile] },
          { id: bareSuperAdmin.id, name: bareSuperAdmin.name, email: bareSuperAdmin.email, image: null, accessProfiles: [] },
        ],
      });
    });

    it('é a mesma para quem tem a flag e para quem não tem', async () => {
      const asBroker = await (await listTeam(await loginAs(app, broker))).text();
      const asSuperAdmin = await (await listTeam(await loginAs(app, superAdmin))).text();

      expect(asSuperAdmin).toBe(asBroker);
      expect(asBroker).not.toMatch(/super/i);
    });
  });

  describe('atualização de usuário', () => {
    it('altera o próprio usuário e devolve o serializado', async () => {
      const editor = await createUserWithPassword(db, 'Eva Antes');
      await createMembership(db, editor.id, tenant.id, { isDefault: true });

      const response = await update(editor.id, { name: '  Eva Depois  ' }, await loginAs(app, editor));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ id: editor.id, name: 'Eva Depois', email: editor.email, image: null });
      expect(await storedUser(db, editor.id)).toMatchObject({ name: 'Eva Depois' });
    });

    it.each([
      ['is_super_admin', { is_super_admin: true }],
      ['isSuperAdmin', { isSuperAdmin: true }],
    ])('enviar %s no corpo não altera o banco, nem devolve erro revelador', async (_key, flag) => {
      const response = await update(broker.id, { name: broker.name, ...flag }, await loginAs(app, broker));

      expect(response.status).toBe(200);
      expect(await response.text()).not.toMatch(/super/i);
      expect(await storedUser(db, broker.id)).toEqual({ name: broker.name, isSuperAdmin: false });
    });

    it('só a flag no corpo responde como um corpo vazio, e o banco fica como estava', async () => {
      const cookie = await loginAs(app, broker);

      const withFlag = await update(broker.id, { is_super_admin: true }, cookie);
      const empty = await update(broker.id, {}, cookie);

      expect(withFlag.status).toBe(empty.status);
      expect(await withFlag.text()).toBe(await empty.text());
      expect(await storedUser(db, broker.id)).toEqual({ name: broker.name, isSuperAdmin: false });
    });

    it('quem tem a flag não a perde enviando-a como falsa', async () => {
      const response = await update(superAdmin.id, { is_super_admin: false, isSuperAdmin: false }, await loginAs(app, superAdmin));

      expect(response.status).toBe(200);
      expect(await storedUser(db, superAdmin.id)).toMatchObject({ isSuperAdmin: true });
    });

    it('recusa alterar outro usuário com 403, seja ele da empresa ou não', async () => {
      const cookie = await loginAs(app, broker);

      const colleague = await update(superAdmin.id, { name: 'Invadido' }, cookie);
      const stranger = await update(outsider.id, { name: 'Invadido' }, cookie);

      expect(colleague.status).toBe(403);
      // Mesma resposta nos dois casos: a recusa não diz quem é da equipe.
      expect(await stranger.text()).toBe(await colleague.text());
      expect(stranger.status).toBe(403);
      expect(await storedUser(db, superAdmin.id)).toMatchObject({ name: superAdmin.name });
      expect(await storedUser(db, outsider.id)).toMatchObject({ name: outsider.name });
    });

    it('o super admin altera qualquer usuário da empresa, mesmo sem vínculo com ela', async () => {
      const inspector = await createUserWithPassword(db, 'Sérgio Inspetor', { isSuperAdmin: true });
      const target = await createUserWithPassword(db, 'Tânia Antes');
      await createMembership(db, target.id, tenant.id);

      const response = await update(target.id, { name: 'Tânia Depois' }, await loginAs(app, inspector));

      expect(response.status).toBe(200);
      expect(await storedUser(db, target.id)).toMatchObject({ name: 'Tânia Depois' });
    });

    it('nem o super admin altera, por esta empresa, quem não é dela', async () => {
      const inspector = await createUserWithPassword(db, 'Silvia Inspetora', { isSuperAdmin: true });

      const response = await update(outsider.id, { name: 'Invadido' }, await loginAs(app, inspector));

      expect(response.status).toBe(404);
      expect(await storedUser(db, outsider.id)).toMatchObject({ name: outsider.name });
    });

    it('recusa corpo inválido com 400', async () => {
      const response = await update(broker.id, { name: '   ' }, await loginAs(app, broker));

      expect(response.status).toBe(400);
      expect(await storedUser(db, broker.id)).toMatchObject({ name: broker.name });
    });
  });
});
