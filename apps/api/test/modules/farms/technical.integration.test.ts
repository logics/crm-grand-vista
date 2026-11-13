// Ficha técnica e comercial da fazenda por HTTP, contra o Postgres real: níveis,
// distâncias, coordenadas, aptidões e culturas (conjunto substituído por
// diferença, com os filhos no histórico) e as recusas que viram 400, nunca 500.
import {
  aptitudes,
  auditedWrites,
  commercialStatuses,
  createDatabase,
  createPool,
  crops,
  userProfiles,
} from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

interface FarmBody {
  id: string;
  commercialStatus: { id: string; name: string };
  aptitudes: { id: string; name: string }[];
  crops: { id: string; name: string }[];
  [key: string]: unknown;
}

interface HistoryBody {
  entries: { title: string; changes: unknown[]; children: { title: string }[] }[];
}

interface ErrorBody {
  error: { code: string; field?: string };
}

describe('fazendas: técnico e comercial', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let manager: Awaited<ReturnType<typeof createUserWithPassword>>;
  let broker: Awaited<ReturnType<typeof createUserWithPassword>>;
  let managerCookie: string;
  let brokerCookie: string;
  let available: string;
  let sold: string;
  let inactiveStatus: string;
  let agriculture: string;
  let livestock: string;
  let inactiveAptitude: string;
  let soy: string;
  let corn: string;
  let inactiveCrop: string;
  let foreignAptitude: string;
  let foreignCrop: string;

  const url = (path = '') => `/e/${tenant.slug}/farms${path}`;
  const body = (overrides: Record<string, unknown> = {}) => ({
    name: 'Fazenda Técnica',
    municipalityIbgeCode: '5218805',
    totalAreaHa: '1000',
    ...overrides,
  });
  const create = (payload: unknown, cookie = managerCookie) => app.request(url(), jsonRequest('POST', payload, cookie));
  const patch = (id: string, payload: unknown, cookie = managerCookie) =>
    app.request(url(`/${id}`), jsonRequest('PATCH', payload, cookie));
  const created = async (overrides: Record<string, unknown> = {}) => (await (await create(body(overrides))).json()) as FarmBody;
  const history = async (id: string) =>
    ((await (await app.request(url(`/${id}/history`), { headers: { cookie: managerCookie } })).json()) as HistoryBody).entries;
  const names = (items: { name: string }[]) => items.map((item) => item.name);

  beforeAll(async () => {
    tenant = await createTenant(db, 'fazendas-tecnico');
    other = await createTenant(db, 'fazendas-tecnico-alheia');
    manager = await createUserWithPassword(db, 'Gestora técnica');
    broker = await createUserWithPassword(db, 'Corretor técnico');
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await createMembership(db, broker.id, tenant.id, { isDefault: true });

    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: manager.id, profileId: ids.get('Gestor')! },
        { tenantId: tenant.id, userId: broker.id, profileId: ids.get('Corretor')! },
      ]);
      const statuses = await tx
        .insert(commercialStatuses)
        .values([
          { tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 },
          { tenantId: tenant.id, name: 'Vendida', systemMeaning: 'sold', displayOrder: 1 },
          { tenantId: tenant.id, name: 'Antiga', systemMeaning: 'suspended', displayOrder: 2, active: false },
        ])
        .returning();
      [available, sold, inactiveStatus] = statuses.map((row) => row.id) as [string, string, string];
      const apts = await tx
        .insert(aptitudes)
        .values([
          { tenantId: tenant.id, name: 'Agricultura' },
          { tenantId: tenant.id, name: 'Pecuária' },
          { tenantId: tenant.id, name: 'Silvicultura', active: false },
        ])
        .returning();
      [agriculture, livestock, inactiveAptitude] = apts.map((row) => row.id) as [string, string, string];
      const cs = await tx
        .insert(crops)
        .values([
          { tenantId: tenant.id, name: 'Soja' },
          { tenantId: tenant.id, name: 'Milho' },
          { tenantId: tenant.id, name: 'Algodão', active: false },
        ])
        .returning();
      [soy, corn, inactiveCrop] = cs.map((row) => row.id) as [string, string, string];
    });
    await db.withTenant(other.id, async (tx) => {
      const [apt] = await tx.insert(aptitudes).values({ tenantId: other.id, name: 'Agricultura' }).returning();
      const [crop] = await tx.insert(crops).values({ tenantId: other.id, name: 'Soja' }).returning();
      foreignAptitude = apt!.id;
      foreignCrop = crop!.id;
    });

    managerCookie = await loginAs(app, manager);
    brokerCookie = await loginAs(app, broker);
  });

  afterAll(() => pool.end());

  it('grava e devolve níveis, distâncias, situação documental, textos e coordenadas', async () => {
    const payload = {
      salesPotential: 'high',
      priority: 'medium',
      waterAvailability: 'high',
      irrigationPotential: 'low',
      productivePotential: 'medium',
      distanceToHighwayKm: '12.5',
      distanceToWarehouseKm: '40',
      documentStatus: 'pending',
      documentNotes: 'CAR em retificação',
      soil: 'Argiloso',
      topography: 'Plana',
      water: 'Rio e duas nascentes',
      historicalProductivity: '65 sc/ha',
      infrastructure: 'Sede e galpão',
      technicalSummary: 'Pronta para plantio',
      differentials: 'Asfalto até a porteira',
      latitude: '-17.7923000',
      longitude: '-50.9200000',
      aptitudeIds: [agriculture, livestock],
      cropIds: [soy, corn],
    };
    const response = await create(body(payload));

    expect(response.status).toBe(201);
    const farm = (await response.json()) as FarmBody;
    expect(farm).toMatchObject({
      ...Object.fromEntries(Object.entries(payload).filter(([key]) => !key.endsWith('Ids'))),
      distanceToHighwayKm: '12.50',
      distanceToWarehouseKm: '40.00',
    });
    expect(names(farm.aptitudes)).toEqual(['Agricultura', 'Pecuária']);
    expect(names(farm.crops)).toEqual(['Milho', 'Soja']);

    const read = (await (await app.request(url(`/${farm.id}`), { headers: { cookie: managerCookie } })).json()) as FarmBody;
    expect(read).toEqual(farm);

    const cleared = (await (await patch(farm.id, { salesPotential: null, soil: '  ' })).json()) as FarmBody;
    expect(cleared).toMatchObject({ salesPotential: null, soil: null, priority: 'medium' });
  });

  it('nível fora de LEVELS no corpo é 400, não 500', async () => {
    for (const field of ['salesPotential', 'priority', 'waterAvailability', 'irrigationPotential', 'productivePotential']) {
      expect((await create(body({ [field]: 'altissima' }))).status).toBe(400);
    }
    const farm = await created();
    expect((await patch(farm.id, { priority: 'altissima' })).status).toBe(400);
    expect((await patch(farm.id, { documentStatus: 'talvez' })).status).toBe(400);
    expect((await patch(farm.id, { distanceToHighwayKm: '-3' })).status).toBe(400);
  });

  it('latitude sem longitude é 400, na criação e na edição de um lado só', async () => {
    const onCreate = await create(body({ latitude: '-17.79' }));
    expect(onCreate.status).toBe(400);
    // O schema recusa no corpo (formato do validador); o serviço, contra o cadastro (`validation_error` com campo).
    expect(JSON.stringify(await onCreate.json())).toContain('Informe a latitude e a longitude juntas.');

    const farm = await created();
    // Só um lado no PATCH, contra uma fazenda sem coordenadas: o par ficaria incompleto.
    const oneSide = await patch(farm.id, { longitude: '-50.9' });
    expect(oneSide.status).toBe(400);
    expect(((await oneSide.json()) as ErrorBody).error.field).toBe('latitude');

    const both = await patch(farm.id, { latitude: '-17.79', longitude: '-50.9' });
    expect(both.status).toBe(200);
    // Com o par gravado, mexer num lado só é válido; limpar um lado só, não.
    expect((await patch(farm.id, { latitude: '-18' })).status).toBe(200);
    expect((await patch(farm.id, { latitude: null })).status).toBe(400);
    expect((await patch(farm.id, { latitude: null, longitude: null })).status).toBe(200);
    expect((await create(body({ latitude: '91', longitude: '0' }))).status).toBe(400);
  });

  it('aptidão ou cultura de outra empresa é 400 no campo', async () => {
    const foreignApt = await create(body({ aptitudeIds: [foreignAptitude] }));
    expect(foreignApt.status).toBe(400);
    expect(((await foreignApt.json()) as ErrorBody).error).toMatchObject({ code: 'validation_error', field: 'aptitudeIds' });

    const foreignCropResponse = await create(body({ cropIds: [foreignCrop] }));
    expect(foreignCropResponse.status).toBe(400);
    expect(((await foreignCropResponse.json()) as ErrorBody).error.field).toBe('cropIds');

    const farm = await created();
    expect((await patch(farm.id, { aptitudeIds: [agriculture, foreignAptitude] })).status).toBe(400);
    expect((await patch(farm.id, { cropIds: [foreignCrop] })).status).toBe(400);
    expect((await patch(farm.id, { cropIds: ['0199c1d2-7a4b-7c3e-9f10-1a2b3c4d5e6f'] })).status).toBe(400);
    expect(((await (await app.request(url(`/${farm.id}`), { headers: { cookie: managerCookie } })).json()) as FarmBody).aptitudes).toEqual([]);
  });

  it('aptidão ou cultura inativa que entra é 400; a já gravada que ficou inativa passa ao salvar', async () => {
    expect((await create(body({ aptitudeIds: [inactiveAptitude] }))).status).toBe(400);
    expect((await create(body({ cropIds: [inactiveCrop] }))).status).toBe(400);

    const farm = await created({ aptitudeIds: [agriculture], cropIds: [soy] });
    await db.withTenant(tenant.id, async (tx) => {
      const { eq } = await import('drizzle-orm');
      await tx.update(aptitudes).set({ active: false }).where(eq(aptitudes.id, agriculture));
      await tx.update(crops).set({ active: false }).where(eq(crops.id, soy));
    });

    const kept = await patch(farm.id, { aptitudeIds: [agriculture], cropIds: [soy, corn] });
    expect(kept.status).toBe(200);
    expect(names(((await kept.json()) as FarmBody).aptitudes)).toEqual(['Agricultura']);
    expect((await patch(farm.id, { aptitudeIds: [agriculture, inactiveAptitude] })).status).toBe(400);

    await db.withTenant(tenant.id, async (tx) => {
      const { eq } = await import('drizzle-orm');
      await tx.update(aptitudes).set({ active: true }).where(eq(aptitudes.id, agriculture));
      await tx.update(crops).set({ active: true }).where(eq(crops.id, soy));
    });
  });

  it('status comercial pode ser trocado à mão para qualquer entrada ativa', async () => {
    const farm = await created();
    expect(farm.commercialStatus.id).toBe(available);

    const toSold = await patch(farm.id, { commercialStatusId: sold });
    expect(toSold.status).toBe(200);
    expect(((await toSold.json()) as FarmBody).commercialStatus.id).toBe(sold);
    expect((await patch(farm.id, { commercialStatusId: available })).status).toBe(200);
    expect((await patch(farm.id, { commercialStatusId: inactiveStatus })).status).toBe(400);
  });

  it('aptitudeIds e cropIds substituem o conjunto, e o histórico mostra os filhos adicionados e removidos num save só', async () => {
    const farm = await created({ aptitudeIds: [agriculture], cropIds: [soy] });

    const response = await patch(farm.id, { aptitudeIds: [livestock], cropIds: [soy, corn] });
    expect(response.status).toBe(200);
    const updated = (await response.json()) as FarmBody;
    expect(names(updated.aptitudes)).toEqual(['Pecuária']);
    expect(names(updated.crops)).toEqual(['Milho', 'Soja']);

    const [latest] = await history(farm.id);
    expect(latest?.children.map((child) => child.title).sort()).toEqual([
      'Aptidão adicionada: Pecuária',
      'Aptidão removida: Agricultura',
      'Cultura adicionada: Milho',
    ]);

    // Ausente no corpo não toca; lista vazia limpa.
    const untouched = (await (await patch(farm.id, { name: 'Outro nome' })).json()) as FarmBody;
    expect(names(untouched.aptitudes)).toEqual(['Pecuária']);
    const cleared = (await (await patch(farm.id, { aptitudeIds: [], cropIds: [] })).json()) as FarmBody;
    expect(cleared.aptitudes).toEqual([]);
    expect(cleared.crops).toEqual([]);
  });

  it('id repetido no corpo é aceito uma vez só', async () => {
    const farm = await created({ aptitudeIds: [agriculture, agriculture] });
    expect(names(farm.aptitudes)).toEqual(['Agricultura']);
  });

  it('reenviar o mesmo conjunto não gera entrada no histórico', async () => {
    const farm = await created({ aptitudeIds: [agriculture, livestock], cropIds: [soy] });
    const before = (await history(farm.id)).length;

    expect((await patch(farm.id, { aptitudeIds: [livestock, agriculture], cropIds: [soy] })).status).toBe(200);

    expect((await history(farm.id)).length).toBe(before);
  });

  it('com escopo own, PATCH de aptidões em fazenda alheia é 404', async () => {
    const theirs = await created({ aptitudeIds: [agriculture] });

    expect((await patch(theirs.id, { aptitudeIds: [livestock] }, brokerCookie)).status).toBe(404);
    expect((await patch(theirs.id, { aptitudeIds: [foreignAptitude] }, brokerCookie)).status).toBe(404);
    const read = (await (await app.request(url(`/${theirs.id}`), { headers: { cookie: managerCookie } })).json()) as FarmBody;
    expect(names(read.aptitudes)).toEqual(['Agricultura']);
  });
});
