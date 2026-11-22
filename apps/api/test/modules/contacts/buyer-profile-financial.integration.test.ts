// Dados financeiros do comprador (patrimônio estimado e capacidade de
// investimento) sob `contatos.ver_dados_financeiros`, contra o Postgres real:
// Gestor lê e grava; Corretor não os vê, não os envia (403 antes de gravar), os
// preserva ao salvar o perfil e os apaga junto com o papel; o histórico os mascara.
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
import { HISTORY_RESTRICTED_MESSAGE } from '@crm/shared';
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
  buyerProfile: Record<string, unknown> | null;
  error?: { code: string; message: string };
}
interface HistoryBody {
  entries: { title: string; changes: unknown[]; children: { title: string; changes: Record<string, unknown>[] }[] }[];
}

describe('dados financeiros do comprador', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let manager: string;
  let broker: string;
  let soy: string;
  let cash: string;

  const url = (path = '') => `/e/${tenant.slug}/contacts${path}`;
  const as = (cookie: string) => ({
    post: (body: unknown) => app.request(url(), jsonRequest('POST', body, cookie)),
    patch: (id: string, body: unknown) => app.request(url(`/${id}`), jsonRequest('PATCH', body, cookie)),
    get: (id: string) => app.request(url(`/${id}`), { headers: { cookie } }),
    list: () => app.request(url('?pageSize=100'), { headers: { cookie } }),
    history: async (id: string) =>
      (await (await app.request(url(`/${id}/history`), { headers: { cookie } })).json()) as HistoryBody,
  });
  const json = async (response: Response) => (await response.json()) as ContactBody;
  const storedOf = async (contactId: string) =>
    (await db.withTenant(tenant.id, (tx) => tx.select().from(buyerProfiles).where(eq(buyerProfiles.contactId, contactId))))[0];

  const FINANCIAL = { estimatedNetWorth: '50000000.00', investmentCapacity: '9000000.00' };

  /** Comprador com perfil criado pelo Gestor. */
  const seedBuyer = async (profile: Record<string, unknown> = { urgency: 'high', ...FINANCIAL }) =>
    json(await as(manager).post({ personType: 'pf', name: 'Comprador', roles: ['buyer'], buyerProfile: profile }));

  beforeAll(async () => {
    tenant = await createTenant(db, 'contatos-dados-financeiros');
    const managerUser = await createUserWithPassword(db, 'Gestora');
    const brokerUser = await createUserWithPassword(db, 'Corretora');
    for (const user of [managerUser, brokerUser]) await createMembership(db, user.id, tenant.id, { isDefault: true });
    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: managerUser.id, profileId: ids.get('Gestor')! },
        { tenantId: tenant.id, userId: brokerUser.id, profileId: ids.get('Corretor')! },
      ]);
      const [crop] = await tx.insert(crops).values({ tenantId: tenant.id, name: 'Soja' }).returning();
      soy = crop!.id;
      const [payment] = await tx.insert(paymentMethods).values({ tenantId: tenant.id, name: 'À vista' }).returning();
      cash = payment!.id;
    });
    manager = await loginAs(app, managerUser);
    broker = await loginAs(app, brokerUser);
  });

  afterAll(() => pool.end());

  describe('leitura', () => {
    it('Gestor lê as duas chaves; Corretor recebe o contato sem elas (nem null) no GET, na lista e no PATCH', async () => {
      const created = await seedBuyer();
      expect(created.buyerProfile).toMatchObject(FINANCIAL);

      expect((await json(await as(manager).get(created.id))).buyerProfile).toMatchObject(FINANCIAL);

      const viewed = await json(await as(broker).get(created.id));
      expect(viewed.buyerProfile).toMatchObject({ urgency: 'high' });
      expect(viewed.buyerProfile).not.toHaveProperty('estimatedNetWorth');
      expect(viewed.buyerProfile).not.toHaveProperty('investmentCapacity');

      const listed = (await (await as(broker).list()).json()) as { items: ContactBody[] };
      const inList = listed.items.find((item) => item.id === created.id);
      expect(inList?.buyerProfile).toMatchObject({ urgency: 'high' });
      expect(JSON.stringify(listed)).not.toMatch(/estimatedNetWorth|investmentCapacity|50000000/);

      const patched = await json(await as(broker).patch(created.id, { buyerProfile: { urgency: 'low' } }));
      expect(patched.buyerProfile).toEqual(
        expect.not.objectContaining({ estimatedNetWorth: expect.anything(), investmentCapacity: expect.anything() }),
      );
      expect(JSON.stringify(patched)).not.toMatch(/estimatedNetWorth|investmentCapacity/);
    });

    it('o POST do Corretor, sem as chaves, também as omite na resposta', async () => {
      const created = await json(
        await as(broker).post({ personType: 'pf', name: 'Do corretor', roles: ['buyer'], buyerProfile: { urgency: 'low' } }),
      );
      expect(JSON.stringify(created)).not.toMatch(/estimatedNetWorth|investmentCapacity/);
    });
  });

  describe('escrita sem a permissão', () => {
    it.each([
      ['valor em patrimônio', { estimatedNetWorth: '1.00' }],
      ['valor em capacidade', { investmentCapacity: '1.00' }],
      ['null em patrimônio', { estimatedNetWorth: null }],
      ['null em capacidade', { investmentCapacity: null }],
    ])('PATCH com %s é 403 e nada é gravado', async (_name, financial) => {
      const created = await seedBuyer();

      const response = await as(broker).patch(created.id, {
        name: 'Não pode mudar',
        buyerProfile: { urgency: 'low', ...financial },
      });

      expect(response.status).toBe(403);
      expect((await json(response)).error?.code).toBe('forbidden');
      const after = await json(await as(manager).get(created.id));
      expect(after).toMatchObject({ name: 'Comprador', buyerProfile: { urgency: 'high', ...FINANCIAL } });
    });

    it('POST com as chaves é 403 e o contato não nasce', async () => {
      const response = await as(broker).post({
        personType: 'pf',
        name: 'Fantasma 403',
        roles: ['buyer'],
        buyerProfile: { estimatedNetWorth: null },
      });
      expect(response.status).toBe(403);
      const listed = (await (await as(manager).list()).json()) as { items: { name: string }[] };
      expect(listed.items.map((item) => item.name)).not.toContain('Fantasma 403');
    });

    it('salvar o perfil sem as chaves preserva os valores gravados', async () => {
      const created = await seedBuyer();

      const saved = await as(broker).patch(created.id, { buyerProfile: { urgency: 'low', qualificationLevel: 'cold' } });

      expect(saved.status).toBe(200);
      expect(await storedOf(created.id)).toMatchObject({ urgency: 'low', qualificationLevel: 'cold', ...FINANCIAL });
      expect((await json(await as(manager).get(created.id))).buyerProfile).toMatchObject(FINANCIAL);
    });

    it('perfil só com os dados financeiros não é apagado quando o Corretor esvazia o resto', async () => {
      const created = await seedBuyer({ ...FINANCIAL });

      const saved = await json(await as(broker).patch(created.id, { buyerProfile: { urgency: null } }));

      // a linha segue existindo (só com o financeiro): as colunas visíveis vêm nulas e as financeiras não vêm
      expect(saved.buyerProfile).toMatchObject({ urgency: null, avgTicket: null });
      expect(saved.buyerProfile).not.toHaveProperty('estimatedNetWorth');
      expect(await storedOf(created.id)).toMatchObject(FINANCIAL);
      expect((await json(await as(manager).get(created.id))).buyerProfile).toMatchObject(FINANCIAL);
    });

    it('Corretor que cria perfil sem as chaves em comprador sem linha cria a linha sem dado financeiro', async () => {
      const created = await json(
        await as(broker).post({ personType: 'pf', name: 'Sem financeiro', roles: ['buyer'], buyerProfile: { urgency: 'low' } }),
      );
      expect(await storedOf(created.id)).toMatchObject({ estimatedNetWorth: null, investmentCapacity: null });
    });
  });

  describe('escrita com a permissão', () => {
    it('é substituição completa: ausente vira nulo, null apaga, valor troca', async () => {
      const created = await seedBuyer();

      const replaced = await json(
        await as(manager).patch(created.id, { buyerProfile: { urgency: 'low', estimatedNetWorth: '7.00' } }),
      );
      expect(replaced.buyerProfile).toMatchObject({ urgency: 'low', estimatedNetWorth: '7.00', investmentCapacity: null });

      const nulled = await json(
        await as(manager).patch(created.id, { buyerProfile: { urgency: 'low', estimatedNetWorth: null } }),
      );
      expect(nulled.buyerProfile).toMatchObject({ estimatedNetWorth: null, investmentCapacity: null });
    });

    it('perfil só com os dados financeiros é perfil: não some', async () => {
      const created = await seedBuyer({ ...FINANCIAL });
      expect(await storedOf(created.id)).toMatchObject(FINANCIAL);
    });

    it('esvaziar tudo, financeiro incluído, apaga a linha', async () => {
      const created = await seedBuyer();
      await as(manager).patch(created.id, { buyerProfile: {} });
      expect(await storedOf(created.id)).toBeUndefined();
    });
  });

  describe('papel comprador', () => {
    it('Corretor que retira o papel apaga o perfil inteiro, financeiro incluído', async () => {
      const created = await seedBuyer();

      const response = await as(broker).patch(created.id, { roles: ['owner'] });

      expect(response.status).toBe(200);
      expect((await json(response)).buyerProfile).toBeNull();
      expect(await storedOf(created.id)).toBeUndefined();
    });
  });

  describe('histórico', () => {
    const financialChange = (entry: HistoryBody['entries'][number]) =>
      entry.children.flatMap((child) => child.changes).filter((change) => change['field'] === 'Patrimônio estimado');

    it('Corretor vê a alteração do patrimônio mascarada, sem valores; Gestor vê os valores', async () => {
      const created = await seedBuyer({ urgency: 'high', estimatedNetWorth: '50000000.00' });
      await as(manager).patch(created.id, { buyerProfile: { urgency: 'high', estimatedNetWorth: '60000000.00' } });

      const forBroker = await as(broker).history(created.id);
      const [latest] = forBroker.entries;
      expect(latest?.children[0]?.title).toBe('Perfil de compra alterado');
      expect(financialChange(latest!)).toEqual([
        { field: 'Patrimônio estimado', from: null, to: null, restricted: HISTORY_RESTRICTED_MESSAGE },
      ]);
      expect(JSON.stringify(forBroker)).not.toMatch(/50\.000\.000|60\.000\.000|50000000|60000000/);

      const forManager = await as(manager).history(created.id);
      expect(financialChange(forManager.entries[0]!)).toEqual([
        { field: 'Patrimônio estimado', from: 'R$ 50.000.000,00', to: 'R$ 60.000.000,00' },
      ]);
    });

    it('depois de apagar o perfil, o valor anterior continua mascarado para o Corretor e visível ao Gestor', async () => {
      const created = await seedBuyer({ urgency: 'high', estimatedNetWorth: '70000000.00' });
      await as(broker).patch(created.id, { roles: ['owner'] });

      const forBroker = await as(broker).history(created.id);
      const removed = forBroker.entries[0]!;
      expect(removed.children.map((child) => child.title)).toContain('Perfil de compra removido');
      expect(financialChange(removed)).toEqual([
        { field: 'Patrimônio estimado', from: null, to: null, restricted: HISTORY_RESTRICTED_MESSAGE },
      ]);
      expect(JSON.stringify(forBroker)).not.toMatch(/70\.000\.000|70000000/);

      const forManager = await as(manager).history(created.id);
      expect(financialChange(forManager.entries[0]!)).toEqual([
        { field: 'Patrimônio estimado', from: 'R$ 70.000.000,00', to: null },
      ]);
    });
  });

  describe('junções cruzadas com dados financeiros', () => {
    const joined = () => ({ regions: [{ uf: 'GO' }], cropIds: [soy], paymentMethodIds: [cash] });
    const countRows = (table: typeof buyerRegions | typeof buyerCrops | typeof buyerPaymentMethods, contactId: string) =>
      db.withTenant(
        tenant.id,
        async (tx) =>
          (
            await tx
              .select({ id: table.id })
              .from(table as typeof buyerRegions)
              .where(eq(table.contactId, contactId))
          ).length,
      );

    /** Quantos `change_id` distintos o save mais recente do contato tem. */
    async function changeIdsOfLastSave(contactId: string): Promise<number> {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(`select set_config('app.tenant_id', $1, true)`, [tenant.id]);
        const { rows } = await client.query<{ n: number }>(
          `select count(distinct change_id)::int as n from audit_log
            where change_id = (select change_id from audit_log where entity_id = $1 order by id desc limit 1)`,
          [contactId],
        );
        return rows[0]!.n;
      } finally {
        await client.query('rollback');
        client.release();
      }
    }

    it('Corretor salva só as junções sobre linha que só tem financeiro: a linha fica e o financeiro é preservado', async () => {
      const created = await seedBuyer({ ...FINANCIAL });

      const saved = await as(broker).patch(created.id, { buyerProfile: joined() });

      expect(saved.status).toBe(200);
      expect(await storedOf(created.id)).toMatchObject(FINANCIAL);
      expect(await countRows(buyerRegions, created.id)).toBe(1);
      expect(await countRows(buyerCrops, created.id)).toBe(1);
      expect(await countRows(buyerPaymentMethods, created.id)).toBe(1);
      expect((await json(await as(manager).get(created.id))).buyerProfile).toMatchObject({
        ...FINANCIAL,
        cropIds: [soy],
        paymentMethodIds: [cash],
      });
    });

    it('Corretor retira o papel de perfil com junções e financeiro: 4 tabelas apagadas num change_id; histórico mascara o financeiro', async () => {
      const created = await seedBuyer({ urgency: 'high', ...FINANCIAL, ...joined() });
      expect(await countRows(buyerCrops, created.id)).toBe(1);

      const response = await as(broker).patch(created.id, { roles: ['owner'] });

      expect(response.status).toBe(200);
      expect(await storedOf(created.id)).toBeUndefined();
      expect(await countRows(buyerRegions, created.id)).toBe(0);
      expect(await countRows(buyerCrops, created.id)).toBe(0);
      expect(await countRows(buyerPaymentMethods, created.id)).toBe(0);
      expect(await changeIdsOfLastSave(created.id)).toBe(1);

      const forBroker = await as(broker).history(created.id);
      const changes = forBroker.entries[0]!.children.flatMap((child) => child.changes);
      expect(changes).toContainEqual({
        field: 'Patrimônio estimado',
        from: null,
        to: null,
        restricted: HISTORY_RESTRICTED_MESSAGE,
      });
      expect(JSON.stringify(forBroker)).not.toMatch(/50\.000\.000|9\.000\.000|50000000|9000000/);

      const forManager = await as(manager).history(created.id);
      expect(JSON.stringify(forManager)).toMatch(/R\$ 50\.000\.000,00/);
      expect(JSON.stringify(forManager)).toMatch(/R\$ 9\.000\.000,00/);
    });

    it('Corretor cria perfil só com junções: resposta sem as chaves financeiras', async () => {
      const created = await json(
        await as(broker).post({ personType: 'pf', name: 'Só junções', roles: ['buyer'], buyerProfile: joined() }),
      );

      expect(created.buyerProfile).toMatchObject({ cropIds: [soy], paymentMethodIds: [cash] });
      expect(JSON.stringify(created)).not.toMatch(/estimatedNetWorth|investmentCapacity/);
      expect(await countRows(buyerCrops, created.id)).toBe(1);
    });
  });
});
