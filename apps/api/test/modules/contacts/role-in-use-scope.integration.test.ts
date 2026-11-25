// Mensagem de "papel em uso" e escopo de dados, pelo HTTP real contra o Postgres
// (spec fase-1-cadeia-de-indicacao, critérios 14 e 15): o bloqueio é global, mas a
// mensagem não conta fazendas fora do escopo de quem pede.
import { auditedWrites, commercialStatuses, createDatabase, createPool, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();
const RIO_VERDE = '5218805';

interface ErrorBody {
  error: { code: string; message: string };
}
interface ContactBody {
  id: string;
  roles: string[];
}

describe('papel em uso sem revelar registros fora do escopo', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let managerId: string;
  let narrowId: string;
  let wideId: string;
  let managerCookie: string;
  let narrowCookie: string;
  let wideCookie: string;
  let counter = 0;

  const unique = (name: string) => `${name} ${(counter += 1)}`;
  const contactsUrl = (path = '') => `/e/${tenant.slug}/contacts${path}`;
  const createContact = async (name: string, roles: string[]) => {
    const response = await app.request(contactsUrl(), jsonRequest('POST', { personType: 'pf', name, roles }, managerCookie));
    expect(response.status).toBe(201);
    return (await response.json()) as ContactBody;
  };
  const createFarm = async (responsibleUserId: string, extra: Record<string, unknown> = {}) => {
    const response = await app.request(
      `/e/${tenant.slug}/farms`,
      jsonRequest(
        'POST',
        { name: unique('Fazenda'), municipalityIbgeCode: RIO_VERDE, totalAreaHa: '1000', responsibleUserId, ...extra },
        managerCookie,
      ),
    );
    expect(response.status).toBe(201);
  };
  const withReferrer = (contactId: string) => ({ referralChain: [{ referrer: { kind: 'contact', id: contactId } }] });
  const withOwner = (contactId: string) => ({ owners: [{ contactId, isPrimary: true }] });
  /** Retira o papel (o contato fica só comprador) e devolve a resposta da rota real. */
  const dropRole = async (id: string, cookie: string) => {
    const response = await app.request(contactsUrl(`/${id}`), jsonRequest('PATCH', { roles: ['buyer'] }, cookie));
    return { status: response.status, message: ((await response.json()) as ErrorBody).error?.message ?? '' };
  };
  const rolesOf = async (id: string) =>
    ((await (await app.request(contactsUrl(`/${id}`), { headers: { cookie: managerCookie } })).json()) as ContactBody).roles;

  beforeAll(async () => {
    tenant = await createTenant(db, 'papel-em-uso-escopo');
    const [manager, narrow, wide] = await Promise.all(
      ['Gestora', 'Corretor Um', 'Corretor Todas'].map((name) => createUserWithPassword(db, name)),
    );
    for (const user of [manager!, narrow!, wide!]) await createMembership(db, user.id, tenant.id, { isDefault: true });
    managerId = manager!.id;
    narrowId = narrow!.id;
    wideId = wide!.id;
    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: manager!.id, profileId: ids.get('Gestor')! },
        { tenantId: tenant.id, userId: narrow!.id, profileId: ids.get('Corretor')! },
        { tenantId: tenant.id, userId: wide!.id, profileId: ids.get('Corretor')! },
      ]);
      await tx
        .insert(commercialStatuses)
        .values({ tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 });
    });
    managerCookie = await loginAs(app, manager!);
    narrowCookie = await loginAs(app, narrow!);
    wideCookie = await loginAs(app, wide!);
  });

  afterAll(() => pool.end());

  describe('corretor externo em cadeias de fazendas (14)', () => {
    it('é 409 para qualquer perfil; o Gestor recebe o número e o Corretor que vê uma recebe a mensagem sem número', async () => {
      const antonio = await createContact('Antônio', ['external_broker']);
      await createFarm(narrowId, withReferrer(antonio.id));
      await createFarm(managerId, withReferrer(antonio.id));
      await createFarm(managerId, withReferrer(antonio.id));

      const asManager = await dropRole(antonio.id, managerCookie);
      const asNarrow = await dropRole(antonio.id, narrowCookie);
      const asWide = await dropRole(antonio.id, wideCookie);

      expect([asManager.status, asNarrow.status, asWide.status]).toEqual([409, 409, 409]);
      expect(asManager.message).toBe(
        'Antônio é corretor externo de 3 cadeias de indicação; troque o corretor externo antes de retirar o papel.',
      );
      expect(asNarrow.message).toBe(
        'Antônio é corretor externo em cadeias de indicação; troque o corretor externo antes de retirar o papel.',
      );
      expect(asNarrow.message).not.toMatch(/\d/);
      // Quem não vê nenhuma também é barrado, sem número.
      expect(asWide.message).toBe(asNarrow.message);
      expect(await rolesOf(antonio.id)).toContain('external_broker');
    });

    it('o Corretor que enxerga todas as fazendas recebe o número', async () => {
      const bento = await createContact('Bento', ['external_broker']);
      for (let i = 0; i < 3; i++) await createFarm(wideId, withReferrer(bento.id));

      const asWide = await dropRole(bento.id, wideCookie);
      expect(asWide.status).toBe(409);
      expect(asWide.message).toBe(
        'Bento é corretor externo de 3 cadeias de indicação; troque o corretor externo antes de retirar o papel.',
      );
      expect(await rolesOf(bento.id)).toContain('external_broker');
    });

    it('elo com sujeito contato conta como visível para quem tem escopo own', async () => {
      const carla = await createContact('Carla', ['external_broker']);
      const sujeito = await createContact('Sujeito', ['buyer']);
      for (let i = 0; i < 3; i++) await createFarm(wideId, withReferrer(carla.id));
      const chain = await app.request(
        contactsUrl(`/${sujeito.id}`),
        jsonRequest('PATCH', { referralChain: [{ referrer: { kind: 'contact', id: carla.id } }] }, managerCookie),
      );
      expect(chain.status).toBe(200);

      const asWide = await dropRole(carla.id, wideCookie);
      expect(asWide.message).toBe(
        'Carla é corretor externo de 4 cadeias de indicação; troque o corretor externo antes de retirar o papel.',
      );
    });

    it('contato só referido em cadeias de contatos mostra o número a quem não vê fazenda nenhuma', async () => {
      const dora = await createContact('Dora', ['external_broker']);
      const sujeito = await createContact('Outro sujeito', ['buyer']);
      const chain = await app.request(
        contactsUrl(`/${sujeito.id}`),
        jsonRequest('PATCH', { referralChain: [{ referrer: { kind: 'contact', id: dora.id } }] }, managerCookie),
      );
      expect(chain.status).toBe(200);

      const asNarrow = await dropRole(dora.id, narrowCookie);
      expect(asNarrow.message).toBe(
        'Dora é corretor externo de 1 cadeia de indicação; troque o corretor externo antes de retirar o papel.',
      );
    });
  });

  describe('proprietário de fazendas (15)', () => {
    it('é 409 para qualquer perfil; só o Gestor recebe o número quando o Corretor vê uma das três', async () => {
      const paulo = await createContact('Paulo', ['owner']);
      await createFarm(narrowId, withOwner(paulo.id));
      await createFarm(managerId, withOwner(paulo.id));
      await createFarm(managerId, withOwner(paulo.id));

      const asManager = await dropRole(paulo.id, managerCookie);
      const asNarrow = await dropRole(paulo.id, narrowCookie);
      const asWide = await dropRole(paulo.id, wideCookie);

      expect([asManager.status, asNarrow.status, asWide.status]).toEqual([409, 409, 409]);
      expect(asManager.message).toBe('Paulo é proprietário de 3 fazendas; troque o proprietário antes de retirar o papel.');
      expect(asNarrow.message).toBe('Paulo é proprietário de fazendas; troque o proprietário antes de retirar o papel.');
      expect(asNarrow.message).not.toMatch(/\d/);
      expect(await rolesOf(paulo.id)).toContain('owner');
    });

    it('o Corretor que enxerga todas as fazendas recebe o número', async () => {
      const pedro = await createContact('Pedro', ['owner']);
      for (let i = 0; i < 3; i++) await createFarm(wideId, withOwner(pedro.id));

      const asWide = await dropRole(pedro.id, wideCookie);
      expect(asWide.status).toBe(409);
      expect(asWide.message).toBe('Pedro é proprietário de 3 fazendas; troque o proprietário antes de retirar o papel.');
    });
  });
});
