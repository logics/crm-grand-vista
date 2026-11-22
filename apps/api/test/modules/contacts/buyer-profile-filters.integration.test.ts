// Filtros do perfil de compra na lista de contatos (`GET /contacts`), contra o
// Postgres real: perfil de compra, grau de qualificação, urgência, cultura e região
// com cobertura nos dois sentidos; combinação, total e isolamento entre empresas.
import { auditedWrites, createDatabase, createPool, crops, purchaseProfiles, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

const RIO_VERDE = '5218805'; // GO
const JATAI = '5211909'; // GO
const UBERABA = '3170206'; // MG

interface ListBody {
  items: { name: string }[];
  total: number;
  error?: { message: string };
}

describe('filtros do perfil de compra na lista de contatos', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let cookie: string;
  let otherCookie: string;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;
  let investor: string;
  let producer: string;
  let soy: string;
  let corn: string;

  const list = async (query: string, as: { slug: string; cookie: string } = { slug: tenant.slug, cookie }) => {
    const response = await app.request(`/e/${as.slug}/contacts?${query}`, { headers: { cookie: as.cookie } });
    return { status: response.status, body: (await response.json()) as ListBody };
  };
  const names = async (query: string) => (await list(query)).body.items.map((item) => item.name).sort();

  const create = async (
    name: string,
    buyerProfile: Record<string, unknown> | null,
    roles: string[] = ['buyer'],
    as = { slug: tenant.slug, cookie },
  ) => {
    const response = await app.request(
      `/e/${as.slug}/contacts`,
      jsonRequest('POST', { personType: 'pf', name, roles, ...(buyerProfile ? { buyerProfile } : {}) }, as.cookie),
    );
    expect(response.status).toBe(201);
  };

  async function provision(slug: string, vocabulary: boolean) {
    const created = await createTenant(db, slug);
    const user = await createUserWithPassword(db, `Gestora ${slug}`);
    await createMembership(db, user.id, created.id, { isDefault: true });
    const ids: string[] = [];
    await db.withTenant(created.id, async (tx) => {
      const profiles = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: created.id, userId: null }), created.id);
      await tx.insert(userProfiles).values({ tenantId: created.id, userId: user.id, profileId: profiles.get('Admin')! });
      if (!vocabulary) return;
      const purchase = await tx
        .insert(purchaseProfiles)
        .values([
          { tenantId: created.id, name: 'Investidor' },
          { tenantId: created.id, name: 'Produtor' },
        ])
        .returning();
      const cropRows = await tx
        .insert(crops)
        .values([
          { tenantId: created.id, name: 'Soja' },
          { tenantId: created.id, name: 'Milho' },
        ])
        .returning();
      ids.push(...purchase.map((row) => row.id), ...cropRows.map((row) => row.id));
    });
    return { created, cookie: await loginAs(app, user), ids };
  }

  beforeAll(async () => {
    const main = await provision('contatos-filtros-perfil', true);
    tenant = main.created;
    cookie = main.cookie;
    [investor, producer, soy, corn] = main.ids as [string, string, string, string];

    // Contatos sem perfil de fora, para o total contar só o que casa.
    await create('Ana', { purchaseProfileId: investor, qualificationLevel: 'hot', urgency: 'high', cropIds: [soy] });
    await create('Bia', { purchaseProfileId: investor, qualificationLevel: 'qualified', urgency: 'low', cropIds: [corn] });
    await create('Caio', { purchaseProfileId: producer, qualificationLevel: 'hot', urgency: 'high', cropIds: [soy, corn] });
    await create('Duda', { purchaseProfileId: producer, qualificationLevel: 'cold', urgency: 'medium' });
    await create('Eva', { purchaseProfileId: investor, qualificationLevel: 'hot', urgency: 'high', cropIds: [soy] }, [
      'buyer',
      'owner',
    ]);
    for (let n = 0; n < 10; n += 1) await create(`Sem perfil ${n}`, null);

    await create('Região GO', { regions: [{ uf: 'GO' }] });
    await create('Região Rio Verde', { regions: [{ ibgeCode: RIO_VERDE }] });
    await create('Região Jataí', { regions: [{ ibgeCode: JATAI }] });
    await create('Região MG', { regions: [{ uf: 'MG' }] });
    await create('Região Uberaba', { regions: [{ ibgeCode: UBERABA }] });

    const other = await provision('contatos-filtros-perfil-outra', true);
    otherTenant = other.created;
    otherCookie = other.cookie;
    const [otherInvestor, , otherSoy] = other.ids as [string, string, string, string];
    await create(
      'Outra empresa',
      {
        purchaseProfileId: otherInvestor,
        qualificationLevel: 'hot',
        urgency: 'high',
        cropIds: [otherSoy],
        regions: [{ uf: 'GO' }],
      },
      ['buyer'],
      { slug: otherTenant.slug, cookie: otherCookie },
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it('perfil de compra: qualquer um dos escolhidos', async () => {
    expect(await names(`purchaseProfileId=${investor}`)).toEqual(['Ana', 'Bia', 'Eva']);
    expect(await names(`purchaseProfileId=${investor},${producer}`)).toEqual(['Ana', 'Bia', 'Caio', 'Duda', 'Eva']);
  });

  it('grau de qualificação e urgência: qualquer um dos escolhidos', async () => {
    expect(await names('qualificationLevel=hot')).toEqual(['Ana', 'Caio', 'Eva']);
    expect(await names('qualificationLevel=hot,qualified')).toEqual(['Ana', 'Bia', 'Caio', 'Eva']);
    expect(await names('urgency=low,medium')).toEqual(['Bia', 'Duda']);
  });

  it('cultura: qualquer uma das escolhidas, sem repetir quem tem as duas', async () => {
    expect(await names(`cropId=${soy}`)).toEqual(['Ana', 'Caio', 'Eva']);
    const both = await list(`cropId=${soy},${corn}`);
    expect(both.body.items.map((item) => item.name).sort()).toEqual(['Ana', 'Bia', 'Caio', 'Eva']);
    expect(both.body.total).toBe(4);
  });

  it('combina os filtros entre si e com papel (E), com o total correto', async () => {
    const combined = await list(`purchaseProfileId=${investor}&qualificationLevel=hot&urgency=high&cropId=${soy}`);
    expect(combined.body.items.map((item) => item.name).sort()).toEqual(['Ana', 'Eva']);
    expect(combined.body.total).toBe(2);
    const withRole = await list(`purchaseProfileId=${investor}&role=owner`);
    expect(withRole.body.items.map((item) => item.name)).toEqual(['Eva']);
    expect(withRole.body.total).toBe(1);
    expect((await list(`qualificationLevel=cold&cropId=${soy}`)).body.total).toBe(0);
  });

  it('total sem filtro conta só os contatos da empresa (20)', async () => {
    expect((await list('limit=1')).body.total).toBe(20);
  });

  it('região UF: traz quem marcou a UF e quem marcou município dela', async () => {
    expect(await names('region=GO')).toEqual(['Região GO', 'Região Jataí', 'Região Rio Verde']);
  });

  it('região município: traz o município e a UF dele, não outro município da UF nem outra UF', async () => {
    expect(await names(`region=${RIO_VERDE}`)).toEqual(['Região GO', 'Região Rio Verde']);
  });

  it('várias regiões casam com qualquer uma; combina com papel', async () => {
    expect(await names(`region=${RIO_VERDE},MG`)).toEqual(['Região GO', 'Região MG', 'Região Rio Verde', 'Região Uberaba']);
    expect((await list(`region=GO&role=owner`)).body.total).toBe(0);
  });

  it.each(['XX', '123', 'GO,', '5218805,ZZ', ''])('região malformada (%j) é 400', async (region) => {
    const { status } = await list(`region=${region}`);
    expect(status).toBe(400);
  });

  it.each(['purchaseProfileId=x', 'qualificationLevel=ardente', 'urgency=nenhuma', 'cropId=x'])('%s é 400', async (query) => {
    expect((await list(query)).status).toBe(400);
  });

  it('não enxerga perfis de outra empresa', async () => {
    expect(await names('qualificationLevel=hot')).not.toContain('Outra empresa');
    expect(await names('region=GO')).not.toContain('Outra empresa');
    expect(await names(`cropId=${soy}`)).not.toContain('Outra empresa');
    const theirs = await list('qualificationLevel=hot', { slug: otherTenant.slug, cookie: otherCookie });
    expect(theirs.body.items.map((item) => item.name)).toEqual(['Outra empresa']);
    expect(theirs.body.total).toBe(1);
  });
});
