// Busca de municípios por HTTP, contra o Postgres real com a carga do IBGE
// aplicada pelas migrations e o mesmo `createApp` de produção.
import { createDatabase, createPool } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { loginAs } from '../../support/http.js';
import { asSuperuser } from '../../support/superuser.js';

const env = loadApiEnv();

interface Item {
  ibgeCode: string;
  name: string;
  uf: string;
  active: boolean;
}

interface Page {
  items: Item[];
  nextCursor?: string;
}

interface UfItem {
  uf: string;
}

interface PageWithUfs {
  items: Array<Item | UfItem>;
  nextCursor?: string;
}

describe('rota de busca de municípios', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let slug: string;
  let cookie: string;

  const get = (query: string, headers: Record<string, string> = { cookie }) =>
    app.request(`/e/${slug}/municipalities${query}`, { headers });

  const search = async (query: string): Promise<Page> => {
    const response = await get(query);
    expect(response.status).toBe(200);
    return (await response.json()) as Page;
  };

  const searchWithUfs = async (query: string): Promise<PageWithUfs> => {
    const response = await get(query);
    expect(response.status).toBe(200);
    return (await response.json()) as PageWithUfs;
  };

  /** Todas as páginas da busca, na ordem. */
  const searchAll = async (query: string): Promise<Item[]> => {
    const items: Item[] = [];
    let cursor: string | undefined;
    do {
      const page = await search(`${query}${cursor ? `&cursor=${cursor}` : ''}`);
      items.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    return items;
  };

  const label = ({ name, uf }: Item) => `${name} — ${uf}`;

  beforeAll(async () => {
    const tenant = await createTenant(db, 'municipios');
    slug = tenant.slug;
    const user = await createUserWithPassword(db, 'Bruna Busca');
    await createMembership(db, user.id, tenant.id, { isDefault: true });
    cookie = await loginAs(app, user);
  });

  afterAll(() => pool.end());

  describe('texto', () => {
    it('"rio verde" traz Rio Verde — GO antes de Rio Verde de Mato Grosso — MS', async () => {
      const { items } = await search('?q=rio%20verde');
      const labels = items.map(label);

      expect(labels[0]).toBe('Rio Verde — GO');
      expect(labels.indexOf('Rio Verde — GO')).toBeLessThan(labels.indexOf('Rio Verde de Mato Grosso — MS'));
    });

    it('os que começam pelo termo vêm antes dos que o têm no meio', async () => {
      const { items } = await search('?q=rio%20verde');
      const firstInTheMiddle = items.findIndex(({ name }) => !name.toLowerCase().startsWith('rio verde'));
      const lastAtTheStart = items.findLastIndex(({ name }) => name.toLowerCase().startsWith('rio verde'));

      expect(firstInTheMiddle === -1 || lastAtTheStart < firstInTheMiddle).toBe(true);
    });

    it('"sao jose" ignora acento e acha os "São José"', async () => {
      const items = await searchAll('?q=sao%20jose');

      expect(items.length).toBeGreaterThan(0);
      expect(items.every(({ name }) => /s[aã]o jos[eé]/i.test(name))).toBe(true);
    });

    it('acha o termo no meio do nome, depois dos que começam por ele', async () => {
      const items = await searchAll('?q=verde');
      const startsWith = items.map(({ name }) => name.toLowerCase().startsWith('verde'));

      expect(startsWith).toContain(false);
      expect(startsWith.indexOf(false)).toBeGreaterThan(startsWith.lastIndexOf(true));
    });

    it('ignora a caixa', async () => {
      expect((await search('?q=RIO%20VERDE')).items.map(label)).toEqual((await search('?q=rio%20verde')).items.map(label));
    });

    it('"bom jesus go" traz só o de Goiás', async () => {
      const { items } = await search('?q=bom%20jesus%20go');

      expect(items.map(label)).toContain('Bom Jesus de Goiás — GO');
      expect(items.every(({ uf }) => uf === 'GO')).toBe(true);
    });

    it('"go" sozinho busca por nome, não filtra por UF', async () => {
      const { items } = await search('?q=go');

      expect(items.length).toBeGreaterThan(0);
      expect(items.every(({ name }) => name.toLowerCase().includes('go'))).toBe(true);
      expect(items.some(({ uf }) => uf !== 'GO')).toBe(true);
    });

    it('o filtro explícito de uf recorta a busca', async () => {
      const { items } = await search('?q=bom%20jesus&uf=GO');

      expect(items.length).toBeGreaterThan(0);
      expect(items.every(({ uf }) => uf === 'GO')).toBe(true);
    });

    it('sem texto, lista os ativos por nome', async () => {
      const { items, nextCursor } = await search('');

      expect(items).toHaveLength(20);
      expect(nextCursor).toBeDefined();
    });

    it('só com uf, lista a UF inteira', async () => {
      const items = await searchAll('?uf=GO');

      expect(items.length).toBeGreaterThan(200);
      expect(items.every(({ uf }) => uf === 'GO')).toBe(true);
    });

    it('com uf explícito, a sigla no fim do texto segue sendo parte do nome', async () => {
      const { items } = await search('?q=bom%20jesus%20go&uf=MG');

      expect(items).toEqual([]);
    });

    it('os itens têm a forma de municipalityOptionSchema mais active', async () => {
      const { items } = await search('?q=rio%20verde');

      expect(items[0]).toEqual({ ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true });
    });
  });

  describe('inativos e ids', () => {
    const CODE = '5218805';

    const setActive = (active: boolean) =>
      asSuperuser((client) => client.query('update municipalities set active = $1 where ibge_code = $2', [active, CODE]));

    beforeAll(() => setActive(false));
    afterAll(() => setActive(true));

    it('município inativo não aparece na busca', async () => {
      const { items } = await search('?q=rio%20verde');

      expect(items.map(({ ibgeCode }) => ibgeCode)).not.toContain(CODE);
    });

    it('ids devolve exatamente os pedidos, ativos ou não', async () => {
      const { items, nextCursor } = await search(`?ids=${CODE},3550308`);

      expect(items.map(({ ibgeCode, active }) => [ibgeCode, active])).toEqual([
        ['3550308', true],
        [CODE, false],
      ]);
      expect(nextCursor).toBeUndefined();
    });
  });

  describe('paginação', () => {
    it('o cursor percorre todas as páginas de "sa" sem repetir nem pular', async () => {
      const seen: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      do {
        const page = await search(`?q=sa${cursor ? `&cursor=${cursor}` : ''}`);
        expect(page.items.length).toBeLessThanOrEqual(20);
        seen.push(...page.items.map(({ ibgeCode }) => ibgeCode));
        cursor = page.nextCursor;
        pages += 1;
      } while (cursor);

      const { rows } = await asSuperuser((client) =>
        client.query<{ count: number }>(
          `select count(*)::int as count from municipalities where active and unaccent(name) ilike '%sa%'`,
        ),
      );
      const count = rows[0]?.count;
      expect(pages).toBeGreaterThan(1);
      expect(new Set(seen).size).toBe(seen.length);
      expect(seen.length).toBe(count);
    });
  });

  describe('UFs incluídas', () => {
    it('"goias" antecipa Goiás na primeira página', async () => {
      const { items } = await searchWithUfs('?q=goias&includeUf=true');

      expect(items[0]).toEqual({ uf: 'GO' });
    });

    it('a sigla encontra a UF, mas sem includeUf a resposta só traz municípios', async () => {
      expect((await searchWithUfs('?q=go&includeUf=true')).items[0]).toEqual({ uf: 'GO' });
      expect((await searchWithUfs('?q=go')).items.every((item) => 'ibgeCode' in item)).toBe(true);
    });

    it('com filtro de UF, só a UF filtrada pode vir no topo', async () => {
      expect((await searchWithUfs('?q=goias&uf=SP&includeUf=true')).items).toEqual([]);
      expect((await searchWithUfs('?q=goias&uf=GO&includeUf=true')).items[0]).toEqual({ uf: 'GO' });
    });

    it('UF só vem na primeira página e não altera a paginação dos municípios', async () => {
      const included: Item[] = [];
      let cursor: string | undefined;
      let firstPage = true;
      let page: PageWithUfs;

      do {
        page = await searchWithUfs(`?q=go&includeUf=true${cursor ? `&cursor=${cursor}` : ''}`);
        if (!firstPage) expect(page.items.every((item) => 'ibgeCode' in item)).toBe(true);
        included.push(...page.items.filter((item): item is Item => 'ibgeCode' in item));
        cursor = page.nextCursor;
        firstPage = false;
      } while (cursor);

      expect(included).toEqual(await searchAll('?q=go'));
    });
  });

  describe('acesso', () => {
    it('sem sessão é 401', async () => {
      expect((await get('?q=rio', {})).status).toBe(401);
    });

    it('sem vínculo com a empresa é 404', async () => {
      const stranger = await createUserWithPassword(db, 'Sem Vínculo');

      expect((await get('?q=rio', { cookie: await loginAs(app, stranger) })).status).toBe(404);
    });
  });

  describe('requisição inválida', () => {
    it.each([
      ['uf fora da lista', '?uf=XX'],
      ['código com menos de sete dígitos', '?ids=123456'],
      ['código com letras', '?ids=5218805,abcdefg'],
      ['cursor não emitido pela API', '?q=sa&cursor=lixo'],
      ['cursor zero, que a API nunca emite', '?q=sa&cursor=MA'],
    ])('%s é 400', async (_name, query) => {
      expect((await get(query)).status).toBe(400);
    });
  });
});
