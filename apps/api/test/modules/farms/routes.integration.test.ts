// Fazendas por HTTP, contra o Postgres real: cadastro mínimo, validação de áreas
// e de referências, e a prova de integração do escopo de dados `own` (404 por id
// direto, lista e total sem as alheias), mais o isolamento entre empresas.
import {
  aptitudes,
  auditedWrites,
  commercialStatuses,
  contacts,
  createDatabase,
  createPool,
  crops,
  farmAptitudes,
  farmCrops,
  farmOwners,
  farms,
  tradingPosts,
  userProfiles,
} from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createLinkedAccessProfile, createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

const RIO_VERDE = '5218805';
const GOIANIA = '5208707';

interface FarmBody {
  id: string;
  name: string;
  municipality: { ibgeCode: string; name: string; uf: string };
  responsible: { id: string; name: string };
  tradingPost: { id: string; name: string } | null;
  commercialStatus: { id: string; name: string; systemMeaning: string };
  totalAreaHa: string;
  usableAreaHa: string | null;
  pricingMode: 'brl' | 'bags' | null;
  askingPrice: string | null;
  valuationBags: string | null;
  valuationBagsUnit: 'per_hectare' | 'per_alqueire' | null;
  valuationBagsAlqueireType: 'goiano' | 'paulista' | 'norte' | null;
  valuationCrop: { id: string; name: string } | null;
  priceDerivatives: { pricePerHectare: string | null; pricePerUsableHectare: string | null; bagsPerHectare: string | null };
}

interface ListBody {
  items: FarmBody[];
  total: number;
}

interface HistoryBody {
  entries: { title: string; changes: { field: string; from: string | null; to: string | null }[] }[];
}

