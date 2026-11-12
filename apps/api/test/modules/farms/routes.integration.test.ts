// Fazendas por HTTP, contra o Postgres real: cadastro mínimo, validação de áreas
// e de referências, e a prova de integração do escopo de dados `own` (404 por id
// direto, lista e total sem as alheias), mais o isolamento entre empresas.
import {
  auditedWrites,
  commercialStatuses,
  createDatabase,
  createPool,
  farms,
  tradingPosts,
  userProfiles,
} from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
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
  commercialStatus: { id: string; name: string };
  totalAreaHa: string;
  usableAreaHa: string | null;
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
  let users: Record<'manager' | 'broker' | 'otherBroker' | 'dual' | 'readOnly' | 'outsider' | 'unlinked', { id: string; name: string; email: string; password: string }>;
  let cookies: Record<keyof typeof users, string>;
  let available: string;
  let sold: string;
  let inactiveStatus: string;
  let post: string;
  let inactivePost: string;
  let foreignPost: string;
  let foreignStatus: string;

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
      readOnly: 'Só leitura',
      outsider: 'De outra empresa',
      unlinked: 'Sem vínculo',
    } as const;
    users = Object.fromEntries(
      await Promise.all(Object.entries(names).map(async ([key, name]) => [key, await createUserWithPassword(db, name)])),
    ) as typeof users;
    for (const key of ['manager', 'broker', 'otherBroker', 'dual', 'readOnly'] as const) {
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
    await createLinkedAccessProfile(db, other.id, users.outsider.id, 'Admin', {
      permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar'],
      dataScopes: { fazendas: 'all' },
    });

    [available, sold, inactiveStatus, post, inactivePost] = await db.withTenant(tenant.id, async (tx) => {
      const statuses = await tx
        .insert(commercialStatuses)
        .values([
          { tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 },
          { tenantId: tenant.id, name: 'Vendida', systemMeaning: 'sold', displayOrder: 1 },
          { tenantId: tenant.id, name: 'Antiga', systemMeaning: 'suspended', displayOrder: 2, active: false },
        ])
        .returning();
      const posts = await tx
        .insert(tradingPosts)
        .values([
          { tenantId: tenant.id, name: 'Rio Verde' },
          { tenantId: tenant.id, name: 'Praça antiga', active: false },
        ])
        .returning();
      return [statuses[0]!.id, statuses[1]!.id, statuses[2]!.id, posts[0]!.id, posts[1]!.id];
    });
    [foreignPost, foreignStatus] = await db.withTenant(other.id, async (tx) => {
      const [p] = await tx.insert(tradingPosts).values({ tenantId: other.id, name: 'Praça alheia' }).returning();
      const [s] = await tx
        .insert(commercialStatuses)
        .values({ tenantId: other.id, name: 'Disponível', systemMeaning: 'available' })
        .returning();
      return [p!.id, s!.id];
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

    it('troca de status e de município ativos é aceita', async () => {
      const farm = await created();

      const response = await patch(farm.id, { commercialStatusId: sold, municipalityIbgeCode: GOIANIA });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ commercialStatus: { name: 'Vendida' }, municipality: { name: 'Goiânia' } });
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

  describe('lista', () => {
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
