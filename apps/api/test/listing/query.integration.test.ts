// A consulta paginada contra o Postgres real, sobre `access_profiles` — tabela
// de negócio com nome de texto, sob RLS, que já existe. A prova numa rota de
// verdade é de `fase-1-configuracoes`, a primeira lista.
import { accessProfiles, createDatabase, createPool } from '@crm/db';
import { listQuerySchema } from '@crm/shared';
import { loadApiEnv } from '@crm/shared/env';
import { eq, ne } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withoutDataScope } from '../../src/authorization/data-scope.js';
import { defineList, paginatedQuery } from '../../src/listing/query.js';
import { createTenant } from '../support/fixtures.js';

const env = loadApiEnv();

const profiles = defineList({
  table: accessProfiles,
  sortable: { name: accessProfiles.name },
  defaultSort: 'name',
  searchable: [accessProfiles.name, accessProfiles.description],
});
const profilesQuery = listQuerySchema({ sortable: ['name'] });

const NAMES = ['João Silva', 'Joana Prado', 'MARIA JOÃO', 'Pedro', 'São José do Rio Claro', 'Desconto de 100%'];

describe('consulta paginada', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  let tenant: Awaited<ReturnType<typeof createTenant>>;

  const list = (params: Record<string, string>, scope = withoutDataScope) =>
    db.withTenant(tenant.id, (tx) => paginatedQuery(tx, profiles, profilesQuery.parse(params), { scope }));
  const namesOf = (page: { items: { name: string }[] }) => page.items.map((item) => item.name);

  beforeAll(async () => {
    tenant = await createTenant(db, 'listagem');
    const otherTenant = await createTenant(db, 'listagem-alheia');

    await db.withTenant(tenant.id, (tx) =>
      tx.insert(accessProfiles).values(NAMES.map((name) => ({ tenantId: tenant.id, name }))),
    );
    // Outra empresa com um "João": o RLS o deixa de fora dos itens e do total.
    await db.withTenant(otherTenant.id, (tx) =>
      tx.insert(accessProfiles).values({ tenantId: otherTenant.id, name: 'João de Outra Empresa' }),
    );
  });

  afterAll(() => pool.end());

  it('"joao" encontra "João" sem acento e sem caixa', async () => {
    const page = await list({ q: 'joao' });

    expect(namesOf(page)).toEqual(['João Silva', 'MARIA JOÃO']);
    expect(page.total).toBe(2);
  });

  it('"sao jose" encontra "São José do Rio Claro"', async () => {
    expect(namesOf(await list({ q: 'sao jose' }))).toEqual(['São José do Rio Claro']);
  });

  it('procura também nas demais colunas declaradas', async () => {
    await db.withTenant(tenant.id, (tx) =>
      tx.update(accessProfiles).set({ description: 'Equipe do Paraná' }).where(eq(accessProfiles.name, 'Pedro')),
    );

    expect(namesOf(await list({ q: 'parana' }))).toEqual(['Pedro']);
  });

  it('curinga digitado é procurado como texto', async () => {
    expect(namesOf(await list({ q: '100%' }))).toEqual(['Desconto de 100%']);
    expect(await list({ q: '_' })).toMatchObject({ items: [], total: 0 });
  });

  it('pagina na ordem pedida, com o total da empresa inteira', async () => {
    const ascending = await list({});
    const descending = await list({ sort: '-name', pageSize: '25' });

    expect(descending).toMatchObject({ total: NAMES.length, page: 1, pageSize: 25 });
    expect([...namesOf(ascending)].sort()).toEqual([...NAMES].sort());
    // A ordem exata é da collation do banco; a pedida é o inverso da padrão.
    expect(namesOf(descending)).toEqual(namesOf(ascending).reverse());
  });

  it('página além do fim devolve items vazio com o total verdadeiro', async () => {
    expect(await list({ page: '2' })).toEqual({ items: [], total: NAMES.length, page: 2, pageSize: 25 });
  });

  it('aplica o escopo de dados também no total', async () => {
    const page = await list({ q: 'joao' }, ne(accessProfiles.name, 'MARIA JOÃO'));

    expect(namesOf(page)).toEqual(['João Silva']);
    expect(page.total).toBe(1);
  });
});
