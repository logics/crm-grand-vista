// Motor de cadastros auxiliares por HTTP, contra o Postgres real, provado com Culturas.
import { auditLog, createDatabase, createPool, crops } from '@crm/db';
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import { and, eq } from 'drizzle-orm';
import pg from 'pg';
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
}

describe('cadastros auxiliares — Culturas', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;
  let manager: Awaited<ReturnType<typeof createUserWithPassword>>;
  let broker: Awaited<ReturnType<typeof createUserWithPassword>>;
  let otherManager: Awaited<ReturnType<typeof createUserWithPassword>>;
  let managerCookie: string;
  let brokerCookie: string;
  let otherCookie: string;

  const base = () => `/e/${tenant.slug}/settings/vocabularies`;
  const send = (method: string, path: string, body?: unknown, cookie = managerCookie) =>
    app.request(`${base()}${path}`, body === undefined ? { method, headers: { cookie } } : jsonRequest(method, body, cookie));
  const create = (name: string, cookie = managerCookie) => send('POST', '/crops', { name }, cookie);
  const createOk = async (name: string): Promise<Entry> => {
    const response = await create(name);
    expect(response.status).toBe(201);
    return (await response.json()) as Entry;
  };
  const list = async (query = '') => (await send('GET', `/crops${query}`)).json() as Promise<{
    items: Entry[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  const names = async (query = '') => (await list(query)).items.map((entry) => entry.name);

  beforeAll(async () => {
    tenant = await createTenant(db, 'cadastros');
    otherTenant = await createTenant(db, 'cadastros-alheia');
    manager = await createUserWithPassword(db, 'Gestora');
    broker = await createUserWithPassword(db, 'Corretor');
    otherManager = await createUserWithPassword(db, 'Gestor da outra');
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await createMembership(db, broker.id, tenant.id, { isDefault: true });
    await createMembership(db, otherManager.id, otherTenant.id, { isDefault: true });
    await createLinkedAccessProfile(db, tenant.id, manager.id, 'Gestor', { permissions: ['configuracoes.gerenciar'] });
    await createLinkedAccessProfile(db, tenant.id, broker.id, 'Corretor');
    await createLinkedAccessProfile(db, otherTenant.id, otherManager.id, 'Gestor', {
      permissions: ['configuracoes.gerenciar'],
    });
    managerCookie = await loginAs(app, manager);
    brokerCookie = await loginAs(app, broker);
    otherCookie = await loginAs(app, otherManager);
  });

  afterAll(() => pool.end());

  describe('ciclo de vida', () => {
    it('cria, renomeia, desativa, reativa e exclui uma cultura', async () => {
      const created = await createOk('  Feijão  ');
      expect(created).toEqual({ id: expect.any(String), name: 'Feijão', active: true });

      const renamed = await send('PATCH', `/crops/${created.id}`, { name: 'Feijão-carioca' });
      expect(renamed.status).toBe(200);
      expect(await renamed.json()).toEqual({ ...created, name: 'Feijão-carioca' });

      const off = await send('PATCH', `/crops/${created.id}`, { active: false });
      expect(((await off.json()) as Entry).active).toBe(false);
      const on = await send('PATCH', `/crops/${created.id}`, { active: true });
      expect(((await on.json()) as Entry).active).toBe(true);

      expect((await send('DELETE', `/crops/${created.id}`)).status).toBe(204);
      expect((await send('DELETE', `/crops/${created.id}`)).status).toBe(404);
    });

    it('audita as escritas com o autor', async () => {
      const entry = await createOk('Sorgo');
      await send('PATCH', `/crops/${entry.id}`, { name: 'Sorgo-granífero' });

      const rows = await db.withTenant(tenant.id, (tx) =>
        tx.select().from(auditLog).where(and(eq(auditLog.entity, 'crops'), eq(auditLog.entityId, entry.id))),
      );
      expect(rows.some((row) => row.field === 'name' && row.oldValue === 'Sorgo' && row.newValue === 'Sorgo-granífero')).toBe(true);
      expect(new Set(rows.map((row) => row.userId))).toEqual(new Set([manager.id]));
    });

    it('recusa nome vazio ou com mais de 100 caracteres', async () => {
      expect((await create('   ')).status).toBe(400);
      expect((await create('x'.repeat(101))).status).toBe(400);
      expect((await create('x'.repeat(100))).status).toBe(201);
    });

    it('cadastro fora do registro é 404, em toda rota', async () => {
      expect((await send('GET', '/inexistente')).status).toBe(404);
      expect((await send('POST', '/inexistente', { name: 'A' })).status).toBe(404);
      expect((await send('PATCH', '/inexistente/x', { name: 'A' })).status).toBe(404);
      expect((await send('DELETE', '/inexistente/x')).status).toBe(404);
    });

    it('o menu lista os cadastros do registro em ordem alfabética', async () => {
      const response = await send('GET', '');
      expect(response.status).toBe(200);
      const menu = (await response.json()) as { key: string; label: string }[];
      expect(menu.map(({ label }) => label)).toEqual([
        'Aptidões',
        'Categorias de documento',
        'Classificações do cliente',
        'Culturas',
        'Formas de pagamento',
        'Origens do lead',
        'Perfis de compra',
        'Praças',
        'Status comercial',
      ]);
      expect(menu.map(({ key }) => key)).toContain('lead-sources');
    });

    it.each(['aptitudes', 'lead-sources', 'document-categories', 'payment-methods', 'contact-classifications', 'purchase-profiles'])(
      'o cadastro %s responde às mesmas rotas do motor',
      async (key) => {
        const created = await send('POST', `/${key}`, { name: 'Entrada nova' });
        expect(created.status).toBe(201);
        const { id } = (await created.json()) as { id: string };

        expect((await send('GET', `/${key}`)).status).toBe(200);
        expect((await send('PATCH', `/${key}/${id}`, { active: false })).status).toBe(200);
        expect((await send('DELETE', `/${key}/${id}`)).status).toBe(204);
      },
    );
  });

  describe('unicidade do nome', () => {
    it('"soja" e "Sója" colidem com "Soja", sem caixa nem acento', async () => {
      await createOk('Soja');
      for (const name of ['soja', 'Sója', ' SOJA ']) {
        const response = await create(name);
        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
          error: { code: 'conflict', message: 'Já existe uma entrada com esse nome.' },
        });
      }
    });

    it('a mensagem distingue a entrada inativa', async () => {
      const entry = await createOk('Girassol');
      await send('PATCH', `/crops/${entry.id}`, { active: false });

      const response = await create('girassol');
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { message: 'Já existe uma entrada inativa com esse nome; reative-a.' },
      });
    });

    it('renomear para o nome de outra entrada é 409, e para o próprio nome com outra caixa passa', async () => {
      const a = await createOk('Arroz');
      const b = await createOk('Trigo');
      expect((await send('PATCH', `/crops/${b.id}`, { name: 'arroz' })).status).toBe(409);
      expect((await send('PATCH', `/crops/${a.id}`, { name: 'ARROZ' })).status).toBe(200);
    });

    it('duas empresas têm cada uma a sua "Soja"', async () => {
      const response = await app.request(`/e/${otherTenant.slug}/settings/vocabularies/crops`, jsonRequest('POST', { name: 'Soja' }, otherCookie));
      expect(response.status).toBe(201);
    });
  });

  describe('exclusão de entrada em uso', () => {
    const owner = () => new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });
    const TABLE = 'test_crop_consumers';

    // Nenhum consumidor existe ainda: o teste cria um, com FK `RESTRICT`, e a
    // rota e a tradução do erro são as de produção.
    beforeAll(async () => {
      const client = owner();
      await client.connect();
      try {
        await client.query(`drop table if exists ${TABLE}`);
        await client.query(`create table ${TABLE} (crop_id uuid not null references crops(id) on delete restrict)`);
        await client.query(`grant select, insert, delete on ${TABLE} to crm_app`);
      } finally {
        await client.end();
      }
    });

    afterAll(async () => {
      const client = owner();
      await client.connect();
      try {
        await client.query(`drop table if exists ${TABLE}`);
      } finally {
        await client.end();
      }
    });

    it('entrada referenciada é 409 e entrada nunca usada é 204', async () => {
      const used = await createOk('Amendoim');
      const unused = await createOk('Gergelim');
      await db.withTenant(tenant.id, (tx) => tx.execute(`insert into ${TABLE} (crop_id) values ('${used.id}')` as never));

      const refused = await send('DELETE', `/crops/${used.id}`);
      expect(refused.status).toBe(409);
      expect(await refused.json()).toEqual({
        error: {
          code: 'conflict',
          message: 'Esta entrada está em uso. Desative-a para que não apareça em novos cadastros.',
        },
      });
      expect((await list('?q=amendoim')).items).toHaveLength(1);

      expect((await send('DELETE', `/crops/${unused.id}`)).status).toBe(204);
    });
  });

  describe('acesso', () => {
    it('sem configuracoes.gerenciar, toda escrita e a listagem são 403', async () => {
      const entry = await createOk('Mandioca');
      const attempts = [
        send('GET', '', undefined, brokerCookie),
        send('GET', '/crops', undefined, brokerCookie),
        send('POST', '/crops', { name: 'Nova' }, brokerCookie),
        send('PATCH', `/crops/${entry.id}`, { name: 'Outra' }, brokerCookie),
        send('DELETE', `/crops/${entry.id}`, undefined, brokerCookie),
        // O 403 vem antes do 404 do cadastro e da validação do corpo.
        send('POST', '/inexistente', {}, brokerCookie),
      ];
      expect((await Promise.all(attempts)).map((response) => response.status)).toEqual([403, 403, 403, 403, 403, 403]);
      expect(await names('?q=mandioca')).toEqual(['Mandioca']);
    });

    it('entrada de outra empresa é 404 em toda rota', async () => {
      const foreign = await db.withTenant(otherTenant.id, async (tx) => {
        const [row] = await tx.insert(crops).values({ tenantId: otherTenant.id, name: 'Cultura alheia' }).returning();
        return row!;
      });

      expect((await send('PATCH', `/crops/${foreign.id}`, { name: 'X' })).status).toBe(404);
      expect((await send('PATCH', `/crops/${foreign.id}`, { active: false })).status).toBe(404);
      expect((await send('DELETE', `/crops/${foreign.id}`)).status).toBe(404);
      expect(await names('?q=alheia')).toEqual([]);
      expect((await send('PATCH', '/crops/nao-e-uuid', { name: 'X' })).status).toBe(404);
    });
  });

  describe('listagem', () => {
    let listed: Entry[];

    beforeAll(async () => {
      const listTenant = await createTenant(db, 'cadastros-lista');
      await createMembership(db, manager.id, listTenant.id);
      await createLinkedAccessProfile(db, listTenant.id, manager.id, 'Gestor da lista', {
        permissions: ['configuracoes.gerenciar'],
      });
      tenant = listTenant;
      listed = [];
      for (const name of ['Algodão', 'Água-de-coco', 'Abacaxi', 'Cana-de-açúcar', 'Milho']) listed.push(await createOk(name));
      await send('PATCH', `/crops/${listed[4]!.id}`, { active: false });
    });

    it('ordena em ordem alfabética pt-BR: "Água" entre "Abacaxi" e "Algodão"', async () => {
      expect(await names()).toEqual(['Abacaxi', 'Água-de-coco', 'Algodão', 'Cana-de-açúcar', 'Milho']);
      expect(await names('?sort=-name')).toEqual(['Milho', 'Cana-de-açúcar', 'Algodão', 'Água-de-coco', 'Abacaxi']);
    });

    it('pagina com total correto', async () => {
      const page = await list('?pageSize=25');
      expect(page).toMatchObject({ total: 5, page: 1, pageSize: 25 });
      expect(await names('?page=2&pageSize=25')).toEqual([]);
      expect((await list('?page=2&pageSize=25')).total).toBe(5);
    });

    it('acha "Cana-de-açúcar" buscando "acucar"', async () => {
      expect(await names('?q=acucar')).toEqual(['Cana-de-açúcar']);
    });

    it('filtra por situação', async () => {
      expect(await names('?status=inactive')).toEqual(['Milho']);
      expect(await names('?status=active')).toHaveLength(4);
      expect(await names('?status=all')).toHaveLength(5);
    });

    it('recusa ordenação e tamanho de página fora do contrato', async () => {
      expect((await send('GET', '/crops?sort=active')).status).toBe(400);
      expect((await send('GET', '/crops?pageSize=7')).status).toBe(400);
      expect((await send('GET', '/crops?status=x')).status).toBe(400);
    });
  });
});