describe('fazendas', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let users: Record<'manager' | 'broker' | 'otherBroker' | 'dual' | 'excluder' | 'readOnly' | 'outsider' | 'unlinked', { id: string; name: string; email: string; password: string }>;
  let cookies: Record<keyof typeof users, string>;
  let available: string;
  let sold: string;
  let inactiveStatus: string;
  let deactivated: string;
  let post: string;
  let inactivePost: string;
  let foreignPost: string;
  let foreignStatus: string;
  let soy: string;
  let oldCorn: string;
  let foreignCrop: string;

  const url = (path = '', slug = tenant.slug) => `/e/${slug}/farms${path}`;
  const validBody = (overrides: Record<string, unknown> = {}) => ({
    name: 'Fazenda Boa Vista',
    municipalityIbgeCode: RIO_VERDE,
    totalAreaHa: '1000',
    ...overrides,
  });
  const create = (body: unknown, cookie = cookies.manager, slug = tenant.slug) =>
    app.request(url('', slug), jsonRequest('POST', body, cookie));
  const patch = (id: string, body: unknown, cookie = cookies.manager, slug = tenant.slug) =>
    app.request(url(`/${id}`, slug), jsonRequest('PATCH', body, cookie));
  const remove = (id: string, cookie = cookies.manager, slug = tenant.slug) =>
    app.request(url(`/${id}`, slug), { method: 'DELETE', headers: { cookie } });
  const deactivate = (id: string) => patch(id, { commercialStatusId: deactivated });
  const read = (path = '', cookie = cookies.manager, slug = tenant.slug) => app.request(url(path, slug), { headers: { cookie } });
  const created = async (body: unknown = validBody(), cookie = cookies.manager) => (await (await create(body, cookie)).json()) as FarmBody;

  beforeAll(async () => {
    tenant = await createTenant(db, 'fazendas');
    other = await createTenant(db, 'fazendas-alheia');
    const names = {
      manager: 'Gestora',
      broker: 'Corretor',
      otherBroker: 'Outro corretor',
      dual: 'Dois perfis',
      excluder: 'Corretor que exclui',
      readOnly: 'Só leitura',
      outsider: 'De outra empresa',
      unlinked: 'Sem vínculo',
    } as const;
    users = Object.fromEntries(
      await Promise.all(Object.entries(names).map(async ([key, name]) => [key, await createUserWithPassword(db, name)])),
    ) as typeof users;
    for (const key of ['manager', 'broker', 'otherBroker', 'dual', 'excluder', 'readOnly'] as const) {
      await createMembership(db, users[key].id, tenant.id, { isDefault: true });
    }
    await createMembership(db, users.outsider.id, other.id, { isDefault: true });

    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: users.manager.id, profileId: ids.get('Gestor')! },
        { tenantId: tenant.id, userId: users.broker.id, profileId: ids.get('Corretor')! },
        { tenantId: tenant.id, userId: users.otherBroker.id, profileId: ids.get('Corretor')! },
        // Dois perfis: Corretor (own) e Gestor (all) — vale o mais amplo.
        { tenantId: tenant.id, userId: users.dual.id, profileId: ids.get('Corretor')! },
        { tenantId: tenant.id, userId: users.dual.id, profileId: ids.get('Gestor')! },
      ]);
    });
    await createLinkedAccessProfile(db, tenant.id, users.readOnly.id, 'Leitor', {
      permissions: ['fazendas.ver'],
      dataScopes: { fazendas: 'all' },
    });
    await createLinkedAccessProfile(db, tenant.id, users.excluder.id, 'Corretor que exclui', {
      permissions: ['fazendas.ver', 'fazendas.editar', 'fazendas.excluir'],
      dataScopes: { fazendas: 'own' },
    });
    await createLinkedAccessProfile(db, other.id, users.outsider.id, 'Admin', {
      permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar'],
      dataScopes: { fazendas: 'all' },
    });

    [available, sold, inactiveStatus, deactivated, post, inactivePost] = await db.withTenant(tenant.id, async (tx) => {
      const statuses = await tx
        .insert(commercialStatuses)
        .values([
          { tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 },
          { tenantId: tenant.id, name: 'Vendida', systemMeaning: 'sold', displayOrder: 1 },
          { tenantId: tenant.id, name: 'Antiga', systemMeaning: 'suspended', displayOrder: 2, active: false },
          { tenantId: tenant.id, name: 'Desativada', systemMeaning: 'inactive', displayOrder: 3 },
        ])
        .returning();
      const posts = await tx
        .insert(tradingPosts)
        .values([
          { tenantId: tenant.id, name: 'Rio Verde' },
          { tenantId: tenant.id, name: 'Praça antiga', active: false },
        ])
        .returning();
      return [statuses[0]!.id, statuses[1]!.id, statuses[2]!.id, statuses[3]!.id, posts[0]!.id, posts[1]!.id];
    });
    [foreignPost, foreignStatus] = await db.withTenant(other.id, async (tx) => {
      const [p] = await tx.insert(tradingPosts).values({ tenantId: other.id, name: 'Praça alheia' }).returning();
      const [s] = await tx
        .insert(commercialStatuses)
        .values({ tenantId: other.id, name: 'Disponível', systemMeaning: 'available' })
        .returning();
      return [p!.id, s!.id];
    });

    [soy, oldCorn] = await db.withTenant(tenant.id, async (tx) => {
      const rows = await tx
        .insert(crops)
        .values([
          { tenantId: tenant.id, name: 'Soja' },
          { tenantId: tenant.id, name: 'Milho antigo', active: false },
        ])
        .returning();
      return [rows[0]!.id, rows[1]!.id];
    });
    [foreignCrop] = await db.withTenant(other.id, async (tx) => {
      const rows = await tx.insert(crops).values({ tenantId: other.id, name: 'Soja alheia' }).returning();
      return [rows[0]!.id];
    });

    cookies = {} as typeof cookies;
    for (const key of Object.keys(users) as (keyof typeof users)[]) {
      if (key !== 'unlinked') cookies[key] = await loginAs(app, users[key]);
    }
  });

  afterAll(() => pool.end());

  describe('cadastro mínimo (critério 1)', () => {
    it('cria só com nome, município, corretor responsável e área total, no primeiro status disponível', async () => {
      const response = await create(validBody({ name: '  Fazenda Santa Rita  ', responsibleUserId: users.broker.id }));

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        name: 'Fazenda Santa Rita',
        municipality: { ibgeCode: RIO_VERDE, name: 'Rio Verde', uf: 'GO' },
        responsible: { id: users.broker.id, name: 'Corretor' },
        tradingPost: null,
        commercialStatus: { id: available, name: 'Disponível' },
        totalAreaHa: '1000.0000',
        usableAreaHa: null,
      });
    });

    it('o corretor responsável padrão é o usuário logado', async () => {
      const farm = await created(validBody());

      expect(farm.responsible.id).toBe(users.manager.id);
    });

    it.each([
      ['nome', { name: undefined }],
      ['nome em branco', { name: '   ' }],
      ['município', { municipalityIbgeCode: undefined }],
      ['área total', { totalAreaHa: undefined }],
      ['área total zero', { totalAreaHa: '0' }],
    ])('sem %s é 400', async (_label, overrides) => {
      const response = await create(validBody(overrides));

      expect(response.status).toBe(400);
    });

    it('a edição grava e registra no histórico', async () => {
      const farm = await created(validBody({ name: 'Antes' }));

      const response = await patch(farm.id, { name: 'Depois', totalAreaHa: '1200.5', tradingPostId: post });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ name: 'Depois', totalAreaHa: '1200.5000', tradingPost: { id: post, name: 'Rio Verde' } });

      const history = (await (await read(`/${farm.id}/history`)).json()) as HistoryBody;
      expect(history.entries[0]!.changes.map((change) => change.field)).toEqual(
        expect.arrayContaining(['Nome', 'Área total', 'Praça']),
      );
    });
  });

  describe('áreas (critério 2)', () => {
    it('área útil maior que a total é 400, na criação e na edição', async () => {
      expect((await create(validBody({ usableAreaHa: '1000.0001' }))).status).toBe(400);

      const farm = await created(validBody({ usableAreaHa: '800' }));
      expect((await patch(farm.id, { usableAreaHa: '1500' })).status).toBe(400);
      // Reduzir a total abaixo da útil gravada também fere a regra.
      expect((await patch(farm.id, { totalAreaHa: '700' })).status).toBe(400);
      expect((await patch(farm.id, { totalAreaHa: '900', usableAreaHa: '900' })).status).toBe(200);
    });
  });

  describe('referências (critério 33)', () => {
    it('praça ou status de outra empresa é 400', async () => {
      expect((await create(validBody({ tradingPostId: foreignPost }))).status).toBe(400);
      expect((await create(validBody({ commercialStatusId: foreignStatus }))).status).toBe(400);

      const farm = await created();
      expect((await patch(farm.id, { tradingPostId: foreignPost })).status).toBe(400);
      expect((await patch(farm.id, { commercialStatusId: foreignStatus })).status).toBe(400);
    });

    it('corretor responsável sem vínculo com a empresa é 400', async () => {
      expect((await create(validBody({ responsibleUserId: users.unlinked.id }))).status).toBe(400);
      expect((await create(validBody({ responsibleUserId: users.outsider.id }))).status).toBe(400);
    });

    it('município inexistente é 400', async () => {
      expect((await create(validBody({ municipalityIbgeCode: '0000000' }))).status).toBe(400);
    });

    it('trocar para entrada inativa é 400, e salvar sem tocar numa que ficou inativa passa', async () => {
      expect((await create(validBody({ tradingPostId: inactivePost }))).status).toBe(400);
      expect((await create(validBody({ commercialStatusId: inactiveStatus }))).status).toBe(400);

      const farm = await created(validBody({ tradingPostId: post, commercialStatusId: sold }));
      expect((await patch(farm.id, { tradingPostId: inactivePost })).status).toBe(400);

      await db.withTenant(tenant.id, async (tx) => {
        await tx.update(tradingPosts).set({ active: false }).where(eq(tradingPosts.id, post));
        await tx.update(commercialStatuses).set({ active: false }).where(eq(commercialStatuses.id, sold));
      });
      try {
        // A fazenda continua com as entradas que ficaram inativas, e reenviá-las não é "trocar".
        const response = await patch(farm.id, { name: 'Renomeada', tradingPostId: post, commercialStatusId: sold });
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ tradingPost: { id: post }, commercialStatus: { id: sold } });
      } finally {
        await db.withTenant(tenant.id, async (tx) => {
          await tx.update(tradingPosts).set({ active: true }).where(eq(tradingPosts.id, post));
          await tx.update(commercialStatuses).set({ active: true }).where(eq(commercialStatuses.id, sold));
        });
      }
    });

    it('cultura de referência de outra empresa é 400 no campo, na criação e na edição', async () => {
      const response = await create(validBody({ ...bagsPricing(), valuationCropId: foreignCrop }));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { field: 'valuationCropId' } });

      const farm = await created();
      const edit = await patch(farm.id, { ...bagsPricing(), valuationCropId: foreignCrop });
      expect(edit.status).toBe(400);
      expect(await edit.json()).toMatchObject({ error: { field: 'valuationCropId' } });
    });

    it('cultura de referência inativa é 400 quando muda, e salvar sem tocá-la passa', async () => {
      expect((await create(validBody({ ...bagsPricing(), valuationCropId: oldCorn }))).status).toBe(400);

      const farm = await created(validBody(bagsPricing()));
      await db.withTenant(tenant.id, (tx) => tx.update(crops).set({ active: false }).where(eq(crops.id, soy)));
      try {
        const same = await patch(farm.id, { name: 'Outro nome', ...bagsPricing() });
        expect(same.status).toBe(200);
        expect(await same.json()).toMatchObject({ valuationCrop: { id: soy, name: 'Soja' } });
        expect((await patch(farm.id, { ...bagsPricing(), valuationCropId: oldCorn })).status).toBe(400);
      } finally {
        await db.withTenant(tenant.id, (tx) => tx.update(crops).set({ active: true }).where(eq(crops.id, soy)));
      }
    });

    it('troca de status e de município ativos é aceita', async () => {
      const farm = await created();

      const response = await patch(farm.id, { commercialStatusId: sold, municipalityIbgeCode: GOIANIA });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ commercialStatus: { name: 'Vendida' }, municipality: { name: 'Goiânia' } });
    });
  });

  const bagsPricing = (overrides: Record<string, unknown> = {}) => ({
    pricingMode: 'bags',
    valuationBags: '7000',
    valuationBagsUnit: 'per_alqueire',
    valuationBagsAlqueireType: 'goiano',
    valuationCropId: soy,
    ...overrides,
  });

  describe('precificação (critério 3)', () => {
    // Cada linha fere uma cláusula do `CHECK` farms_pricing_check.
    const invalid: [string, () => Record<string, unknown>, string][] = [
      ['modo nulo com preço pedido', () => ({ askingPrice: '10' }), 'askingPrice'],
      ['modo nulo com quantidade de sacas', () => ({ valuationBags: '10' }), 'valuationBags'],
      ['modo nulo com unidade', () => ({ valuationBagsUnit: 'per_hectare' }), 'valuationBagsUnit'],
      ['modo nulo com tipo de alqueire', () => ({ valuationBagsAlqueireType: 'goiano' }), 'valuationBagsAlqueireType'],
      ['modo nulo com cultura', () => ({ valuationCropId: soy }), 'valuationCropId'],
      ['modo nulo com o conjunto de sacas completo', () => bagsPricing({ pricingMode: undefined }), 'valuationBags'],
      ['reais sem preço pedido', () => ({ pricingMode: 'brl' }), 'askingPrice'],
      ['reais com quantidade de sacas', () => ({ pricingMode: 'brl', askingPrice: '10', valuationBags: '1' }), 'valuationBags'],
      ['reais com unidade', () => ({ pricingMode: 'brl', askingPrice: '10', valuationBagsUnit: 'per_hectare' }), 'valuationBagsUnit'],
      ['reais com cultura', () => ({ pricingMode: 'brl', askingPrice: '10', valuationCropId: soy }), 'valuationCropId'],
      ['sacas sem quantidade', () => bagsPricing({ valuationBags: undefined }), 'valuationBags'],
      ['sacas sem unidade', () => bagsPricing({ valuationBagsUnit: undefined, valuationBagsAlqueireType: undefined }), 'valuationBagsUnit'],
      ['sacas sem cultura', () => bagsPricing({ valuationCropId: undefined }), 'valuationCropId'],
      ['sacas com preço pedido', () => bagsPricing({ askingPrice: '10' }), 'askingPrice'],
      ['por alqueire sem tipo', () => bagsPricing({ valuationBagsAlqueireType: undefined }), 'valuationBagsAlqueireType'],
      ['por hectare com tipo', () => bagsPricing({ valuationBagsUnit: 'per_hectare' }), 'valuationBagsAlqueireType'],
    ];

    it.each(invalid)('o banco recusa %s', async (_label, build) => {
      const pricing = Object.fromEntries(Object.entries(build()).filter(([, value]) => value !== undefined));
      await expect(
        db.withTenant(tenant.id, (tx) =>
          tx.insert(farms).values({
            tenantId: tenant.id,
            name: 'Direta',
            municipalityIbgeCode: RIO_VERDE,
            responsibleUserId: users.manager.id,
            commercialStatusId: available,
            totalAreaHa: '10',
            ...(pricing as Partial<typeof farms.$inferInsert>),
          }),
        ),
      ).rejects.toMatchObject({ cause: { constraint: 'farms_pricing_check' } });
    });

    it('o banco aceita sem preço, em reais e em sacas por hectare e por alqueire', async () => {
      const base = {
        tenantId: tenant.id,
        name: 'Direta',
        municipalityIbgeCode: RIO_VERDE,
        responsibleUserId: users.manager.id,
        commercialStatusId: available,
        totalAreaHa: '10',
      };
      const accepted: Partial<typeof farms.$inferInsert>[] = [
        {},
        { pricingMode: 'brl', askingPrice: '1000.00' },
        { pricingMode: 'bags', valuationBags: '10', valuationBagsUnit: 'per_hectare', valuationCropId: soy },
        { pricingMode: 'bags', valuationBags: '10', valuationBagsUnit: 'per_alqueire', valuationBagsAlqueireType: 'goiano', valuationCropId: soy },
      ];
      for (const pricing of accepted) {
        await expect(db.withTenant(tenant.id, (tx) => tx.insert(farms).values({ ...base, ...pricing }))).resolves.toBeDefined();
      }
    });

    it.each(invalid)('POST com %s é 400 no campo, nunca 500', async (_label, build, field) => {
      const response = await create(validBody(build()));

      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).toContain(field);
    });

    it('cria em reais, com valor por hectare e por hectare útil no detalhe', async () => {
      const farm = await created(validBody({ totalAreaHa: '1000', usableAreaHa: '800', pricingMode: 'brl', askingPrice: '80000000' }));
      const detail = (await (await read(`/${farm.id}`)).json()) as FarmBody;

      expect(detail).toMatchObject({ pricingMode: 'brl', askingPrice: '80000000.00', valuationBags: null, valuationCrop: null });
      expect(detail.priceDerivatives).toEqual({ pricePerHectare: '80000', pricePerUsableHectare: '100000', bagsPerHectare: null });
    });

    it('cria em sacas por alqueire, com sacas por hectare pelo tipo congelado', async () => {
      const farm = await created(validBody(bagsPricing()));
      const detail = (await (await read(`/${farm.id}`)).json()) as FarmBody;

      expect(detail).toMatchObject({
        pricingMode: 'bags',
        askingPrice: null,
        valuationBags: '7000.0000',
        valuationBagsUnit: 'per_alqueire',
        valuationBagsAlqueireType: 'goiano',
        valuationCrop: { id: soy, name: 'Soja' },
      });
      expect(detail.priceDerivatives).toEqual({ pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: '1446.281' });
    });

    it('sem preço: modo e conjunto nulos, derivados nulos', async () => {
      const farm = await created();

      expect(farm).toMatchObject({
        pricingMode: null,
        askingPrice: null,
        valuationBags: null,
        valuationBagsUnit: null,
        valuationBagsAlqueireType: null,
        valuationCrop: null,
        priceDerivatives: { pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: null },
      });
    });
  });

  describe('troca de modo (critério 4)', () => {
    it('trocar de reais para sacas apaga o preço pedido no mesmo save, e o histórico guarda o valor anterior', async () => {
      const farm = await created(validBody({ pricingMode: 'brl', askingPrice: '80000000' }));

      const response = await patch(farm.id, bagsPricing());
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ pricingMode: 'bags', askingPrice: null, valuationBags: '7000.0000' });

      const history = (await (await read(`/${farm.id}/history`)).json()) as HistoryBody;
      const latest = history.entries[0]!.changes;
      expect(latest).toContainEqual({ field: 'Modo de precificação', from: 'Em reais', to: 'Em sacas' });
      expect(latest).toContainEqual({ field: 'Preço pedido', from: 'R$ 80.000.000,00', to: null });
      expect(latest.map((change) => change.field)).toEqual(
        expect.arrayContaining(['Avaliação em sacas', 'Unidade da avaliação', 'Tipo de alqueire da avaliação', 'Cultura de referência']),
      );
    });

    it('trocar de sacas para reais apaga o conjunto de sacas', async () => {
      const farm = await created(validBody(bagsPricing()));

      const response = await patch(farm.id, { pricingMode: 'brl', askingPrice: '5000000' });

      expect(await response.json()).toMatchObject({
        pricingMode: 'brl',
        askingPrice: '5000000.00',
        valuationBags: null,
        valuationBagsUnit: null,
        valuationBagsAlqueireType: null,
        valuationCrop: null,
      });
    });

    it('voltar a sem preço apaga tudo, com a mudança no histórico', async () => {
      const farm = await created(validBody(bagsPricing()));

      const response = await patch(farm.id, { pricingMode: null });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        pricingMode: null,
        askingPrice: null,
        valuationBags: null,
        valuationBagsUnit: null,
        valuationBagsAlqueireType: null,
        valuationCrop: null,
      });
      const history = (await (await read(`/${farm.id}/history`)).json()) as HistoryBody;
      expect(history.entries[0]!.changes).toContainEqual({ field: 'Modo de precificação', from: 'Em sacas', to: null });
    });

    it('PATCH com campo de preço sem o modo é 400 no modo', async () => {
      const farm = await created(validBody({ pricingMode: 'brl', askingPrice: '100' }));

      const response = await patch(farm.id, { askingPrice: '200' });

      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).toContain('pricingMode');
    });

    it('PATCH sem campo de preço não toca a precificação nem o histórico dela', async () => {
      const farm = await created(validBody({ pricingMode: 'brl', askingPrice: '100' }));

      const response = await patch(farm.id, { name: 'Só o nome' });

      expect(await response.json()).toMatchObject({ pricingMode: 'brl', askingPrice: '100.00' });
      const history = (await (await read(`/${farm.id}/history`)).json()) as HistoryBody;
      expect(history.entries[0]!.changes.map((change) => change.field)).toEqual(['Nome']);
    });

    it('reenviar o mesmo bloco não gera histórico', async () => {
      const farm = await created(validBody(bagsPricing()));
      const before = ((await (await read(`/${farm.id}/history`)).json()) as HistoryBody).entries.length;

      expect((await patch(farm.id, bagsPricing())).status).toBe(200);

      expect(((await (await read(`/${farm.id}/history`)).json()) as HistoryBody).entries.length).toBe(before);
    });
  });

  describe('escopo de dados (critérios 15, 16 e 17)', () => {
    let mine: FarmBody;
    let theirs: FarmBody;

    beforeAll(async () => {
      mine = await created(validBody({ name: 'Escopo — do corretor', responsibleUserId: users.broker.id }));
      theirs = await created(validBody({ name: 'Escopo — do outro', responsibleUserId: users.otherBroker.id }));
    });

    it('escopo own recebe 404 por id direto em detalhe, histórico e PATCH de fazenda alheia', async () => {
      expect((await read(`/${theirs.id}`, cookies.broker)).status).toBe(404);
      expect((await read(`/${theirs.id}/history`, cookies.broker)).status).toBe(404);
      expect((await patch(theirs.id, { name: 'Invadida' }, cookies.broker)).status).toBe(404);

      // A fazenda alheia não mudou, e o dono ainda a vê.
      const intact = (await (await read(`/${theirs.id}`, cookies.otherBroker)).json()) as FarmBody;
      expect(intact.name).toBe('Escopo — do outro');
    });

    it('as próprias fazendas abrem normalmente', async () => {
      expect((await read(`/${mine.id}`, cookies.broker)).status).toBe(200);
      expect((await read(`/${mine.id}/history`, cookies.broker)).status).toBe(200);
      expect((await patch(mine.id, { name: 'Escopo — do corretor (editada)' }, cookies.broker)).status).toBe(200);
    });

    it('a lista e o total não incluem fazendas alheias', async () => {
      const body = (await (await read('?pageSize=100', cookies.broker)).json()) as ListBody;

      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items.every((farm) => farm.responsible.id === users.broker.id)).toBe(true);
      expect(body.items.map((farm) => farm.id)).not.toContain(theirs.id);
      expect(body.total).toBe(body.items.length);

      const everything = (await (await read('?pageSize=100', cookies.manager)).json()) as ListBody;
      expect(everything.total).toBeGreaterThan(body.total);
    });

    it('com escopo own, criar ou editar com outro corretor responsável é 403', async () => {
      expect((await create(validBody({ responsibleUserId: users.otherBroker.id }), cookies.broker)).status).toBe(403);
      expect((await patch(mine.id, { responsibleUserId: users.otherBroker.id }, cookies.broker)).status).toBe(403);

      // A si mesmo (explícito ou por padrão) pode.
      expect((await create(validBody({ responsibleUserId: users.broker.id }), cookies.broker)).status).toBe(201);
      const byDefault = await create(validBody(), cookies.broker);
      expect(byDefault.status).toBe(201);
      expect(((await byDefault.json()) as FarmBody).responsible.id).toBe(users.broker.id);
    });

    it('o 403 não revela fazenda alheia: id fora do escopo continua 404', async () => {
      expect((await patch(theirs.id, { responsibleUserId: users.broker.id }, cookies.broker)).status).toBe(404);
    });

    it('o Gestor (escopo all) transfere a carteira para outro corretor', async () => {
      const response = await patch(theirs.id, { responsibleUserId: users.broker.id });

      expect(response.status).toBe(200);
      expect(((await response.json()) as FarmBody).responsible.id).toBe(users.broker.id);
      await patch(theirs.id, { responsibleUserId: users.otherBroker.id });
    });

    it('o Gestor que é corretor responsável vê a carteira toda', async () => {
      const own = await created(validBody({ name: 'Do gestor' }), cookies.manager);
      expect(own.responsible.id).toBe(users.manager.id);

      const body = (await (await read('?pageSize=100', cookies.manager)).json()) as ListBody;
      const responsibles = new Set(body.items.map((farm) => farm.responsible.id));
      expect(responsibles).toContain(users.broker.id);
      expect(responsibles).toContain(users.otherBroker.id);
      expect((await read(`/${theirs.id}`, cookies.manager)).status).toBe(200);
    });

    it('o usuário com dois perfis (own + all) recebe all', async () => {
      const body = (await (await read('?pageSize=100', cookies.dual)).json()) as ListBody;
      const responsibles = new Set(body.items.map((farm) => farm.responsible.id));

      expect(responsibles).toContain(users.broker.id);
      expect(responsibles).toContain(users.otherBroker.id);
      expect((await read(`/${theirs.id}`, cookies.dual)).status).toBe(200);
    });
  });

  describe('permissões', () => {
    it('sem fazendas.criar ou editar é 403 antes do banco; só leitura vê', async () => {
      expect((await create(validBody(), cookies.readOnly)).status).toBe(403);
      const farm = await created();
      expect((await patch(farm.id, { name: 'X' }, cookies.readOnly)).status).toBe(403);
      expect((await read('', cookies.readOnly)).status).toBe(200);
    });

    it('id malformado é 404', async () => {
      expect((await read('/nao-e-um-id')).status).toBe(404);
      expect((await read('/nao-e-um-id/history')).status).toBe(404);
      expect((await patch('nao-e-um-id', { name: 'X' })).status).toBe(404);
      expect((await remove('nao-e-um-id')).status).toBe(404);
    });
  });

  describe('isolamento entre empresas (critério 19)', () => {
    let foreign: FarmBody;

    beforeAll(async () => {
      const response = await create(validBody({ name: 'Da outra empresa' }), cookies.outsider, other.slug);
      expect(response.status).toBe(201);
      foreign = (await response.json()) as FarmBody;
    });

    it('fazenda de outra empresa é 404 em toda rota', async () => {
      expect((await read(`/${foreign.id}`)).status).toBe(404);
      expect((await read(`/${foreign.id}/history`)).status).toBe(404);
      expect((await patch(foreign.id, { name: 'Invadida' })).status).toBe(404);
      expect((await remove(foreign.id)).status).toBe(404);
    });

    it('a lista não traz fazenda de outra empresa', async () => {
      const body = (await (await read('?pageSize=100')).json()) as ListBody;

      expect(body.items.map((farm) => farm.id)).not.toContain(foreign.id);
    });

    it('quem não tem vínculo com a empresa não alcança as rotas dela', async () => {
      expect((await read('', cookies.outsider)).status).toBe(404);
    });

    it('o banco recusa área útil acima da total mesmo fora do serviço', async () => {
      await expect(
        db.withTenant(tenant.id, (tx) =>
          tx.insert(farms).values({
            tenantId: tenant.id,
            name: 'Direta',
            municipalityIbgeCode: RIO_VERDE,
            responsibleUserId: users.manager.id,
            commercialStatusId: available,
            totalAreaHa: '10',
            usableAreaHa: '11',
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe('exclusão (critérios 12 e 15)', () => {
    it('excluir fazenda fora de status desativada é 409 e a fazenda continua lá', async () => {
      const farm = await created(validBody({ name: 'Exclusão — ativa' }));
      const response = await remove(farm.id);

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        error: { code: 'conflict', message: 'Desative a fazenda antes de excluir.' },
      });
      expect((await read(`/${farm.id}`)).status).toBe(200);
    });

    it('fazenda desativada é excluída com 204 e some do detalhe, da lista e do histórico', async () => {
      const farm = await created(validBody({ name: 'Exclusão — desativada' }));
      expect((await deactivate(farm.id)).status).toBe(200);

      expect((await remove(farm.id)).status).toBe(204);
      expect((await read(`/${farm.id}`)).status).toBe(404);
      expect((await read(`/${farm.id}/history`)).status).toBe(404);
      const listed = (await (await read(`?commercialStatusId=${deactivated}&pageSize=100`)).json()) as ListBody;
      expect(listed.items.map((item) => item.id)).not.toContain(farm.id);
      expect((await remove(farm.id)).status).toBe(404);
    });

    it('a exclusão fica no audit_log da empresa', async () => {
      const farm = await created(validBody({ name: 'Exclusão — auditada' }));
      await deactivate(farm.id);
      await remove(farm.id);

      const rows = await db.withTenant(tenant.id, (tx) =>
        tx.execute<{ n: string }>(
          // `audit_log` não tem coluna de operação: a exclusão é a linha de `name` com valor novo nulo.
          sql`select count(*) as n from audit_log where entity = 'farms' and entity_id = ${farm.id} and field = 'name' and new_value is null`,
        ),
      );
      expect(Number(rows.rows[0]!.n)).toBe(1);
    });

    it('a exclusão apaga proprietários, culturas e aptidões e audita cada filho', async () => {
      const [aptitude, crop, owner] = await db.withTenant(tenant.id, async (tx) => {
        const [a] = await tx.insert(aptitudes).values({ tenantId: tenant.id, name: 'Exclusão — aptidão' }).returning();
        const [c] = await tx.insert(crops).values({ tenantId: tenant.id, name: 'Exclusão — cultura' }).returning();
        const [o] = await tx
          .insert(contacts)
          .values({ tenantId: tenant.id, personType: 'pf', name: 'Exclusão — proprietário' })
          .returning();
        return [a!, c!, o!] as const;
      });
      const response = await create(
        validBody({
          name: 'Exclusão — com filhos',
          aptitudeIds: [aptitude.id],
          cropIds: [crop.id],
          owners: [{ contactId: owner.id, isPrimary: true }],
        }),
      );
      expect(response.status).toBe(201);
      const farm = (await response.json()) as FarmBody;
      expect((await deactivate(farm.id)).status).toBe(200);

      expect((await remove(farm.id)).status).toBe(204);

      const remaining = await db.withTenant(tenant.id, async (tx) => ({
        aptitudes: await tx.select().from(farmAptitudes).where(eq(farmAptitudes.farmId, farm.id)),
        crops: await tx.select().from(farmCrops).where(eq(farmCrops.farmId, farm.id)),
        owners: await tx.select().from(farmOwners).where(eq(farmOwners.farmId, farm.id)),
      }));
      expect(remaining).toEqual({ aptitudes: [], crops: [], owners: [] });

      // `audit_log` não tem coluna de operação: a exclusão é a linha com valor novo nulo.
      const audited = await db.withTenant(tenant.id, (tx) =>
        tx.execute<{ entity: string; n: string; changes: string }>(
          sql`select entity, count(distinct entity_id) as n, count(distinct change_id) as changes from audit_log
            where entity in ('farm_aptitudes', 'farm_crops', 'farm_owners') and new_value is null
              and entity_id in (
                select entity_id from audit_log where entity in ('farm_aptitudes', 'farm_crops', 'farm_owners')
                  and field = 'farm_id' and old_value = ${farm.id}
              )
            group by entity order by entity`,
        ),
      );
      expect(audited.rows.map((row) => [row.entity, Number(row.n)])).toEqual([
        ['farm_aptitudes', 1],
        ['farm_crops', 1],
        ['farm_owners', 1],
      ]);
    });

    it('sem fazendas.excluir é 403 antes do banco', async () => {
      const farm = await created(validBody({ name: 'Exclusão — sem permissão' }));
      await deactivate(farm.id);

      expect((await remove(farm.id, cookies.readOnly)).status).toBe(403);
      expect((await remove(farm.id, cookies.broker)).status).toBe(403);
      expect((await read(`/${farm.id}`)).status).toBe(200);
    });

    it('escopo own com fazendas.excluir recebe 404 no DELETE de fazenda alheia, e exclui a própria desativada', async () => {
      const theirs = await created(validBody({ name: 'Exclusão — alheia', responsibleUserId: users.broker.id }));
      await deactivate(theirs.id);
      const mine = await created(validBody({ name: 'Exclusão — própria', responsibleUserId: users.excluder.id }));
      await deactivate(mine.id);

      expect((await remove(theirs.id, cookies.excluder)).status).toBe(404);
      expect((await read(`/${theirs.id}`)).status).toBe(200);
      expect((await remove(mine.id, cookies.excluder)).status).toBe(204);
    });
  });

  describe('duplicatas (critérios 23 e 15)', () => {
    interface DuplicatesBody {
      items: { id: string; name: string; municipality: { ibgeCode: string; name: string; uf: string }; reasons: string[] }[];
    }
    const duplicates = (query: Record<string, string>, cookie = cookies.manager, slug = tenant.slug) =>
      read(`/duplicates?${new URLSearchParams(query)}`, cookie, slug);
    const found = async (query: Record<string, string>, cookie = cookies.manager, slug = tenant.slug) =>
      (await (await duplicates(query, cookie, slug)).json()) as DuplicatesBody;

    it('acha o mesmo nome sem caixa nem acento no mesmo município, e não no município vizinho', async () => {
      const inRioVerde = await created(validBody({ name: 'Fazenda São Judas Tadeu' }));
      await created(validBody({ name: 'Fazenda São Judas Tadeu', municipalityIbgeCode: GOIANIA }));

      const body = await found({ name: 'fazenda sao judas tadeu', municipalityIbgeCode: RIO_VERDE });

      expect(body.items).toEqual([
        {
          id: inRioVerde.id,
          name: 'Fazenda São Judas Tadeu',
          municipality: { ibgeCode: RIO_VERDE, name: 'Rio Verde', uf: 'GO' },
          reasons: ['name_municipality'],
        },
      ]);
    });

    it('nome só parecido não conta', async () => {
      await created(validBody({ name: 'Fazenda Santo Antônio do Vale' }));

      expect((await found({ name: 'Fazenda Santo Antônio', municipalityIbgeCode: RIO_VERDE })).items).toEqual([]);
    });

    it('excludeId tira a própria fazenda', async () => {
      const own = await created(validBody({ name: 'Fazenda Nossa Senhora Aparecida' }));
      const twin = await created(validBody({ name: 'Fazenda Nossa Senhora Aparecida' }));
      const query = { name: 'Fazenda Nossa Senhora Aparecida', municipalityIbgeCode: RIO_VERDE };

      expect((await found(query)).items.map((item) => item.id).sort()).toEqual([own.id, twin.id].sort());
      expect((await found({ ...query, excludeId: own.id })).items.map((item) => item.id)).toEqual([twin.id]);
    });

    it('com escopo own, não devolve fazenda alheia; com escopo all, devolve', async () => {
      const theirs = await created(
        validBody({ name: 'Fazenda Bela Vista do Corretor Alheio', responsibleUserId: users.otherBroker.id }),
      );
      const query = { name: 'Fazenda Bela Vista do Corretor Alheio', municipalityIbgeCode: RIO_VERDE };

      expect((await found(query, cookies.broker)).items).toEqual([]);
      expect((await found(query, cookies.otherBroker)).items.map((item) => item.id)).toEqual([theirs.id]);
      expect((await found(query, cookies.manager)).items.map((item) => item.id)).toEqual([theirs.id]);
    });

    it('não devolve fazenda de outra empresa', async () => {
      await create(validBody({ name: 'Fazenda Da Outra Empresa Homônima' }), cookies.outsider, other.slug);

      const body = await found({ name: 'Fazenda Da Outra Empresa Homônima', municipalityIbgeCode: RIO_VERDE });

      expect(body.items).toEqual([]);
    });

    it('sem nome ou sem município devolve lista vazia; excludeId malformado é 400', async () => {
      await created(validBody({ name: 'Fazenda Sem Critério' }));

      expect((await found({ municipalityIbgeCode: RIO_VERDE })).items).toEqual([]);
      expect((await found({ name: 'Fazenda Sem Critério' })).items).toEqual([]);
      expect((await found({ name: '  ', municipalityIbgeCode: RIO_VERDE })).items).toEqual([]);
      expect((await duplicates({ name: 'x', municipalityIbgeCode: RIO_VERDE, excludeId: 'nao-e-uuid' })).status).toBe(400);
    });
  });

  describe('lista', () => {
    it('sem parâmetro de status, a lista e o total não contam desativadas; pedindo o status desativada, aparecem', async () => {
      const keep = await created(validBody({ name: 'Lista — ativa' }));
      const soldFarm = await created(validBody({ name: 'Lista — vendida', commercialStatusId: sold }));
      const gone = await created(validBody({ name: 'Lista — desativada' }));
      await deactivate(gone.id);

      const byDefault = (await (await read('?pageSize=100')).json()) as ListBody;
      const ids = byDefault.items.map((item) => item.id);
      expect(ids).toContain(keep.id);
      expect(ids).toContain(soldFarm.id);
      expect(ids).not.toContain(gone.id);
      expect(byDefault.total).toBe(byDefault.items.length);

      const asked = (await (await read(`?commercialStatusId=${deactivated}&pageSize=100`)).json()) as ListBody;
      expect(asked.items.map((item) => item.id)).toContain(gone.id);
      expect(asked.items.every((item) => item.commercialStatus.systemMeaning === 'inactive')).toBe(true);
      expect(asked.total).toBe(asked.items.length);
    });

    it('status com id inválido é 400', async () => {
      expect((await read('?commercialStatusId=nao-e-id')).status).toBe(400);
    });

    it('ordena por mais recente, desempatando por id, e pagina', async () => {
      const first = (await (await read('?pageSize=25')).json()) as ListBody & { page: number; pageSize: number };

      expect(first.page).toBe(1);
      expect(first.pageSize).toBe(25);
      const dates = first.items.map((farm) => farm as FarmBody & { createdAt: string }).map((farm) => farm.createdAt);
      expect([...dates].sort().reverse()).toEqual(dates);
    });

    it('ordena por nome e por área total', async () => {
      const byName = (await (await read('?sort=name&pageSize=100')).json()) as ListBody;
      const names = byName.items.map((farm) => farm.name);
      expect([...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(names);

      const byArea = (await (await read('?sort=-totalAreaHa&pageSize=100')).json()) as ListBody;
      const areas = byArea.items.map((farm) => Number(farm.totalAreaHa));
      expect([...areas].sort((a, b) => b - a)).toEqual(areas);
    });
  });
});
