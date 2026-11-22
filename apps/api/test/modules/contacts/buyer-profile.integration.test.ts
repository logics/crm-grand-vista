// Perfil de compra aninhado no contato (`buyerProfile`), contra o Postgres real:
// gravação num `change_id`, substituição completa, perfil vazio, papel
// comprador, validações, cadastros inativos, exclusão e isolamento entre empresas.
import {
  auditedWrites,
  buyerCrops,
  buyerPaymentMethods,
  buyerProfiles,
  buyerRegions,
  createDatabase,
  createPool,
  crops,
  paymentMethods,
  purchaseProfiles,
  userProfiles,
} from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

interface ContactBody {
  id: string;
  roles: string[];
  classificationId: string | null;
  buyerProfile: Record<string, unknown> | null;
  error?: { message: string };
}

describe('perfil de compra do contato', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;
  let cookie: string;
  let otherCookie: string;
  let investor: string;
  let producer: string;
  let inactive: string;
  let classification: string;

  const url = (path = '', slug = tenant.slug) => `/e/${slug}/contacts${path}`;
  const post = (body: unknown) => app.request(url(), jsonRequest('POST', body, cookie));
  const patch = (id: string, body: unknown) => app.request(url(`/${id}`), jsonRequest('PATCH', body, cookie));
  const read = async (id: string) => (await (await app.request(url(`/${id}`), { headers: { cookie } })).json()) as ContactBody;
  const json = async (response: Response) => (await response.json()) as ContactBody;
  const buyer = async (profile: unknown, extra: Record<string, unknown> = {}) =>
    json(await post({ personType: 'pf', name: 'Comprador', roles: ['buyer'], buyerProfile: profile, ...extra }));

  const rowsOf = (table: typeof buyerProfiles | typeof buyerRegions | typeof buyerCrops, contactId: string) =>
    db.withTenant(tenant.id, (tx) => tx.select().from(table).where(eq(table.contactId, contactId)));

  /** Os `change_id` distintos do save mais recente do contato, por entidade. */
  async function auditedEntitiesOfLastSave(contactId: string): Promise<{ changeIds: Set<string>; entities: Set<string> }> {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('app.tenant_id', $1, true)`, [tenant.id]);
      const { rows } = await client.query<{ change_id: string; entity: string }>(
        `select change_id, entity from audit_log
          where change_id = (select change_id from audit_log where entity_id = $1 order by id desc limit 1)`,
        [contactId],
      );
      return { changeIds: new Set(rows.map((row) => row.change_id)), entities: new Set(rows.map((row) => row.entity)) };
    } finally {
      await client.query('rollback');
      client.release();
    }
  }

  /** Quantas linhas de `audit_log` do perfil do contato existem (sob o RLS da empresa). */
  async function auditRowsOf(contactId: string): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('app.tenant_id', $1, true)`, [tenant.id]);
      const { rows } = await client.query<{ n: number }>(
        `select count(*)::int as n from audit_log where entity = 'buyer_profiles' and entity_id in (select id::text from buyer_profiles where contact_id = $1)`,
        [contactId],
      );
      return rows[0]!.n;
    } finally {
      await client.query('rollback');
      client.release();
    }
  }

  beforeAll(async () => {
    tenant = await createTenant(db, 'contatos-perfil-compra');
    otherTenant = await createTenant(db, 'contatos-perfil-compra-b');
    const manager = await createUserWithPassword(db, 'Gestora');
    const stranger = await createUserWithPassword(db, 'Outra empresa');
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await createMembership(db, stranger.id, otherTenant.id, { isDefault: true });
    for (const [t, user] of [
      [tenant, manager],
      [otherTenant, stranger],
    ] as const) {
      await db.withTenant(t.id, async (tx) => {
        const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: t.id, userId: null }), t.id);
        await tx.insert(userProfiles).values({ tenantId: t.id, userId: user.id, profileId: ids.get('Admin')! });
      });
    }
    await db.withTenant(tenant.id, async (tx) => {
      const rows = await tx
        .insert(purchaseProfiles)
        .values([
          { tenantId: tenant.id, name: 'Investidor' },
          { tenantId: tenant.id, name: 'Produtor' },
          { tenantId: tenant.id, name: 'Desativado', active: false },
        ])
        .returning();
      [investor, producer, inactive] = rows.map((row) => row.id) as [string, string, string];
    });
    cookie = await loginAs(app, manager);
    otherCookie = await loginAs(app, stranger);
    const classifications = await app.request(
      `/e/${tenant.slug}/settings/vocabularies/contact-classifications`,
      jsonRequest('POST', { name: 'A' }, cookie),
    );
    classification = ((await classifications.json()) as { id: string }).id;
  });

  afterAll(() => pool.end());

  const full = () => ({
    purchaseProfileId: investor,
    qualificationLevel: 'hot',
    urgency: 'high',
    avgTicket: '8000000.00',
    maxTicket: '12000000.00',
    minAreaHa: '500',
    maxAreaHa: '1500',
  });

  describe('gravação', () => {
    it('POST de comprador grava as colunas num change_id e o GET devolve o mesmo perfil (a Admin tem a permissão financeira)', async () => {
      const created = await buyer({ ...full(), estimatedNetWorth: '50000000.00', investmentCapacity: '9000000.00' });

      expect(created).toMatchObject({ roles: ['buyer'] });
      expect(created.buyerProfile).toEqual({
        regions: [],
        cropIds: [],
        paymentMethodIds: [],
        purchaseProfileId: investor,
        qualificationLevel: 'hot',
        urgency: 'high',
        avgTicket: '8000000.00',
        maxTicket: '12000000.00',
        minAreaHa: '500.0000',
        maxAreaHa: '1500.0000',
        estimatedNetWorth: '50000000.00',
        investmentCapacity: '9000000.00',
      });
      expect(await read(created.id)).toMatchObject({ buyerProfile: created.buyerProfile });
      const [stored] = await rowsOf(buyerProfiles, created.id);
      expect(stored).toMatchObject({ estimatedNetWorth: '50000000.00', investmentCapacity: '9000000.00' });
      const { changeIds, entities } = await auditedEntitiesOfLastSave(created.id);
      expect(changeIds.size).toBe(1);
      expect(entities).toEqual(new Set(['contacts', 'contact_roles', 'buyer_profiles']));
    });

    it('contato comprador sem perfil devolve buyerProfile nulo', async () => {
      const created = await buyer(undefined);
      expect(created.buyerProfile).toBeNull();
      expect((await read(created.id)).buyerProfile).toBeNull();
    });

    it('PATCH com buyerProfile substitui tudo: campo omitido vira nulo', async () => {
      const created = await buyer(full());

      const updated = await json(await patch(created.id, { buyerProfile: { urgency: 'low', purchaseProfileId: producer } }));

      expect(updated.buyerProfile).toEqual({
        regions: [],
        cropIds: [],
        paymentMethodIds: [],
        purchaseProfileId: producer,
        qualificationLevel: null,
        urgency: 'low',
        avgTicket: null,
        maxTicket: null,
        minAreaHa: null,
        maxAreaHa: null,
        estimatedNetWorth: null,
        investmentCapacity: null,
      });
    });

    it('PATCH sem buyerProfile não toca o perfil; null apaga', async () => {
      const created = await buyer(full());

      const renamed = await json(await patch(created.id, { name: 'Outro nome' }));
      expect(renamed.buyerProfile).toMatchObject({ qualificationLevel: 'hot' });

      const cleared = await json(await patch(created.id, { buyerProfile: null }));
      expect(cleared.buyerProfile).toBeNull();
      expect(await rowsOf(buyerProfiles, created.id)).toEqual([]);
      expect(cleared.roles).toEqual(['buyer']);
    });

    it('perfil todo vazio não gera linha e apaga a existente', async () => {
      const born = await buyer({});
      expect(born.buyerProfile).toBeNull();
      expect(await rowsOf(buyerProfiles, born.id)).toEqual([]);

      const created = await buyer(full());
      const emptied = await json(await patch(created.id, { buyerProfile: { urgency: null } }));
      expect(emptied.buyerProfile).toBeNull();
      expect(await rowsOf(buyerProfiles, created.id)).toEqual([]);
    });

    it('PATCH que não muda o perfil não grava linha de histórico', async () => {
      const created = await buyer(full());
      const before = await auditRowsOf(created.id);

      await patch(created.id, { buyerProfile: full() });

      expect(await auditRowsOf(created.id)).toEqual(before);
    });
  });

  describe('papel comprador', () => {
    it('perfil em contato sem o papel comprador é 400, na criação e na edição', async () => {
      const created = await post({ personType: 'pf', name: 'Dono', roles: ['owner'], buyerProfile: full() });
      expect(created.status).toBe(400);

      const owner = await json(await post({ personType: 'pf', name: 'Dono', roles: ['owner'] }));
      const response = await patch(owner.id, { buyerProfile: full() });
      expect(response.status).toBe(400);
      expect((await json(response)).error?.message).toBe('O perfil de compra só existe para compradores.');
    });

    it('PATCH que dá o papel e o perfil juntos funciona', async () => {
      const owner = await json(await post({ personType: 'pf', name: 'Dono', roles: ['owner'] }));
      const response = await patch(owner.id, { roles: ['owner', 'buyer'], buyerProfile: full() });
      expect(response.status).toBe(200);
      expect((await json(response)).buyerProfile).toMatchObject({ urgency: 'high' });
    });

    it('retirar o papel comprador apaga perfil, junções e classificação no mesmo change_id; o histórico guarda os valores anteriores', async () => {
      const created = await buyer(full(), { classificationId: classification });
      await db.withTenant(tenant.id, async (tx) => {
        const [crop] = await tx
          .insert(crops)
          .values({ tenantId: tenant.id, name: `Cultura ${created.id}` })
          .returning();
        await tx.insert(buyerCrops).values({ tenantId: tenant.id, contactId: created.id, cropId: crop!.id });
        await tx.insert(buyerRegions).values({ tenantId: tenant.id, contactId: created.id, uf: 'GO' });
      });

      const response = await patch(created.id, { roles: ['owner'] });

      expect(response.status).toBe(200);
      const after = await json(response);
      expect(after).toMatchObject({ buyerProfile: null, classificationId: null });
      expect(await rowsOf(buyerProfiles, created.id)).toEqual([]);
      expect(await rowsOf(buyerCrops, created.id)).toEqual([]);
      expect(await rowsOf(buyerRegions, created.id)).toEqual([]);

      const { changeIds, entities } = await auditedEntitiesOfLastSave(created.id);
      expect(changeIds.size).toBe(1);
      expect(entities).toEqual(new Set(['contacts', 'contact_roles', 'buyer_profiles', 'buyer_crops', 'buyer_regions']));

      const history = (await (await app.request(url(`/${created.id}/history`), { headers: { cookie } })).json()) as {
        entries: { children: { title: string; changes: { field: string; from: string | null; to: string | null }[] }[] }[];
      };
      const removed = history.entries[0]!.children.find((child) => child.title === 'Perfil de compra removido');
      expect(removed?.changes).toEqual(
        expect.arrayContaining([
          { field: 'Grau de qualificação', from: 'Quente', to: null },
          { field: 'Ticket máximo', from: 'R$ 12.000.000,00', to: null },
        ]),
      );
    });
  });

  describe('validação', () => {
    it.each([
      [{ avgTicket: '12000000', maxTicket: '8000000' }, 'O ticket médio não pode passar do ticket máximo.'],
      [{ minAreaHa: '1500', maxAreaHa: '500' }, 'A área mínima não pode passar da área máxima.'],
    ])('%j é 400 com a mensagem no campo', async (profile, message) => {
      const response = await post({ personType: 'pf', name: 'X', roles: ['buyer'], buyerProfile: profile });
      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).toContain(message);
    });

    it('com um lado nulo, passa', async () => {
      expect((await buyer({ avgTicket: '5000000' })).buyerProfile).toMatchObject({ avgTicket: '5000000.00', maxTicket: null });
      expect((await buyer({ maxAreaHa: '100' })).buyerProfile).toMatchObject({ minAreaHa: null });
    });

    it.each([
      { avgTicket: '0' },
      { avgTicket: '-1' },
      { minAreaHa: 'abc' },
      { urgency: 'urgente' },
      { qualificationLevel: 'tepido' },
    ])('%j é 400', async (profile) => {
      expect((await post({ personType: 'pf', name: 'X', roles: ['buyer'], buyerProfile: profile })).status).toBe(400);
    });

    it('perfil de compra que não existe na empresa é 400', async () => {
      const response = await post({
        personType: 'pf',
        name: 'X',
        roles: ['buyer'],
        buyerProfile: { purchaseProfileId: crypto.randomUUID() },
      });
      expect(response.status).toBe(400);
    });
  });

  describe('cadastro auxiliar inativo', () => {
    it('perfil de compra inativo entrando é 400', async () => {
      const response = await post({
        personType: 'pf',
        name: 'X',
        roles: ['buyer'],
        buyerProfile: { purchaseProfileId: inactive },
      });
      expect(response.status).toBe(400);
      const created = await buyer({ purchaseProfileId: investor });
      expect((await patch(created.id, { buyerProfile: { purchaseProfileId: inactive } })).status).toBe(400);
    });

    it('o já gravado e desativado depois passa no save sem alteração', async () => {
      const [late] = await db.withTenant(tenant.id, (tx) =>
        tx.insert(purchaseProfiles).values({ tenantId: tenant.id, name: 'Vai desativar' }).returning(),
      );
      const created = await buyer({ purchaseProfileId: late!.id, urgency: 'low' });
      await db.withTenant(tenant.id, (tx) =>
        tx.update(purchaseProfiles).set({ active: false }).where(eq(purchaseProfiles.id, late!.id)),
      );

      const response = await patch(created.id, { buyerProfile: { purchaseProfileId: late!.id, urgency: 'high' } });

      expect(response.status).toBe(200);
      expect((await json(response)).buyerProfile).toMatchObject({ purchaseProfileId: late!.id, urgency: 'high' });
    });
  });

  describe('save simultâneo do primeiro perfil', () => {
    it('a violação do índice único do contato vira 409, nunca 500', async () => {
      const created = await json(await post({ personType: 'pf', name: 'Sem perfil', roles: ['buyer'] }));

      const responses = await Promise.all(
        Array.from({ length: 8 }, () => patch(created.id, { buyerProfile: { urgency: 'high' } })),
      );

      const statuses = responses.map((response) => response.status);
      expect(statuses.every((status) => status === 200 || status === 409)).toBe(true);
      expect(statuses).toContain(200);
      for (const response of responses.filter((item) => item.status === 409)) {
        expect((await json(response)).error?.message).toContain('outra alteração ao mesmo tempo');
      }
      expect(await rowsOf(buyerProfiles, created.id)).toHaveLength(1);
    });
  });

  describe('exclusão', () => {
    it('excluir perfil de compra em uso é 409; excluir o contato leva o perfil', async () => {
      const [used] = await db.withTenant(tenant.id, (tx) =>
        tx.insert(purchaseProfiles).values({ tenantId: tenant.id, name: 'Em uso' }).returning(),
      );
      const created = await buyer({ purchaseProfileId: used!.id });

      const blocked = await app.request(`/e/${tenant.slug}/settings/vocabularies/purchase-profiles/${used!.id}`, {
        method: 'DELETE',
        headers: { cookie },
      });
      expect(blocked.status).toBe(409);
      expect((await json(blocked)).error?.message).toBe(
        'Esta entrada está em uso no perfil de compra de compradores. Desative-a para que não apareça em novos cadastros.',
      );

      const removed = await app.request(url(`/${created.id}`), { method: 'DELETE', headers: { cookie } });
      expect(removed.status).toBe(204);
      expect(await rowsOf(buyerProfiles, created.id)).toEqual([]);
      const freed = await app.request(`/e/${tenant.slug}/settings/vocabularies/purchase-profiles/${used!.id}`, {
        method: 'DELETE',
        headers: { cookie },
      });
      expect(freed.status).toBe(204);
    });
  });

  describe('exclusão de cadastro usado só por uma junção', () => {
    it.each([
      ['crops', 'na cultura de interesse'],
      ['payment-methods', 'na forma de pagamento'],
    ] as const)('%s em uso por junção é 409 com o rótulo', async (vocabulary, phrase) => {
      const created = await buyer({ urgency: 'low' });
      const table = vocabulary === 'crops' ? crops : paymentMethods;
      const [entry] = await db.withTenant(tenant.id, (tx) =>
        tx
          .insert(table)
          .values({ tenantId: tenant.id, name: `Junção ${vocabulary}` })
          .returning(),
      );
      await db.withTenant(tenant.id, (tx) =>
        vocabulary === 'crops'
          ? tx.insert(buyerCrops).values({ tenantId: tenant.id, contactId: created.id, cropId: entry!.id })
          : tx.insert(buyerPaymentMethods).values({ tenantId: tenant.id, contactId: created.id, paymentMethodId: entry!.id }),
      );

      const response = await app.request(`/e/${tenant.slug}/settings/vocabularies/${vocabulary}/${entry!.id}`, {
        method: 'DELETE',
        headers: { cookie },
      });

      expect(response.status).toBe(409);
      expect((await json(response)).error?.message).toContain(phrase);
    });
  });

  describe('outra empresa', () => {
    it('contato de outra empresa é 404 em toda rota', async () => {
      const created = await buyer(full());
      const asOther = (path: string, init: RequestInit = {}) =>
        app.request(url(path, otherTenant.slug), { ...init, headers: { cookie: otherCookie, ...(init.headers as object) } });

      expect((await asOther(`/${created.id}`)).status).toBe(404);
      expect((await asOther(`/${created.id}/history`)).status).toBe(404);
      expect(
        (await app.request(url(`/${created.id}`, otherTenant.slug), jsonRequest('PATCH', { buyerProfile: null }, otherCookie)))
          .status,
      ).toBe(404);
      expect((await asOther(`/${created.id}`, { method: 'DELETE' })).status).toBe(404);
      expect(await rowsOf(buyerProfiles, created.id)).toHaveLength(1);
    });

    it('não grava perfil de compra de outra empresa', async () => {
      const response = await app.request(
        url('', otherTenant.slug),
        jsonRequest(
          'POST',
          { personType: 'pf', name: 'X', roles: ['buyer'], buyerProfile: { purchaseProfileId: investor } },
          otherCookie,
        ),
      );
      expect(response.status).toBe(400);
    });
  });
});
