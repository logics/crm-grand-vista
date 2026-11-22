// Regiões, culturas e formas de pagamento do perfil de compra (`regions`, `cropIds`,
// `paymentMethodIds` dentro de `buyerProfile`), contra o Postgres real: gravação num
// `change_id`, substituição pela diferença, validação, histórico e restrições do banco.
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
import { asSuperuser } from '../../support/superuser.js';

const env = loadApiEnv();

interface ContactBody {
  id: string;
  roles: string[];
  buyerProfile: {
    regions: Array<{ ibgeCode: string } | { uf: string }>;
    cropIds: string[];
    paymentMethodIds: string[];
    urgency: string | null;
  } | null;
  error?: { message: string };
}

interface HistoryBody {
  entries: { children: { title: string; changes: { field: string; from: string | null; to: string | null }[] }[] }[];
}

const RIO_VERDE = '5218805';
const JATAI = '5211909';
// Município só deste arquivo: a tabela é global, e desativar um compartilhado quebraria os outros testes em paralelo.
const TOGGLED = '2211209';
const setMunicipalityActive = (active: boolean) =>
  asSuperuser((client) => client.query('update municipalities set active = $1 where ibge_code = $2', [active, TOGGLED]));

describe('junções do perfil de compra', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let cookie: string;
  let soy: string;
  let corn: string;
  let cash: string;
  let barter: string;
  let inactiveCrop: string;
  let inactivePayment: string;

  const url = (path = '') => `/e/${tenant.slug}/contacts${path}`;
  const post = (body: unknown) => app.request(url(), jsonRequest('POST', body, cookie));
  const patch = (id: string, body: unknown) => app.request(url(`/${id}`), jsonRequest('PATCH', body, cookie));
  const json = async (response: Response) => (await response.json()) as ContactBody;
  const read = async (id: string) => json(await app.request(url(`/${id}`), { headers: { cookie } }));
  const history = async (id: string) =>
    (await (await app.request(url(`/${id}/history`), { headers: { cookie } })).json()) as HistoryBody;
  const buyer = async (profile: unknown) =>
    json(await post({ personType: 'pf', name: 'Comprador', roles: ['buyer'], buyerProfile: profile }));
  const titles = (body: HistoryBody, entry = 0) => body.entries[entry]!.children.map((child) => child.title).sort();

  const rows = (
    table: typeof buyerProfiles | typeof buyerRegions | typeof buyerCrops | typeof buyerPaymentMethods,
    contactId: string,
  ) =>
    db.withTenant(tenant.id, (tx) =>
      tx
        .select({ id: table.id })
        .from(table as typeof buyerRegions)
        .where(eq(table.contactId, contactId)),
    );
  const cropRows = (contactId: string) =>
    db.withTenant(tenant.id, (tx) => tx.select().from(buyerCrops).where(eq(buyerCrops.contactId, contactId)));

  /** Quantos `change_id` distintos o save mais recente do contato tem. */
  async function changeIdsOfLastSave(contactId: string): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('app.tenant_id', $1, true)`, [tenant.id]);
      const { rows: found } = await client.query<{ n: number }>(
        `select count(distinct change_id)::int as n from audit_log
          where change_id = (select change_id from audit_log where entity_id = $1 order by id desc limit 1)`,
        [contactId],
      );
      return found[0]!.n;
    } finally {
      await client.query('rollback');
      client.release();
    }
  }

  beforeAll(async () => {
    tenant = await createTenant(db, 'contatos-perfil-juncoes');
    const manager = await createUserWithPassword(db, 'Gestora');
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values({ tenantId: tenant.id, userId: manager.id, profileId: ids.get('Admin')! });
      const cropRows = await tx
        .insert(crops)
        .values([
          { tenantId: tenant.id, name: 'Soja' },
          { tenantId: tenant.id, name: 'Milho' },
          { tenantId: tenant.id, name: 'Cultura desativada', active: false },
        ])
        .returning();
      [soy, corn, inactiveCrop] = cropRows.map((row) => row.id) as [string, string, string];
      const paymentRows = await tx
        .insert(paymentMethods)
        .values([
          { tenantId: tenant.id, name: 'À vista' },
          { tenantId: tenant.id, name: 'Permuta' },
          { tenantId: tenant.id, name: 'Forma desativada', active: false },
        ])
        .returning();
      [cash, barter, inactivePayment] = paymentRows.map((row) => row.id) as [string, string, string];
    });
    cookie = await loginAs(app, manager);
  });

  afterAll(() => pool.end());

  const goAndRioVerde = () => ({
    urgency: 'high',
    regions: [{ uf: 'GO' }, { ibgeCode: RIO_VERDE }],
    cropIds: [soy, corn],
    paymentMethodIds: [cash],
  });

  describe('gravação', () => {
    it('POST grava colunas e as três junções num change_id; GET devolve igual', async () => {
      const created = await buyer(goAndRioVerde());

      // O admin tem `contatos.ver_dados_financeiros`: as chaves financeiras saem (nulas).
      expect(created.buyerProfile).toEqual({
        estimatedNetWorth: null,
        investmentCapacity: null,
        purchaseProfileId: null,
        avgTicket: null,
        maxTicket: null,
        minAreaHa: null,
        maxAreaHa: null,
        urgency: 'high',
        qualificationLevel: null,
        regions: [{ uf: 'GO' }, { ibgeCode: RIO_VERDE }],
        cropIds: [soy, corn].sort(),
        paymentMethodIds: [cash],
      });
      expect((await read(created.id)).buyerProfile).toEqual(created.buyerProfile);
      expect(await rows(buyerRegions, created.id)).toHaveLength(2);
      expect(await changeIdsOfLastSave(created.id)).toBe(1);
    });

    it('região repetida é deduplicada; redundante (GO e Rio Verde) é aceita', async () => {
      const created = await buyer({ regions: [{ uf: 'GO' }, { ibgeCode: RIO_VERDE }, { uf: 'GO' }, { ibgeCode: RIO_VERDE }] });
      expect(created.buyerProfile?.regions).toEqual([{ uf: 'GO' }, { ibgeCode: RIO_VERDE }]);
      expect(await rows(buyerRegions, created.id)).toHaveLength(2);
    });

    it('perfil só com junções não gera linha em buyer_profiles e as mantém', async () => {
      const created = await buyer({ cropIds: [soy], regions: [{ uf: 'MT' }] });

      expect(await rows(buyerProfiles, created.id)).toEqual([]);
      expect(created.buyerProfile).toMatchObject({
        urgency: null,
        cropIds: [soy],
        regions: [{ uf: 'MT' }],
        paymentMethodIds: [],
      });
      expect((await read(created.id)).buyerProfile).toEqual(created.buyerProfile);

      const emptied = await json(await patch(created.id, { buyerProfile: { urgency: 'low' } }));
      expect(emptied.buyerProfile).toMatchObject({ urgency: 'low', cropIds: [], regions: [] });
      const back = await json(await patch(created.id, { buyerProfile: { cropIds: [corn] } }));
      expect(back.buyerProfile).toMatchObject({ urgency: null, cropIds: [corn] });
      expect(await rows(buyerProfiles, created.id)).toEqual([]);
    });
  });

  describe('substituição pela diferença', () => {
    it('PATCH substitui as listas: item fora sai, lista omitida esvazia; o histórico mostra só o que mudou', async () => {
      const created = await buyer(goAndRioVerde());
      const soyRow = (await cropRows(created.id)).find((row) => row.cropId === soy)!;

      const response = await patch(created.id, {
        buyerProfile: {
          urgency: 'high',
          regions: [{ ibgeCode: RIO_VERDE }, { ibgeCode: JATAI }],
          cropIds: [soy],
          paymentMethodIds: [cash, barter],
        },
      });

      expect(response.status).toBe(200);
      expect((await json(response)).buyerProfile).toMatchObject({
        regions: [{ ibgeCode: JATAI }, { ibgeCode: RIO_VERDE }],
        cropIds: [soy],
        paymentMethodIds: [cash, barter].sort(),
      });
      // a linha que ficou não foi apagada e recriada
      const after = await cropRows(created.id);
      expect(after.map((row) => row.id)).toEqual([soyRow.id]);
      expect(await changeIdsOfLastSave(created.id)).toBe(1);

      expect(titles(await history(created.id))).toEqual([
        'Cultura de interesse removida: Milho',
        'Forma de pagamento adicionada: Permuta',
        'Região de interesse adicionada: Jataí — GO',
        'Região de interesse removida: Goiás (UF)',
      ]);

      const omitted = await json(await patch(created.id, { buyerProfile: { urgency: 'high' } }));
      expect(omitted.buyerProfile).toMatchObject({ regions: [], cropIds: [], paymentMethodIds: [] });
      expect(await rows(buyerRegions, created.id)).toEqual([]);
    });

    it('PATCH sem buyerProfile não toca as junções; null apaga tudo', async () => {
      const created = await buyer(goAndRioVerde());

      const renamed = await json(await patch(created.id, { name: 'Outro nome' }));
      expect(renamed.buyerProfile).toMatchObject({
        cropIds: [soy, corn].sort(),
        regions: [{ uf: 'GO' }, { ibgeCode: RIO_VERDE }],
      });

      const cleared = await json(await patch(created.id, { buyerProfile: null }));
      expect(cleared.buyerProfile).toBeNull();
      expect(await rows(buyerRegions, created.id)).toEqual([]);
      expect(await rows(buyerCrops, created.id)).toEqual([]);
      expect(await rows(buyerPaymentMethods, created.id)).toEqual([]);
    });

    it('reenviar o mesmo perfil não escreve nada novo nas junções', async () => {
      const created = await buyer(goAndRioVerde());
      const entriesBefore = (await history(created.id)).entries.length;
      expect((await patch(created.id, { buyerProfile: goAndRioVerde() })).status).toBe(200);
      expect((await history(created.id)).entries).toHaveLength(entriesBefore);
    });

    it('retirar o papel comprador apaga as três junções no mesmo change_id', async () => {
      const created = await buyer(goAndRioVerde());
      const response = await patch(created.id, { roles: ['owner'] });
      expect(response.status).toBe(200);
      expect(await rows(buyerRegions, created.id)).toEqual([]);
      expect(await rows(buyerCrops, created.id)).toEqual([]);
      expect(await rows(buyerPaymentMethods, created.id)).toEqual([]);
      expect(await changeIdsOfLastSave(created.id)).toBe(1);
      expect(titles(await history(created.id))).toEqual(
        expect.arrayContaining([
          'Cultura de interesse removida: Milho',
          'Cultura de interesse removida: Soja',
          'Forma de pagamento removida: À vista',
          'Região de interesse removida: Goiás (UF)',
          'Região de interesse removida: Rio Verde — GO',
        ]),
      );
    });
  });

  describe('histórico do cadastro', () => {
    it('cada junção é um filho declarado, com o nome pelo cadastro', async () => {
      const created = await buyer(goAndRioVerde());
      expect(titles(await history(created.id))).toEqual(
        [
          'Papel adicionado: Comprador',
          'Perfil de compra adicionado',
          'Região de interesse adicionada: Goiás (UF)',
          'Região de interesse adicionada: Rio Verde — GO',
          'Cultura de interesse adicionada: Soja',
          'Cultura de interesse adicionada: Milho',
          'Forma de pagamento adicionada: À vista',
        ].sort(),
      );
    });
  });

  describe('validação', () => {
    const invalid = (regions: unknown) => post({ personType: 'pf', name: 'X', roles: ['buyer'], buyerProfile: { regions } });

    it.each([
      ['município e UF juntos', [{ ibgeCode: RIO_VERDE, uf: 'GO' }]],
      ['nenhum dos dois', [{}]],
      ['código malformado', [{ ibgeCode: '123' }]],
      ['UF inexistente', [{ uf: 'XX' }]],
    ])('região com %s é 400', async (_name, regions) => {
      expect((await invalid(regions)).status).toBe(400);
    });

    it('município que não existe é 400', async () => {
      expect((await invalid([{ ibgeCode: '0000000' }])).status).toBe(400);
    });

    it('cultura ou forma de pagamento inexistente é 400', async () => {
      const crop = await post({
        personType: 'pf',
        name: 'X',
        roles: ['buyer'],
        buyerProfile: { cropIds: [crypto.randomUUID()] },
      });
      const payment = await post({
        personType: 'pf',
        name: 'X',
        roles: ['buyer'],
        buyerProfile: { paymentMethodIds: [crypto.randomUUID()] },
      });
      expect(crop.status).toBe(400);
      expect(payment.status).toBe(400);
    });
  });

  describe('cadastros inativos', () => {
    it('cultura, forma de pagamento e município inativos entrando são 400', async () => {
      const created = await buyer({ urgency: 'low' });
      await setMunicipalityActive(false);
      try {
        expect((await patch(created.id, { buyerProfile: { cropIds: [inactiveCrop] } })).status).toBe(400);
        expect((await patch(created.id, { buyerProfile: { paymentMethodIds: [inactivePayment] } })).status).toBe(400);
        expect((await patch(created.id, { buyerProfile: { regions: [{ ibgeCode: TOGGLED }] } })).status).toBe(400);
        expect((await read(created.id)).buyerProfile).toMatchObject({ cropIds: [], paymentMethodIds: [], regions: [] });
      } finally {
        await setMunicipalityActive(true);
      }
    });

    it('o já gravado que ficou inativo continua e passa no save', async () => {
      const [lateCrop, latePayment] = await db.withTenant(tenant.id, async (tx) => [
        (await tx.insert(crops).values({ tenantId: tenant.id, name: 'Vai desativar' }).returning())[0]!,
        (await tx.insert(paymentMethods).values({ tenantId: tenant.id, name: 'Vai desativar' }).returning())[0]!,
      ]);
      const created = await buyer({
        cropIds: [lateCrop.id],
        paymentMethodIds: [latePayment.id],
        regions: [{ ibgeCode: TOGGLED }],
      });
      await db.withTenant(tenant.id, async (tx) => {
        await tx.update(crops).set({ active: false }).where(eq(crops.id, lateCrop.id));
        await tx.update(paymentMethods).set({ active: false }).where(eq(paymentMethods.id, latePayment.id));
      });
      await setMunicipalityActive(false);
      try {
        const response = await patch(created.id, {
          buyerProfile: {
            urgency: 'low',
            cropIds: [lateCrop.id, soy],
            paymentMethodIds: [latePayment.id],
            regions: [{ ibgeCode: TOGGLED }],
          },
        });
        expect(response.status).toBe(200);
        expect((await json(response)).buyerProfile).toMatchObject({
          cropIds: [lateCrop.id, soy].sort(),
          paymentMethodIds: [latePayment.id],
          regions: [{ ibgeCode: TOGGLED }],
        });
      } finally {
        await setMunicipalityActive(true);
      }
    });
  });

  describe('restrições do banco em insert direto', () => {
    const insertRegion = (contactId: string, values: { municipalityIbgeCode?: string | null; uf?: string | null }) =>
      db.withTenant(tenant.id, (tx) => tx.insert(buyerRegions).values({ tenantId: tenant.id, contactId, ...values }));
    const failure = async (promise: Promise<unknown>) => {
      try {
        await promise;
      } catch (error) {
        const cause =
          (error as { cause?: { code?: string; constraint?: string } }).cause ??
          (error as { code?: string; constraint?: string });
        return { code: cause.code, constraint: cause.constraint };
      }
      return null;
    };

    it('a UF GO e o município Rio Verde — GO convivem; UF ou município repetidos são recusados pelo índice', async () => {
      const created = await buyer({ regions: [{ uf: 'GO' }, { ibgeCode: RIO_VERDE }] });
      expect(await rows(buyerRegions, created.id)).toHaveLength(2);

      expect(await failure(insertRegion(created.id, { uf: 'GO' }))).toEqual({
        code: '23505',
        constraint: 'buyer_regions_contact_id_uf_unique',
      });
      expect(await failure(insertRegion(created.id, { municipalityIbgeCode: RIO_VERDE }))).toEqual({
        code: '23505',
        constraint: 'buyer_regions_contact_id_municipality_unique',
      });
    });

    it('município e UF juntos, ou nenhum dos dois, são recusados pelo CHECK', async () => {
      const created = await buyer({ urgency: 'low' });
      const both = await failure(insertRegion(created.id, { municipalityIbgeCode: RIO_VERDE, uf: 'GO' }));
      const none = await failure(insertRegion(created.id, {}));
      expect(both).toEqual({ code: '23514', constraint: 'buyer_regions_municipality_or_uf_check' });
      expect(none).toEqual({ code: '23514', constraint: 'buyer_regions_municipality_or_uf_check' });
    });
  });

  describe('exclusão', () => {
    it('cultura e forma de pagamento em uso por um perfil é 409 com o rótulo', async () => {
      const [usedCrop, usedPayment] = await db.withTenant(tenant.id, async (tx) => [
        (await tx.insert(crops).values({ tenantId: tenant.id, name: 'Em uso' }).returning())[0]!,
        (await tx.insert(paymentMethods).values({ tenantId: tenant.id, name: 'Em uso' }).returning())[0]!,
      ]);
      const created = await buyer({ cropIds: [usedCrop.id], paymentMethodIds: [usedPayment.id] });
      const del = (vocabulary: string, id: string) =>
        app.request(`/e/${tenant.slug}/settings/vocabularies/${vocabulary}/${id}`, { method: 'DELETE', headers: { cookie } });

      const cropResponse = await del('crops', usedCrop.id);
      const paymentResponse = await del('payment-methods', usedPayment.id);
      expect(cropResponse.status).toBe(409);
      expect((await json(cropResponse)).error?.message).toContain('na cultura de interesse de compradores');
      expect(paymentResponse.status).toBe(409);
      expect((await json(paymentResponse)).error?.message).toContain('na forma de pagamento de compradores');

      const removed = await app.request(url(`/${created.id}`), { method: 'DELETE', headers: { cookie } });
      expect(removed.status).toBe(204);
      expect(await rows(buyerCrops, created.id)).toEqual([]);
      expect((await del('crops', usedCrop.id)).status).toBe(204);
    });
  });
});
