// `GET /farms/options` por HTTP, contra o Postgres real: escopo de dados, busca
// sem desativadas, hidratação por `ids` (desativadas inclusive) e paginação.
import { auditedWrites, commercialStatuses, createDatabase, createPool, farms, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createLinkedAccessProfile, createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { loginAs } from '../../support/http.js';

const env = loadApiEnv();

const RIO_VERDE = '5218805';
const GOIANIA = '5208707';

interface OptionsBody {
  items: { id: string; name: string; municipality: { ibgeCode: string; name: string; uf: string }; totalAreaHa: string }[];
  nextCursor?: string;
}

describe('fazendas: opções do seletor', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let brokerCookie: string;
  let noViewCookie: string;
  let farmIds: Record<string, string>;

  const options = async (query: Record<string, string>, cookie = managerCookie) => {
    const response = await app.request(`/e/${tenant.slug}/farms/options?${new URLSearchParams(query)}`, { headers: { cookie } });
    return { status: response.status, body: (await response.json()) as OptionsBody };
  };
  const nameList = (body: OptionsBody) => body.items.map((item) => item.name);

  beforeAll(async () => {
    tenant = await createTenant(db, 'fazendas-opcoes');
    const [manager, broker, noView] = await Promise.all(['Gestora', 'Corretor', 'Sem fazendas.ver'].map((name) => createUserWithPassword(db, name)));
    for (const user of [manager!, broker!, noView!]) await createMembership(db, user.id, tenant.id, { isDefault: true });
    await createLinkedAccessProfile(db, tenant.id, noView!.id, 'Sem nada');

    await db.withTenant(tenant.id, async (tx) => {
      const profiles = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: manager!.id, profileId: profiles.get('Gestor')! },
        { tenantId: tenant.id, userId: broker!.id, profileId: profiles.get('Corretor')! },
      ]);
      const [available, deactivated] = await tx
        .insert(commercialStatuses)
        .values([
          { tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 },
          { tenantId: tenant.id, name: 'Desativada', systemMeaning: 'inactive', displayOrder: 1 },
        ])
        .returning();
      const base = { tenantId: tenant.id, totalAreaHa: '100', commercialStatusId: available!.id };
      const rows = await tx
        .insert(farms)
        .values([
          { ...base, name: 'Fazenda Santa Rita', municipalityIbgeCode: RIO_VERDE, responsibleUserId: broker!.id },
          { ...base, name: 'Santa Fé', municipalityIbgeCode: GOIANIA, responsibleUserId: manager!.id },
          { ...base, name: 'Fazenda Boa Vista', municipalityIbgeCode: RIO_VERDE, responsibleUserId: manager!.id },
          { ...base, name: 'Fazenda Santa Antiga', municipalityIbgeCode: RIO_VERDE, responsibleUserId: manager!.id, commercialStatusId: deactivated!.id },
        ])
        .returning();
      farmIds = Object.fromEntries(rows.map((row) => [row.name, row.id]));
    });

    managerCookie = await loginAs(app, manager!);
    brokerCookie = await loginAs(app, broker!);
    noViewCookie = await loginAs(app, noView!);
  });

  afterAll(() => pool.end());

  it('com escopo own não traz fazendas alheias, nem por ids', async () => {
    expect(nameList((await options({}, brokerCookie)).body)).toEqual(['Fazenda Santa Rita']);

    const byIds = await options({ ids: `${farmIds['Fazenda Santa Rita']},${farmIds['Santa Fé']}` }, brokerCookie);
    expect(nameList(byIds.body)).toEqual(['Fazenda Santa Rita']);
  });

  it('não traz desativadas na busca e as devolve por ids', async () => {
    expect(nameList((await options({ q: 'santa' })).body)).toEqual(['Fazenda Santa Rita', 'Santa Fé']);

    const hydrated = await options({ ids: farmIds['Fazenda Santa Antiga']! });
    expect(hydrated.body.items).toMatchObject([
      { id: farmIds['Fazenda Santa Antiga'], name: 'Fazenda Santa Antiga', municipality: { name: 'Rio Verde', uf: 'GO' }, totalAreaHa: '100.0000' },
    ]);
  });

  it('busca sem caixa nem acento, também pelo município, e pagina por cursor sem repetir', async () => {
    expect(nameList((await options({ q: 'SÂNTA' })).body)).toEqual(['Fazenda Santa Rita', 'Santa Fé']);
    expect(nameList((await options({ q: 'goiania' })).body)).toEqual(['Santa Fé']);

    const first = await options({ limit: '2' });
    expect(nameList(first.body)).toEqual(['Fazenda Boa Vista', 'Fazenda Santa Rita']);
    expect(first.body.nextCursor).toBeDefined();
    const second = await options({ limit: '2', cursor: first.body.nextCursor! });
    expect(nameList(second.body)).toEqual(['Santa Fé']);
    expect(second.body.nextCursor).toBeUndefined();
  });

  it('parâmetro malformado é 400 e sem fazendas.ver é 403', async () => {
    expect((await options({ limit: '500' })).status).toBe(400);
    expect((await options({ ids: 'nao-e-uuid' })).status).toBe(400);
    expect((await options({ cursor: 'abc' })).status).toBe(400);
    expect((await options({}, noViewCookie)).status).toBe(403);
  });
});
