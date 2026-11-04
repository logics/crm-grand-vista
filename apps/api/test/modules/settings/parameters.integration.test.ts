// Parâmetros da empresa por HTTP contra o Postgres real, e o histórico que os usa.
import { auditedWrites, auditLog, createDatabase, createPool, crops } from '@crm/db';
import { type EntityMeta, RECORD_COLUMNS, HIDDEN } from '@crm/shared';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { readHistory } from '../../../src/history/query.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { createLinkedAccessProfile, createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

describe('parâmetros da empresa', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;
  let manager: Awaited<ReturnType<typeof createUserWithPassword>>;
  let managerCookie: string;
  let brokerCookie: string;
  let otherCookie: string;

  const read = (slug = tenant.slug, cookie = managerCookie) => app.request(`/e/${slug}/settings`, { headers: { cookie } });
  const patch = (body: unknown, cookie = managerCookie) =>
    app.request(`/e/${tenant.slug}/settings`, jsonRequest('PATCH', body, cookie));

  beforeAll(async () => {
    tenant = await createTenant(db, 'parametros');
    otherTenant = await createTenant(db, 'parametros-alheia');
    manager = await createUserWithPassword(db, 'Gestora');
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
  });

  afterAll(() => pool.end());

  it('sem a linha, a leitura devolve os defaults', async () => {
    const response = await read();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' });
  });

  it('PATCH cria a linha, grava só o enviado e audita', async () => {
    const response = await patch({ areaDisplayUnit: 'alqueire' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ defaultAlqueireType: 'goiano', areaDisplayUnit: 'alqueire' });

    expect(await (await patch({ defaultAlqueireType: 'paulista' })).json()).toEqual({
      defaultAlqueireType: 'paulista',
      areaDisplayUnit: 'alqueire',
    });
    const audited = await db.withTenant(tenant.id, (tx) =>
      tx.select({ field: auditLog.field, newValue: auditLog.newValue }).from(auditLog).where(eq(auditLog.entity, 'tenant_settings')),
    );
    expect(audited).toContainEqual({ field: 'default_alqueire_type', newValue: 'paulista' });
  });

  it.each([[{ areaDisplayUnit: 'acre' }], [{ defaultAlqueireType: 'mineiro' }], [{}], [{ currency: 'USD' }]])(
    'PATCH recusa %o com 400',
    async (body) => {
      expect((await patch(body)).status).toBe(400);
    },
  );

  it('sem configuracoes.gerenciar, PATCH é 403 e a leitura funciona', async () => {
    expect((await patch({ areaDisplayUnit: 'hectare' }, brokerCookie)).status).toBe(403);
    const response = await read(tenant.slug, brokerCookie);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ defaultAlqueireType: 'paulista', areaDisplayUnit: 'alqueire' });
  });

  it('cada empresa tem os seus parâmetros', async () => {
    const response = await read(otherTenant.slug, otherCookie);
    expect(await response.json()).toEqual({ defaultAlqueireType: 'goiano', areaDisplayUnit: 'hectare' });
    expect((await read(tenant.slug, otherCookie)).status).toBeGreaterThanOrEqual(403);
  });

  describe('histórico formata área pelos parâmetros', () => {
    // Nenhuma entidade com área existe ainda: o registro de teste declara uma
    // coluna de área sobre `crops.name`, pelo caminho real de `readHistory`.
    const registry: Record<string, EntityMeta> = {
      crops: { label: 'Cultura', gender: 'f', fields: { ...RECORD_COLUMNS, tenant_id: HIDDEN, name: { type: 'area', label: 'Área' } } },
    };
    let cropId: string;

    beforeAll(async () => {
      const [crop] = await db.withTenant(tenant.id, (tx) =>
        auditedWrites(tx, { tenantId: tenant.id, userId: manager.id }).insert(crops, { tenantId: tenant.id, name: '48.4' }).then((row) => [row]),
      );
      cropId = crop!.id;
    });

    const history = () =>
      db.withTenant(tenant.id, (tx) =>
        readHistory(tx, {
          entity: 'crops',
          entityId: cropId,
          reader: { userId: manager.id, permissions: new Set(), dataScopes: new Map() },
          registry,
        }),
      );
    const areaChange = async () => (await history()).entries.flatMap((entry) => entry.changes).find((c) => c.field === 'Área')?.to;

    it('em alqueire, do tipo padrão', async () => {
      await patch({ areaDisplayUnit: 'alqueire', defaultAlqueireType: 'goiano' });
      expect(await areaChange()).toBe('10 alq. goiano');
    });

    it('em hectare, volta a hectare', async () => {
      await patch({ areaDisplayUnit: 'hectare' });
      expect(await areaChange()).toBe('48,4 ha');
    });
  });
});
