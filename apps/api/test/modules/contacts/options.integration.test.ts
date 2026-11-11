// `GET /contacts/options` por HTTP, contra o Postgres real: o papel ordena e não
// filtra, `ids` hidrata e, sem `contatos.ver`, só o nome atravessa.
import { createDatabase, createPool } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { createLinkedAccessProfile, createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

interface OptionBody {
  id: string;
  name: string;
  personType: string | null;
  taxId: string | null;
  roles: string[];
}
interface OptionsBody {
  items: OptionBody[];
  nextCursor?: string;
}

describe('contatos: opções do seletor', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let linkedOnlyCookie: string;
  let outsiderCookie: string;

  const options = async (query: Record<string, string>, cookie = managerCookie, slug = tenant.slug) => {
    const response = await app.request(`/e/${slug}/contacts/options?${new URLSearchParams(query)}`, { headers: { cookie } });
    return { status: response.status, body: (await response.json()) as OptionsBody };
  };
  const create = async (body: Record<string, unknown>) => {
    const response = await app.request(`/e/${tenant.slug}/contacts`, jsonRequest('POST', body, managerCookie));
    return (await response.json()) as OptionBody;
  };

  beforeAll(async () => {
    tenant = await createTenant(db, 'contatos-opcoes');
    other = await createTenant(db, 'contatos-opcoes-alheia');
    const [manager, linkedOnly, outsider] = await Promise.all(
      ['Gestora', 'Sem contatos.ver', 'De outra empresa'].map((name) => createUserWithPassword(db, name)),
    );
    await createMembership(db, manager!.id, tenant.id, { isDefault: true });
    await createMembership(db, linkedOnly!.id, tenant.id, { isDefault: true });
    await createMembership(db, outsider!.id, other.id, { isDefault: true });
    await createLinkedAccessProfile(db, tenant.id, manager!.id, 'Admin', {
      permissions: ['contatos.ver', 'contatos.criar', 'contatos.editar', 'contatos.excluir'],
    });
    await createLinkedAccessProfile(db, tenant.id, linkedOnly!.id, 'Sem nada');
    await createLinkedAccessProfile(db, other.id, outsider!.id, 'Admin', { permissions: ['contatos.ver', 'contatos.criar'] });
    managerCookie = await loginAs(app, manager!);
    linkedOnlyCookie = await loginAs(app, linkedOnly!);
    outsiderCookie = await loginAs(app, outsider!);
  });

  afterAll(() => pool.end());

  it('role ordena: quem tem o papel vem primeiro, depois os demais, cada grupo por nome', async () => {
    await create({ personType: 'pf', name: 'Zuleica Dona', roles: ['owner'] });
    await create({ personType: 'pf', name: 'Álvaro Comprador', roles: ['buyer'] });
    await create({ personType: 'pf', name: 'Beto Dono', roles: ['owner'] });
    await create({ personType: 'pf', name: 'Carlos Comprador', roles: ['buyer'] });

    const { status, body } = await options({ role: 'owner' });

    expect(status).toBe(200);
    expect(body.items.map((item) => item.name)).toEqual(['Beto Dono', 'Zuleica Dona', 'Álvaro Comprador', 'Carlos Comprador']);
    expect(body.items[0]).toMatchObject({ personType: 'pf', roles: ['owner'] });
  });

  it('sem role, ordena só por nome', async () => {
    const { body } = await options({});
    expect(body.items.map((item) => item.name)).toEqual(['Álvaro Comprador', 'Beto Dono', 'Carlos Comprador', 'Zuleica Dona']);
  });

  it('a busca por termo ignora caixa e acento e respeita a ordem do papel', async () => {
    await create({ personType: 'pf', name: 'João Comprador', roles: ['buyer'] });
    await create({ personType: 'pf', name: 'João Dono', roles: ['owner'] });

    const { body } = await options({ q: 'JOAO', role: 'owner' });

    expect(body.items.map((item) => item.name)).toEqual(['João Dono', 'João Comprador']);
  });

  it('a busca acha pelo documento digitado com pontuação', async () => {
    const contact = await create({ personType: 'pf', name: 'Com Documento', roles: ['buyer'], taxId: '529.982.247-25' });

    const { body } = await options({ q: '529.982.247-25' });

    expect(body.items.map((item) => item.id)).toEqual([contact.id]);
  });

  it('pagina por cursor sem repetir nem perder contato', async () => {
    const first = await options({ role: 'buyer', limit: '2' });
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeDefined();

    const names = first.body.items.map((item) => item.name);
    let cursor = first.body.nextCursor;
    while (cursor) {
      const page = await options({ role: 'buyer', limit: '2', cursor });
      names.push(...page.body.items.map((item) => item.name));
      cursor = page.body.nextCursor;
    }

    const all = (await options({ role: 'buyer', limit: '50' })).body.items.map((item) => item.name);
    expect(names).toEqual(all);
    expect(new Set(names).size).toBe(names.length);
  });

  it('ids hidrata, em qualquer papel', async () => {
    const owner = await create({ personType: 'pj', name: 'Agro Hidratada', roles: ['owner'], taxId: '11.222.333/0001-81' });
    const buyer = await create({ personType: 'pf', name: 'Hidratado Comprador', roles: ['buyer'] });

    const { status, body } = await options({ ids: `${owner.id},${buyer.id}`, role: 'buyer' });

    expect(status).toBe(200);
    expect(body.items.map((item) => item.id).sort()).toEqual([owner.id, buyer.id].sort());
    expect(body.items.find((item) => item.id === owner.id)).toMatchObject({ personType: 'pj', taxId: '11222333000181' });
  });

  it('sem contatos.ver, ids devolve só id e nome', async () => {
    const owner = await create({
      personType: 'pf',
      name: 'Só o Nome',
      roles: ['owner'],
      taxId: '111.444.777-35',
      phone: '64981110099',
    });

    const { status, body } = await options({ ids: owner.id }, linkedOnlyCookie);

    expect(status).toBe(200);
    expect(body.items).toEqual([{ id: owner.id, name: 'Só o Nome', personType: null, taxId: null, roles: [] }]);
  });

  it('sem contatos.ver, a busca por termo é 403 — com ou sem termo', async () => {
    expect((await options({ q: 'Só' }, linkedOnlyCookie)).status).toBe(403);
    expect((await options({}, linkedOnlyCookie)).status).toBe(403);
  });

  it('contato de outra empresa não aparece nem hidrata', async () => {
    const mine = await create({ personType: 'pf', name: 'Só desta empresa', roles: ['owner'] });

    expect((await options({ q: 'Só desta' }, outsiderCookie, other.slug)).body.items).toEqual([]);
    expect((await options({ ids: mine.id }, outsiderCookie, other.slug)).body.items).toEqual([]);
  });

  it.each([
    ['papel desconhecido', { role: 'rei' }],
    ['id malformado', { ids: 'x' }],
    ['cursor malformado', { cursor: 'x' }],
    ['limite acima do máximo', { limit: '999' }],
  ])('%s é 400', async (_label, query) => {
    expect((await options(query)).status).toBe(400);
  });
});
