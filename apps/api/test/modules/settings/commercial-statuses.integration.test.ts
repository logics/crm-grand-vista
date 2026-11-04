// Status comercial: o primeiro cadastro de ordem manual e com significado de sistema.
import { auditLog, commercialStatuses, createDatabase, createPool } from '@crm/db';
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

interface Entry {
  id: string;
  name: string;
  active: boolean;
  systemMeaning: string;
}

describe('cadastros auxiliares — Status comercial', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let brokerCookie: string;

  const send = (method: string, path: string, body?: unknown, cookie = managerCookie, slug = tenant.slug) =>
    app.request(
      `/e/${slug}/settings/vocabularies/commercial-statuses${path}`,
      body === undefined ? { method, headers: { cookie } } : jsonRequest(method, body, cookie),
    );
  const create = (name: string, systemMeaning: string) => send('POST', '', { name, systemMeaning });
  const createOk = async (name: string, systemMeaning: string): Promise<Entry> => {
    const response = await create(name, systemMeaning);
    expect(response.status).toBe(201);
    return (await response.json()) as Entry;
  };
  const list = async (query = '') =>
    (await (await send('GET', query)).json()) as { items: Entry[]; total: number };
  const names = async () => (await list()).items.map((entry) => entry.name);
  const defaults = async (cookie = managerCookie) => {
    const response = await send('GET', '/defaults', undefined, cookie);
    expect(response.status).toBe(200);
    return (await response.json()) as Record<string, { id: string; name: string } | null>;
  };

  beforeAll(async () => {
    tenant = await createTenant(db, 'status-comercial');
    const manager = await createUserWithPassword(db, 'Gestora');
    const broker = await createUserWithPassword(db, 'Corretor');
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await createMembership(db, broker.id, tenant.id, { isDefault: true });
    await createLinkedAccessProfile(db, tenant.id, manager.id, 'Gestor', { permissions: ['configuracoes.gerenciar'] });
    await createLinkedAccessProfile(db, tenant.id, broker.id, 'Corretor');
    managerCookie = await loginAs(app, manager);
    brokerCookie = await loginAs(app, broker);
  });

  afterAll(() => pool.end());

  const clear = () => db.withTenant(tenant.id, (tx) => tx.delete(commercialStatuses));

  it('entrada nova entra no fim e a lista segue a ordem do cadastro', async () => {
    await clear();
    await createOk('Zebra', 'available');
    await createOk('Abacate', 'sold');
    await createOk('Meio', 'negotiating');
    expect(await names()).toEqual(['Zebra', 'Abacate', 'Meio']);
    expect((await list()).total).toBe(3);
  });

  it('exige o significado na criação, de lista fechada', async () => {
    expect((await send('POST', '', { name: 'Sem significado' })).status).toBe(400);
    expect((await create('Inventado', 'archived')).status).toBe(400);
  });

  it('recusa o 51º status comercial', async () => {
    await clear();
    await db.withTenant(tenant.id, (tx) =>
      tx.insert(commercialStatuses).values(
        Array.from({ length: 50 }, (_, index) => ({
          tenantId: tenant.id,
          name: `Status ${index}`,
          displayOrder: index,
          systemMeaning: 'available',
        })),
      ),
    );
    const response = await create('O 51º', 'available');
    expect(response.status).toBe(409);
    expect(await names()).not.toContain('O 51º');
  });

  describe('significado de sistema', () => {
    it('PATCH com systemMeaning é 400, mesmo com o valor atual', async () => {
      await clear();
      const entry = await createOk('Vendida', 'sold');
      expect((await send('PATCH', `/${entry.id}`, { systemMeaning: 'available' })).status).toBe(400);
      expect((await send('PATCH', `/${entry.id}`, { systemMeaning: 'sold' })).status).toBe(400);
    });

    it('desativar e excluir a última ativa de um significado são 409', async () => {
      await clear();
      const sold = await createOk('Vendida', 'sold');

      const deactivate = await send('PATCH', `/${sold.id}`, { active: false });
      expect(deactivate.status).toBe(409);
      expect(await deactivate.json()).toEqual({
        error: { code: 'conflict', message: 'Precisa haver ao menos um status ativo com o significado Vendida.' },
      });
      expect((await send('DELETE', `/${sold.id}`)).status).toBe(409);
      expect((await list()).items[0]?.active).toBe(true);
    });

    it('com duas ativas, desativar ou excluir uma passa — e a última restante fica protegida', async () => {
      await clear();
      const first = await createOk('Vendida', 'sold');
      const second = await createOk('Vendida com permuta', 'sold');

      expect((await send('PATCH', `/${first.id}`, { active: false })).status).toBe(200);
      expect((await send('PATCH', `/${second.id}`, { active: false })).status).toBe(409);
      // reativar a primeira libera a segunda
      expect((await send('PATCH', `/${first.id}`, { active: true })).status).toBe(200);
      expect((await send('DELETE', `/${second.id}`)).status).toBe(204);
      expect((await send('DELETE', `/${first.id}`)).status).toBe(409);
    });

    it('excluir entrada inativa não esbarra na regra e renomear é livre', async () => {
      await clear();
      const keeper = await createOk('Disponível', 'available');
      const spare = await createOk('Disponível antiga', 'available');
      await send('PATCH', `/${spare.id}`, { active: false });

      expect((await send('PATCH', `/${keeper.id}`, { name: 'À venda' })).status).toBe(200);
      expect((await send('DELETE', `/${spare.id}`)).status).toBe(204);
    });

    it('o significado aparece nas respostas e a escrita é auditada', async () => {
      await clear();
      const entry = await createOk('Suspensa', 'suspended');
      expect(entry.systemMeaning).toBe('suspended');
      expect((await list()).items[0]?.systemMeaning).toBe('suspended');

      const rows = await db.withTenant(tenant.id, (tx) => tx.select().from(auditLog));
      expect(rows.filter((row) => row.entityId === entry.id && row.field === 'system_meaning')).toHaveLength(1);
    });
  });

  describe('/defaults', () => {
    it('devolve a primeira ativa de cada significado na ordem manual, nulo para o que não tem', async () => {
      await clear();
      const inactive = await createOk('Vendida antiga', 'sold');
      const first = await createOk('Vendida', 'sold');
      await createOk('Vendida 2', 'sold');
      await createOk('Disponível', 'available');
      await send('PATCH', `/${inactive.id}`, { active: false });

      expect(await defaults()).toEqual({
        available: { id: expect.any(String), name: 'Disponível' },
        negotiating: null,
        sold: { id: first.id, name: 'Vendida' },
        suspended: null,
      });
    });

    it('muda quando a ordem muda', async () => {
      await clear();
      await createOk('Vendida A', 'sold');
      const b = await createOk('Vendida B', 'sold');
      await db.withTenant(tenant.id, (tx) =>
        tx.update(commercialStatuses).set({ displayOrder: -1 }).where(eq(commercialStatuses.id, b.id)),
      );
      expect((await defaults()).sold?.name).toBe('Vendida B');
    });

    it('usuário sem configuracoes.gerenciar lê /defaults, mas não a listagem nem escreve', async () => {
      await clear();
      await createOk('Disponível', 'available');
      expect((await defaults(brokerCookie)).available?.name).toBe('Disponível');
      expect((await send('GET', '', undefined, brokerCookie)).status).toBe(403);
      expect((await send('POST', '', { name: 'X', systemMeaning: 'sold' }, brokerCookie)).status).toBe(403);
    });

    it('cadastro sem significado devolve objeto vazio', async () => {
      const response = await app.request(`/e/${tenant.slug}/settings/vocabularies/crops/defaults`, {
        headers: { cookie: brokerCookie },
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({});
    });
  });

  it('cadastro sem significado recusa systemMeaning na criação', async () => {
    const response = await app.request(
      `/e/${tenant.slug}/settings/vocabularies/crops`,
      jsonRequest('POST', { name: 'Soja', systemMeaning: 'sold' }, managerCookie),
    );
    expect(response.status).toBe(400);
  });

  it('o menu informa que o cadastro tem significado', async () => {
    const response = await app.request(`/e/${tenant.slug}/settings/vocabularies`, { headers: { cookie: managerCookie } });
    const menu = (await response.json()) as { key: string; hasSystemMeaning: boolean; orderMode: string }[];
    expect(menu.find((item) => item.key === 'commercial-statuses')).toMatchObject({
      hasSystemMeaning: true,
      orderMode: 'manual',
    });
    expect(menu.find((item) => item.key === 'crops')?.hasSystemMeaning).toBe(false);
  });
});
