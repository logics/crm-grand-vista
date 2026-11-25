// Filtro "Indicado por" nas listas de fazendas e de contatos pelo HTTP real, contra o
// Postgres (spec fase-1-cadeia-de-indicacao, critérios 10, 11, 12 e 13 em parte).
import { auditedWrites, commercialStatuses, createDatabase, createPool, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();
const RIO_VERDE = '5218805';
const INVALID_MESSAGE = 'Indicador inválido.';

interface ListBody {
  items: { id: string; name: string }[];
  total: number;
  error?: { message: string; field?: string };
}

describe('filtro "Indicado por" nas listas', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let broker: { id: string };
  let carlos: { id: string };
  let managerCookie: string;
  let brokerCookie: string;
  let otherCookie: string;
  let deactivated: string;
  let counter = 0;

  const unique = (name: string) => `${name} ${(counter += 1)}`;
  const asContact = (id: string) => ({ referrer: { kind: 'contact', id } });
  const asUser = (id: string) => ({ referrer: { kind: 'user', id } });
  const list = async (kind: 'farms' | 'contacts', query: string, cookie = managerCookie, slug = tenant.slug) =>
    app.request(`/e/${slug}/${kind}?${query}`, { headers: { cookie } });
  const listBody = async (kind: 'farms' | 'contacts', query: string, cookie = managerCookie, slug = tenant.slug) =>
    (await (await list(kind, query, cookie, slug)).json()) as ListBody;
  const namesOf = (page: ListBody) => page.items.map((item) => item.name).sort();
  const createFarm = async (
    extra: Record<string, unknown> = {},
    name = unique('Fazenda'),
    cookie = managerCookie,
    slug = tenant.slug,
  ) => {
    const response = await app.request(
      `/e/${slug}/farms`,
      jsonRequest('POST', { name, municipalityIbgeCode: RIO_VERDE, totalAreaHa: '1000', ...extra }, cookie),
    );
    expect(response.status).toBe(201);
    return (await response.json()) as { id: string; name: string };
  };
  const createContact = async (
    extra: Record<string, unknown> = {},
    name = unique('Contato'),
    cookie = managerCookie,
    slug = tenant.slug,
  ) => {
    const response = await app.request(
      `/e/${slug}/contacts`,
      jsonRequest('POST', { personType: 'pf', name, roles: ['buyer'], ...extra }, cookie),
    );
    expect(response.status).toBe(201);
    return (await response.json()) as { id: string; name: string };
  };

  let joao: { id: string; name: string };
  let antonio: { id: string; name: string };
  let sebastiao: { id: string; name: string };

  beforeAll(async () => {
    tenant = await createTenant(db, 'filtro-indicado-por');
    other = await createTenant(db, 'filtro-indicado-por-b');
    const [m, b, c, o] = await Promise.all(
      ['Gestora', 'Corretora', 'Carlos', 'Gestora B'].map((name) => createUserWithPassword(db, name)),
    );
    for (const user of [m!, b!, c!]) await createMembership(db, user.id, tenant.id, { isDefault: true });
    await createMembership(db, o!.id, other.id, { isDefault: true });
    broker = { id: b!.id };
    carlos = { id: c!.id };

    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: m!.id, profileId: ids.get('Gestor')! },
        { tenantId: tenant.id, userId: b!.id, profileId: ids.get('Corretor')! },
      ]);
      await tx
        .insert(commercialStatuses)
        .values({ tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 });
      const [status] = await tx
        .insert(commercialStatuses)
        .values({ tenantId: tenant.id, name: 'Desativada', systemMeaning: 'inactive', displayOrder: 1 })
        .returning();
      deactivated = status!.id;
    });
    await db.withTenant(other.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: other.id, userId: null }), other.id);
      await tx.insert(userProfiles).values({ tenantId: other.id, userId: o!.id, profileId: ids.get('Gestor')! });
      await tx.insert(commercialStatuses).values({ tenantId: other.id, name: 'Disponível', systemMeaning: 'available' });
    });
    managerCookie = await loginAs(app, m!);
    brokerCookie = await loginAs(app, b!);
    otherCookie = await loginAs(app, o!);

    joao = await createContact({}, 'João');
    antonio = await createContact({}, 'Antônio');
    sebastiao = await createContact({}, 'Sebastião');
  });

  afterAll(() => pool.end());

  describe('fazendas (10)', () => {
    let withAntonioFirst: string;
    let withAntonioSecond: string;
    let withCarlosOnly: string;
    let withJoao: string;
    let withoutAntonio: string;
    let deactivatedWithAntonio: string;

    beforeAll(async () => {
      withAntonioFirst = (await createFarm({ referralChain: [asContact(antonio.id)] }, unique('Antônio na 1'))).name;
      withAntonioSecond = (
        await createFarm({ referralChain: [asUser(carlos.id), asContact(antonio.id)] }, unique('Antônio na 2'))
      ).name;
      withCarlosOnly = (await createFarm({ referralChain: [asUser(carlos.id), asContact(sebastiao.id)] }, unique('Só Carlos')))
        .name;
      withJoao = (await createFarm({ referralChain: [asContact(joao.id), asUser(carlos.id)] }, unique('João na 1'))).name;
      withoutAntonio = (await createFarm({ referralChain: [asContact(sebastiao.id)] }, unique('Sem Antônio'))).name;
      await createFarm({}, unique('Sem cadeia'));
      deactivatedWithAntonio = (
        await createFarm(
          { referralChain: [asContact(antonio.id)], commercialStatusId: deactivated },
          unique('Desativada Antônio'),
        )
      ).name;
    });

    it('referrerContactId traz as fazendas com o contato em qualquer posição e deixa de fora as outras', async () => {
      const page = await listBody('farms', `referrerContactId=${antonio.id}`);
      expect(namesOf(page)).toEqual([withAntonioFirst, withAntonioSecond].sort());
      expect(page.total).toBe(2);
      expect(namesOf(page)).not.toContain(withoutAntonio);
    });

    it('referrerUserId traz as fazendas com o usuário em qualquer posição', async () => {
      const page = await listBody('farms', `referrerUserId=${carlos.id}`);
      expect(namesOf(page)).toEqual([withAntonioSecond, withCarlosOnly, withJoao].sort());
      expect(page.total).toBe(3);
    });

    it('os dois juntos casam com qualquer um dos indicadores escolhidos', async () => {
      const page = await listBody('farms', `referrerContactId=${joao.id}&referrerUserId=${carlos.id}`);
      expect(namesOf(page)).toEqual([withAntonioSecond, withCarlosOnly, withJoao].sort());
      const several = await listBody('farms', `referrerContactId=${joao.id},${antonio.id}`);
      expect(namesOf(several)).toEqual([withAntonioFirst, withAntonioSecond, withJoao].sort());
    });

    it('combinado com outro filtro soma por E', async () => {
      const page = await listBody('farms', `referrerContactId=${antonio.id}&commercialStatusId=${deactivated}`);
      expect(namesOf(page)).toEqual([deactivatedWithAntonio]);
      expect(page.total).toBe(1);
      const byName = await listBody('farms', `referrerContactId=${antonio.id}&q=${encodeURIComponent('na 2')}`);
      expect(namesOf(byName)).toEqual([withAntonioSecond]);
    });

    it('as desativadas só entram com o status explícito', async () => {
      const implicit = await listBody('farms', `referrerContactId=${antonio.id}`);
      expect(namesOf(implicit)).not.toContain(deactivatedWithAntonio);
      const all = await listBody('farms', `referrerContactId=${antonio.id}&commercialStatusId=${deactivated}`);
      expect(namesOf(all)).toContain(deactivatedWithAntonio);
    });
  });

  describe('contatos (10)', () => {
    let pedro: string;
    let maria: string;
    let ana: string;
    let semIndicador: string;

    beforeAll(async () => {
      pedro = (await createContact({ referralChain: [asContact(joao.id), asContact(sebastiao.id)] }, unique('Pedro'))).name;
      maria = (await createContact({ referralChain: [asUser(carlos.id), asContact(joao.id)] }, unique('Maria'))).name;
      ana = (await createContact({ referralChain: [asContact(antonio.id)] }, unique('Ana'))).name;
      semIndicador = (await createContact({}, unique('Sem indicador'))).name;
    });

    it('referrerContactId traz os contatos com o indicador em qualquer posição', async () => {
      const page = await listBody('contacts', `referrerContactId=${sebastiao.id}`);
      expect(namesOf(page)).toEqual([pedro]);
      const joaoPage = await listBody('contacts', `referrerContactId=${joao.id}`);
      expect(namesOf(joaoPage)).toEqual([maria, pedro].sort());
      expect(joaoPage.total).toBe(2);
    });

    it('referrerUserId traz os contatos com o usuário em qualquer posição', async () => {
      const page = await listBody('contacts', `referrerUserId=${carlos.id}`);
      expect(namesOf(page)).toEqual([maria]);
    });

    it('os dois juntos casam com qualquer um dos indicadores escolhidos', async () => {
      const page = await listBody('contacts', `referrerContactId=${antonio.id}&referrerUserId=${carlos.id}`);
      expect(namesOf(page)).toEqual([ana, maria].sort());
      expect(namesOf(page)).not.toContain(semIndicador);
    });

    it('combinado com outro filtro soma por E', async () => {
      const page = await listBody('contacts', `referrerContactId=${joao.id}&q=${encodeURIComponent('Pedro')}`);
      expect(namesOf(page)).toEqual([pedro]);
      const none = await listBody('contacts', `referrerContactId=${joao.id}&role=owner`);
      expect(none.total).toBe(0);
    });
  });

  describe('sem duplicar (11)', () => {
    it('fazenda com João na 1 e Carlos na 2, filtrada pelos dois, aparece uma vez e o total é 1', async () => {
      const farm = await createFarm({ referralChain: [asContact(joao.id), asUser(carlos.id)] }, unique('Dois escolhidos'));
      const page = await listBody(
        'farms',
        `referrerContactId=${joao.id}&referrerUserId=${carlos.id}&q=${encodeURIComponent(farm.name)}`,
      );
      expect(page.items.filter((item) => item.id === farm.id)).toHaveLength(1);
      expect(page.total).toBe(1);
    });

    it('contato com dois dos indicadores escolhidos aparece uma vez e o total é 1', async () => {
      const contact = await createContact(
        { referralChain: [asContact(joao.id), asContact(sebastiao.id)] },
        unique('Duas indicações'),
      );
      const page = await listBody(
        'contacts',
        `referrerContactId=${joao.id},${sebastiao.id}&q=${encodeURIComponent(contact.name)}`,
      );
      expect(page.items.filter((item) => item.id === contact.id)).toHaveLength(1);
      expect(page.total).toBe(1);
    });
  });

  describe('escopo de dados (12)', () => {
    it('o Corretor own vê só a fazenda dele, com total 1; o Gestor vê as três', async () => {
      const referrer = await createContact({}, unique('Indicador de três'));
      const mine = await createFarm({ responsibleUserId: broker.id, referralChain: [asContact(referrer.id)] });
      const second = await createFarm({ referralChain: [asContact(referrer.id)] });
      const third = await createFarm({ referralChain: [asContact(referrer.id)] });

      const asBroker = await listBody('farms', `referrerContactId=${referrer.id}`, brokerCookie);
      expect(asBroker.items.map((item) => item.id)).toEqual([mine.id]);
      expect(asBroker.total).toBe(1);
      // O total do filtro é o número de fazendas que o Corretor realmente enxerga: abre as três pela ficha e conta as 200.
      const statuses = await Promise.all(
        [mine, second, third].map(
          async (farm) => (await app.request(`/e/${tenant.slug}/farms/${farm.id}`, { headers: { cookie: brokerCookie } })).status,
        ),
      );
      expect(statuses.filter((status) => status === 200)).toHaveLength(asBroker.total);

      const asManager = await listBody('farms', `referrerContactId=${referrer.id}`);
      expect(asManager.items.map((item) => item.id).sort()).toEqual([mine.id, second.id, third.id].sort());
      expect(asManager.total).toBe(3);
    });
  });

  describe('outra empresa e id malformado (13, parte)', () => {
    it('o filtro não enxerga elos de outra empresa, nas duas listas e nos dois sentidos', async () => {
      const contactB = await createContact({}, unique('Contato B'), otherCookie, other.slug);
      await createFarm({ referralChain: [asContact(contactB.id)] }, unique('Fazenda B'), otherCookie, other.slug);
      await createContact({ referralChain: [asContact(contactB.id)] }, unique('Contato indicado B'), otherCookie, other.slug);

      for (const kind of ['farms', 'contacts'] as const) {
        expect((await listBody(kind, `referrerContactId=${contactB.id}`)).total).toBe(0);
        expect((await listBody(kind, `referrerContactId=${contactB.id}`, otherCookie, other.slug)).total).toBeGreaterThan(0);
        expect((await listBody(kind, `referrerContactId=${antonio.id}`, otherCookie, other.slug)).total).toBe(0);
        expect((await listBody(kind, `referrerUserId=${carlos.id}`, otherCookie, other.slug)).total).toBe(0);
      }
    });

    it.each(['farms', 'contacts'] as const)('id malformado em %s é 400 com "Indicador inválido."', async (kind) => {
      for (const query of ['referrerContactId=abc', 'referrerUserId=abc', `referrerContactId=${antonio.id},abc`]) {
        const response = await list(kind, query);
        expect(response.status, query).toBe(400);
        const body = (await response.json()) as ListBody;
        expect(body.error?.message).toContain(INVALID_MESSAGE);
      }
    });
  });
});
