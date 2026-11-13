// Proprietários de fazenda por HTTP, contra o Postgres real: troca do principal
// por diferença ordenada, concorrência, papel garantido, uso declarado e a seção
// "Fazendas" da ficha do contato com o escopo de dados.
import { auditedWrites, commercialStatuses, contactRoles, createDatabase, createPool, farmOwners, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();
const RIO_VERDE = '5218805';

interface FarmBody {
  id: string;
  owners: { contactId: string; name: string; isPrimary: boolean }[];
}
interface HistoryBody {
  entries: {
    title: string;
    changes: { field: string; from: string | null; to: string | null }[];
    children: { title: string; changes: { field: string; from: string | null; to: string | null }[] }[];
  }[];
}
interface ByOwnerBody {
  items: { id: string; name: string; isPrimary: boolean; commercialStatus: { name: string } }[];
  total: number;
}

describe('proprietários de fazenda', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let brokerCookie: string;
  let brokerId: string;
  let soldStatus: string;

  const url = (path = '') => `/e/${tenant.slug}/farms${path}`;
  const createFarm = (body: Record<string, unknown>, cookie = managerCookie) =>
    app.request(url(), jsonRequest('POST', { name: 'Fazenda', municipalityIbgeCode: RIO_VERDE, totalAreaHa: '100', ...body }, cookie));
  const patchFarm = (id: string, body: unknown, cookie = managerCookie) =>
    app.request(url(`/${id}`), jsonRequest('PATCH', body, cookie));
  const readFarm = async (id: string) =>
    (await (await app.request(url(`/${id}`), { headers: { cookie: managerCookie } })).json()) as FarmBody;
  const history = async (id: string) =>
    (await (await app.request(url(`/${id}/history`), { headers: { cookie: managerCookie } })).json()) as HistoryBody;
  const newContact = async (name: string, roles: string[] = ['buyer'], slug = tenant.slug, cookie = managerCookie) =>
    ((await (
      await app.request(`/e/${slug}/contacts`, jsonRequest('POST', { personType: 'pf', name, roles }, cookie))
    ).json()) as { id: string }).id;
  const rolesOf = (contactId: string) =>
    db.withTenant(tenant.id, async (tx) =>
      (await tx.select().from(contactRoles).where(eq(contactRoles.contactId, contactId))).map((row) => row.role),
    );
  const primaries = (farmId: string) =>
    db.withTenant(tenant.id, async (tx) =>
      (await tx.select().from(farmOwners).where(eq(farmOwners.farmId, farmId))).filter((row) => row.isPrimary).length,
    );

  beforeAll(async () => {
    tenant = await createTenant(db, 'fazendas-proprietarios');
    other = await createTenant(db, 'fazendas-proprietarios-alheia');
    const manager = await createUserWithPassword(db, 'Gestora');
    const broker = await createUserWithPassword(db, 'Corretor');
    brokerId = broker.id;
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await createMembership(db, broker.id, tenant.id, { isDefault: true });
    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: manager.id, profileId: ids.get('Gestor')! },
        { tenantId: tenant.id, userId: broker.id, profileId: ids.get('Corretor')! },
      ]);
      const statuses = await tx
        .insert(commercialStatuses)
        .values([
          { tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 },
          { tenantId: tenant.id, name: 'Vendida', systemMeaning: 'sold', displayOrder: 1 },
        ])
        .returning();
      soldStatus = statuses[1]!.id;
    });
    managerCookie = await loginAs(app, manager);
    brokerCookie = await loginAs(app, broker);
  });

  afterAll(() => pool.end());

  describe('incluir proprietários (critério 8)', () => {
    it('grava farm_owners, garante o papel proprietário uma vez só e registra no histórico', async () => {
      const joao = await newContact('João', ['owner']);
      const maria = await newContact('Maria');
      const response = await createFarm({
        owners: [
          { contactId: joao, isPrimary: false },
          { contactId: maria, isPrimary: true },
        ],
      });

      expect(response.status).toBe(201);
      const farm = (await response.json()) as FarmBody;
      expect(farm.owners).toEqual([
        { contactId: joao, name: 'João', isPrimary: false },
        { contactId: maria, name: 'Maria', isPrimary: true },
      ]);
      expect(await readFarm(farm.id)).toMatchObject({ owners: farm.owners });
      expect(await rolesOf(joao)).toEqual(['owner']);
      expect((await rolesOf(maria)).sort()).toEqual(['buyer', 'owner']);

      const [entry] = (await history(farm.id)).entries;
      const titles = entry!.children.map((child) => child.title);
      expect(titles).toEqual(expect.arrayContaining(['Proprietário adicionado: João', 'Proprietário adicionado: Maria']));
      expect(entry!.changes).toContainEqual({ field: 'Proprietário principal', from: null, to: 'Maria' });
    });

    it('sem principal ou com dois principais é 400, e nada é gravado', async () => {
      const a = await newContact('Ana');
      const b = await newContact('Beto');
      const none = [{ contactId: a, isPrimary: false }];
      const two = [
        { contactId: a, isPrimary: true },
        { contactId: b, isPrimary: true },
      ];
      expect((await createFarm({ name: 'Sem principal', owners: none })).status).toBe(400);
      expect((await createFarm({ name: 'Dois principais', owners: two })).status).toBe(400);

      const farm = (await (await createFarm({ owners: [{ contactId: a, isPrimary: true }] })).json()) as FarmBody;
      expect((await patchFarm(farm.id, { owners: none })).status).toBe(400);
      expect((await patchFarm(farm.id, { owners: two })).status).toBe(400);
      expect((await readFarm(farm.id)).owners).toEqual([{ contactId: a, name: 'Ana', isPrimary: true }]);
      expect(await rolesOf(b)).toEqual(['buyer']);
    });

    it('contato repetido na lista é 400', async () => {
      const a = await newContact('Ana repetida');
      const response = await createFarm({
        owners: [
          { contactId: a, isPrimary: true },
          { contactId: a, isPrimary: false },
        ],
      });
      expect(response.status).toBe(400);
    });

    it('PATCH sem owners não mexe nos proprietários; owners: [] retira todos', async () => {
      const a = await newContact('Ana sem patch');
      const farm = (await (await createFarm({ owners: [{ contactId: a, isPrimary: true }] })).json()) as FarmBody;

      expect((await patchFarm(farm.id, { name: 'Outro nome' })).status).toBe(200);
      expect((await readFarm(farm.id)).owners).toHaveLength(1);

      expect((await patchFarm(farm.id, { owners: [] })).status).toBe(200);
      expect((await readFarm(farm.id)).owners).toEqual([]);
    });
  });

  describe('trocar o principal (critério 9)', () => {
    it('entre dois proprietários existentes, num só PATCH, com o histórico mostrando só o principal', async () => {
      const joao = await newContact('João troca');
      const maria = await newContact('Maria troca');
      const farm = (await (
        await createFarm({
          owners: [
            { contactId: joao, isPrimary: true },
            { contactId: maria, isPrimary: false },
          ],
        })
      ).json()) as FarmBody;

      const response = await patchFarm(farm.id, {
        owners: [
          { contactId: joao, isPrimary: false },
          { contactId: maria, isPrimary: true },
        ],
      });

      expect(response.status).toBe(200);
      expect(((await response.json()) as FarmBody).owners.map((o) => [o.name, o.isPrimary])).toEqual([
        ['João troca', false],
        ['Maria troca', true],
      ]);
      const [entry] = (await history(farm.id)).entries;
      expect(entry!.title).toBe('Proprietário principal alterado');
      expect(entry!.changes).toEqual([{ field: 'Proprietário principal', from: 'João troca', to: 'Maria troca' }]);
      expect(entry!.children).toEqual([]);
    });

    it('para um proprietário que entra no mesmo save, sem erro e sem tocar em quem não mudou', async () => {
      const joao = await newContact('João entra');
      const maria = await newContact('Maria fica');
      const pedro = await newContact('Pedro entra');
      const farm = (await (
        await createFarm({
          owners: [
            { contactId: joao, isPrimary: true },
            { contactId: maria, isPrimary: false },
          ],
        })
      ).json()) as FarmBody;

      const response = await patchFarm(farm.id, {
        owners: [
          { contactId: joao, isPrimary: false },
          { contactId: maria, isPrimary: false },
          { contactId: pedro, isPrimary: true },
        ],
      });

      expect(response.status).toBe(200);
      expect(await primaries(farm.id)).toBe(1);
      const [entry] = (await history(farm.id)).entries;
      expect(entry!.children.map((child) => child.title)).toEqual(['Proprietário adicionado: Pedro entra']);
      expect(entry!.changes).toEqual([{ field: 'Proprietário principal', from: 'João entra', to: 'Pedro entra' }]);
      expect(await rolesOf(pedro)).toContain('owner');
    });

    it('retirar o principal e promover outro no mesmo save', async () => {
      const joao = await newContact('João sai');
      const maria = await newContact('Maria promovida');
      const farm = (await (
        await createFarm({
          owners: [
            { contactId: joao, isPrimary: true },
            { contactId: maria, isPrimary: false },
          ],
        })
      ).json()) as FarmBody;

      const response = await patchFarm(farm.id, { owners: [{ contactId: maria, isPrimary: true }] });

      expect(response.status).toBe(200);
      expect((await readFarm(farm.id)).owners).toEqual([{ contactId: maria, name: 'Maria promovida', isPrimary: true }]);
      const [entry] = (await history(farm.id)).entries;
      expect(entry!.changes).toContainEqual({ field: 'Proprietário principal', from: 'João sai', to: 'Maria promovida' });
      expect(entry!.children.map((child) => child.title)).toEqual(['Proprietário removido: João sai']);
    });
  });

  describe('concorrência (critério 10)', () => {
    it('dois PATCH simultâneos trocando o principal terminam sem 500, com exatamente um principal', async () => {
      const joao = await newContact('João corre');
      const maria = await newContact('Maria corre');
      const pedro = await newContact('Pedro corre');
      const farm = (await (
        await createFarm({
          owners: [
            { contactId: joao, isPrimary: true },
            { contactId: maria, isPrimary: false },
            { contactId: pedro, isPrimary: false },
          ],
        })
      ).json()) as FarmBody;
      const asPrimary = (primary: string) => ({
        owners: [joao, maria, pedro].map((contactId) => ({ contactId, isPrimary: contactId === primary })),
      });

      const [a, b] = await Promise.all([patchFarm(farm.id, asPrimary(maria)), patchFarm(farm.id, asPrimary(pedro))]);

      expect([200, 409]).toContain(a.status);
      expect([200, 409]).toContain(b.status);
      expect(await primaries(farm.id)).toBe(1);
    });
  });

  describe('referências (critério 33)', () => {
    it('contato de outra empresa como proprietário é 400 no campo owners, e nenhum papel é gravado nele', async () => {
      const outsider = await (async () => {
        const user = await createUserWithPassword(db, 'Gestora alheia');
        await createMembership(db, user.id, other.id, { isDefault: true });
        await db.withTenant(other.id, async (tx) => {
          const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: other.id, userId: null }), other.id);
          await tx.insert(userProfiles).values({ tenantId: other.id, userId: user.id, profileId: ids.get('Gestor')! });
        });
        return newContact('Alheio', ['buyer'], other.slug, await loginAs(app, user));
      })();

      const response = await createFarm({ owners: [{ contactId: outsider, isPrimary: true }] });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { field: 'owners' } });
      const roles = await db.withTenant(other.id, async (tx) =>
        tx.select().from(contactRoles).where(eq(contactRoles.contactId, outsider)),
      );
      expect(roles.map((row) => row.role)).toEqual(['buyer']);
    });
  });

  describe('escopo', () => {
    it('PATCH de owners em fazenda alheia com escopo own é 404', async () => {
      const a = await newContact('Ana escopo');
      const farm = (await (await createFarm({ owners: [{ contactId: a, isPrimary: true }] })).json()) as FarmBody;

      const response = await patchFarm(farm.id, { owners: [] }, brokerCookie);

      expect(response.status).toBe(404);
      expect((await readFarm(farm.id)).owners).toHaveLength(1);
    });
  });

  describe('seção do contato (critério 18)', () => {
    it('o Corretor own vê só as suas fazendas do contato, e a contagem também', async () => {
      const dono = await newContact('Dono de duas');
      await createFarm({ name: 'Do Corretor', responsibleUserId: brokerId, owners: [{ contactId: dono, isPrimary: true }] });
      await createFarm({ name: 'Do Gestor', owners: [{ contactId: dono, isPrimary: true }] });

      const asBroker = (await (
        await app.request(url(`/by-owner/${dono}`), { headers: { cookie: brokerCookie } })
      ).json()) as ByOwnerBody;
      const asManager = (await (
        await app.request(url(`/by-owner/${dono}`), { headers: { cookie: managerCookie } })
      ).json()) as ByOwnerBody;

      expect(asBroker.items.map((item) => item.name)).toEqual(['Do Corretor']);
      expect(asBroker.total).toBe(1);
      expect(asManager.total).toBe(2);
    });

    it('mostra a fazenda em qualquer status, com o principal marcado', async () => {
      const dono = await newContact('Dono vendido');
      const outro = await newContact('Outro dono');
      const farm = (await (
        await createFarm({
          name: 'Vendida',
          commercialStatusId: soldStatus,
          owners: [
            { contactId: outro, isPrimary: true },
            { contactId: dono, isPrimary: false },
          ],
        })
      ).json()) as FarmBody;

      const body = (await (
        await app.request(url(`/by-owner/${dono}`), { headers: { cookie: managerCookie } })
      ).json()) as ByOwnerBody;

      expect(body.items).toMatchObject([{ id: farm.id, isPrimary: false, commercialStatus: { name: 'Vendida' } }]);
    });

    it('contato inexistente ou malformado é lista vazia, não 404', async () => {
      const response = await app.request(url('/by-owner/nao-e-id'), { headers: { cookie: managerCookie } });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ items: [], total: 0 });
    });
  });

  describe('uso declarado (critério 11)', () => {
    it('retirar o papel proprietário de quem é proprietário de fazenda é 409 com a contagem', async () => {
      const joao = await newContact('João em uso', ['owner', 'buyer']);
      await createFarm({ owners: [{ contactId: joao, isPrimary: true }] });

      const response = await app.request(
        `/e/${tenant.slug}/contacts/${joao}`,
        jsonRequest('PATCH', { roles: ['buyer'] }, managerCookie),
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { message: expect.stringContaining('é proprietário de 1 fazenda') },
      });
      expect(await rolesOf(joao)).toContain('owner');
    });

    it('excluir esse contato é 409 com a frase declarada', async () => {
      const joao = await newContact('João excluir', ['owner']);
      await createFarm({ owners: [{ contactId: joao, isPrimary: true }] });

      const response = await app.request(`/e/${tenant.slug}/contacts/${joao}`, {
        method: 'DELETE',
        headers: { cookie: managerCookie },
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { message: 'Este contato é proprietário de fazenda. Remova-o das fazendas antes de excluir.' },
      });
    });
  });
});
