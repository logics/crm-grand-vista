// Papéis em uso, exclusão e "garantir papel", contra o Postgres real. A tabela
// consumidora não existe ainda (vem das specs de fazendas etc.): o teste a cria,
// com FK `RESTRICT`, e declara o uso pelo registro de produção.
import { auditedWrites, contactRoles, createDatabase, createPool, userProfiles } from '@crm/db';
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { ensureContactRole } from '../../../src/modules/contacts/service.js';
import { declareRoleUsage } from '../../../src/modules/contacts/role-usage.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();
const TABLE = 'test_contact_consumers';

interface ContactBody {
  id: string;
  roles: string[];
}

describe('papéis em uso, exclusão e garantir papel', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });
  const owner = () => new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let brokerCookie: string;
  let managerId: string;
  let undeclare: () => void;

  const url = (path = '') => `/e/${tenant.slug}/contacts${path}`;
  const created = async (name: string, roles: string[]) =>
    (await (await app.request(url(), jsonRequest('POST', { personType: 'pf', name, roles }, managerCookie))).json()) as ContactBody;
  const patch = (id: string, body: unknown) => app.request(url(`/${id}`), jsonRequest('PATCH', body, managerCookie));
  const remove = (id: string, cookie = managerCookie) => app.request(url(`/${id}`), { method: 'DELETE', headers: { cookie } });
  const use = async (contactId: string, times: number) => {
    const client = owner();
    await client.connect();
    try {
      for (let i = 0; i < times; i++) await client.query(`insert into ${TABLE} (contact_id) values ($1)`, [contactId]);
    } finally {
      await client.end();
    }
  };

  beforeAll(async () => {
    const client = owner();
    await client.connect();
    try {
      await client.query(`drop table if exists ${TABLE}`);
      await client.query(`create table ${TABLE} (contact_id uuid not null references contacts(id) on delete restrict)`);
      await client.query(`grant select on ${TABLE} to crm_app`);
    } finally {
      await client.end();
    }
    undeclare = declareRoleUsage('owner', {
      table: TABLE,
      column: 'contact_id',
      label: { singular: 'fazenda', plural: 'fazendas' },
    });

    tenant = await createTenant(db, 'contatos-papeis');
    const manager = await createUserWithPassword(db, 'Gestora');
    const broker = await createUserWithPassword(db, 'Corretor');
    managerId = manager.id;
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await createMembership(db, broker.id, tenant.id, { isDefault: true });
    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: manager.id, profileId: ids.get('Admin')! },
        { tenantId: tenant.id, userId: broker.id, profileId: ids.get('Corretor')! },
      ]);
    });
    managerCookie = await loginAs(app, manager);
    brokerCookie = await loginAs(app, broker);
  });

  afterAll(async () => {
    undeclare();
    const client = owner();
    await client.connect();
    try {
      await client.query(`drop table if exists ${TABLE}`);
    } finally {
      await client.end();
    }
    await pool.end();
  });

  describe('retirar papel em uso', () => {
    it('é 409 com a contagem e o rótulo da entidade, e nada é gravado', async () => {
      const joao = await created('João', ['owner', 'buyer']);
      await use(joao.id, 2);

      const response = await patch(joao.id, { roles: ['buyer'] });

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { message: 'João é proprietário de 2 fazendas; troque o proprietário antes de retirar o papel.' },
      });
      const after = (await (await app.request(url(`/${joao.id}`), { headers: { cookie: managerCookie } })).json()) as ContactBody;
      expect(after.roles).toEqual(['buyer', 'owner']);
    });

    it('usa o singular com uma só linha', async () => {
      const maria = await created('Maria', ['owner', 'buyer']);
      await use(maria.id, 1);

      const response = await patch(maria.id, { roles: ['buyer'] });

      expect(await response.json()).toMatchObject({
        error: { message: 'Maria é proprietário de 1 fazenda; troque o proprietário antes de retirar o papel.' },
      });
    });

    it('fora de uso passa; papel sem declaração também', async () => {
      const livre = await created('Livre', ['owner', 'buyer']);
      expect((await patch(livre.id, { roles: ['buyer'] })).status).toBe(200);

      const comprador = await created('Comprador usado', ['owner', 'buyer']);
      await use(comprador.id, 1);
      expect((await patch(comprador.id, { roles: ['owner'] })).status).toBe(200);
    });
  });

  describe('excluir contato', () => {
    it('referenciado por FK RESTRICT é 409 com o rótulo da entidade, e o contato fica', async () => {
      const usado = await created('Usado', ['owner']);
      await use(usado.id, 1);

      const response = await remove(usado.id);

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { message: 'Este contato está em uso em Fazendas. Remova os vínculos antes de excluir.' },
      });
      expect((await app.request(url(`/${usado.id}`), { headers: { cookie: managerCookie } })).status).toBe(200);
    });

    it('sem referência é 204 e os papéis somem junto', async () => {
      const solto = await created('Solto', ['buyer', 'external_broker']);

      expect((await remove(solto.id)).status).toBe(204);

      expect((await app.request(url(`/${solto.id}`), { headers: { cookie: managerCookie } })).status).toBe(404);
      expect(await db.withTenant(tenant.id, (tx) => tx.select().from(contactRoles).where(eq(contactRoles.contactId, solto.id)))).toEqual([]);
    });

    it('contato inexistente ou id malformado é 404', async () => {
      expect((await remove('0198a000-0000-7000-8000-000000000099')).status).toBe(404);
      expect((await remove('nao-e-uuid')).status).toBe(404);
    });

    it('sem contatos.excluir (Corretor) é 403 e o contato fica', async () => {
      const protegido = await created('Protegido', ['buyer']);

      expect((await remove(protegido.id, brokerCookie)).status).toBe(403);
      expect((await app.request(url(`/${protegido.id}`), { headers: { cookie: managerCookie } })).status).toBe(200);
    });
  });

  describe('garantir papel', () => {
    it('acrescenta uma vez só e registra no histórico', async () => {
      const contato = await created('Pedro', ['buyer']);
      const actor = { tenantId: tenant.id, userId: managerId };

      const first = await db.withTenant(tenant.id, (tx) => ensureContactRole(tx, actor, contato.id, 'owner'));
      const second = await db.withTenant(tenant.id, (tx) => ensureContactRole(tx, actor, contato.id, 'owner'));

      expect([first, second]).toEqual([true, false]);
      const roles = await db.withTenant(tenant.id, (tx) => tx.select().from(contactRoles).where(eq(contactRoles.contactId, contato.id)));
      expect(roles.map((r) => r.role).sort()).toEqual(['buyer', 'owner']);
      const history = (await (await app.request(url(`/${contato.id}/history`), { headers: { cookie: managerCookie } })).json()) as {
        entries: { children: { title: string }[] }[];
      };
      const titles = history.entries.flatMap((entry) => entry.children.map((child) => child.title));
      expect(titles.filter((title) => title === 'Papel adicionado: Proprietário')).toHaveLength(1);
    });
  });
});
