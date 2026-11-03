// Leitura de opções dos cadastros auxiliares por HTTP, contra o Postgres real.
import { createDatabase, createPool } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
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

interface Option {
  id: string;
  name: string;
  active: boolean;
}

interface OptionsPage {
  items: Option[];
  nextCursor?: string;
}

describe('opções dos cadastros auxiliares', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let brokerCookie: string;
  let otherCookie: string;
  const ids: Record<string, string> = {};

  const options = async (query = '', vocabulary = 'crops', cookie = brokerCookie, slug = tenant.slug) =>
    app.request(`/e/${slug}/settings/vocabularies/${vocabulary}/options${query}`, { headers: { cookie } });
  const page = async (query = '', cookie = brokerCookie) => (await options(query, 'crops', cookie)).json() as Promise<OptionsPage>;
  const names = async (query = '') => (await page(query)).items.map((option) => option.name);

  beforeAll(async () => {
    tenant = await createTenant(db, 'opcoes');
    otherTenant = await createTenant(db, 'opcoes-alheia');
    const manager = await createUserWithPassword(db, 'Gestora');
    const broker = await createUserWithPassword(db, 'Corretor');
    const otherManager = await createUserWithPassword(db, 'Gestor da outra');
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

    const base = `/e/${tenant.slug}/settings/vocabularies/crops`;
    for (const name of ['Soja', 'Água-de-coco', 'Milho', 'Abacaxi', 'Cana-de-açúcar']) {
      const response = await app.request(base, jsonRequest('POST', { name }, managerCookie));
      ids[name] = ((await response.json()) as Option).id;
    }
    for (const name of ['Café', 'Algodão']) {
      const created = await app.request(base, jsonRequest('POST', { name }, managerCookie));
      ids[name] = ((await created.json()) as Option).id;
      await app.request(`${base}/${ids[name]}`, jsonRequest('PATCH', { active: false }, managerCookie));
    }
    await app.request(
      `/e/${otherTenant.slug}/settings/vocabularies/crops`,
      jsonRequest('POST', { name: 'Da outra empresa' }, otherCookie),
    );
  });

  afterAll(() => pool.end());

  it('sem includeInactive, não traz inativas, em ordem alfabética pt-BR', async () => {
    expect(await names()).toEqual(['Abacaxi', 'Água-de-coco', 'Cana-de-açúcar', 'Milho', 'Soja']);
  });

  it('com includeInactive, traz as inativas marcadas e depois das ativas', async () => {
    const { items } = await page('?includeInactive=true');
    expect(items.map((option) => [option.name, option.active])).toEqual([
      ['Abacaxi', true],
      ['Água-de-coco', true],
      ['Cana-de-açúcar', true],
      ['Milho', true],
      ['Soja', true],
      ['Algodão', false],
      ['Café', false],
    ]);
  });

  it('ids hidrata entrada inativa, mesmo sem includeInactive', async () => {
    const { items } = await page(`?ids=${ids['Café']},${ids['Soja']}`);
    expect(items.map((option) => [option.name, option.active])).toEqual([
      ['Soja', true],
      ['Café', false],
    ]);
  });

  it('ids de outra empresa ou inexistente não voltam', async () => {
    expect((await page(`?ids=${crypto.randomUUID()}`)).items).toEqual([]);
    expect((await options('?ids=nao-e-uuid')).status).toBe(400);
  });

  it('busca ignorando caixa e acento', async () => {
    expect(await names('?q=acucar')).toEqual(['Cana-de-açúcar']);
    expect(await names('?q=AGUA')).toEqual(['Água-de-coco']);
  });

  it('pagina por cursor sem repetir nem perder entrada', async () => {
    const first = await page('?includeInactive=true&limit=3');
    expect(first.items).toHaveLength(3);
    expect(first.nextCursor).toBeDefined();
    const second = await page(`?includeInactive=true&limit=3&cursor=${first.nextCursor}`);
    const third = await page(`?includeInactive=true&limit=3&cursor=${second.nextCursor}`);
    expect(third.nextCursor).toBeUndefined();
    expect([...first.items, ...second.items, ...third.items].map((option) => option.name)).toEqual([
      'Abacaxi',
      'Água-de-coco',
      'Cana-de-açúcar',
      'Milho',
      'Soja',
      'Algodão',
      'Café',
    ]);
  });

  it('usuário sem configuracoes.gerenciar lê as opções', async () => {
    expect((await options('', 'crops', brokerCookie)).status).toBe(200);
  });

  it('só traz opções da empresa ativa', async () => {
    expect(await names()).not.toContain('Da outra empresa');
  });

  it('cadastro fora do registro é 404 e quem não é da empresa não a enxerga', async () => {
    expect((await options('', 'inexistente')).status).toBe(404);
    expect((await options('', 'crops', otherCookie)).status).toBe(404);
  });

  it('cursor ou limite inválidos são 400', async () => {
    expect((await options('?cursor=abc')).status).toBe(400);
    expect((await options('?limit=0')).status).toBe(400);
  });
});
