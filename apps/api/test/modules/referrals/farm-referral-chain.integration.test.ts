// Cadeia de indicação da fazenda pelo HTTP real, contra o Postgres (spec
// fase-1-cadeia-de-indicacao, critérios 1 a 3, 5, 7, 9 e 13 do lado da fazenda).
import { auditLog, auditedWrites, commercialStatuses, createDatabase, createPool, referralLinks, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createLinkedAccessProfile, createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();
const RIO_VERDE = '5218805';

interface ChainItem {
  id: string;
  position: number;
  referrer: { kind: 'user' | 'contact'; id: string; name: string; linked?: boolean };
  notes: string | null;
}
interface FarmBody {
  id: string;
  name: string;
  referralChain: ChainItem[];
  error?: { code: string; message: string; field?: string; position?: number };
}
interface ContactBody {
  id: string;
  name: string;
  roles: string[];
}
interface HistoryBody {
  entries: {
    changeId: string;
    kind: string;
    title: string;
    changes: { field: string; from: string | null; to: string | null }[];
    children: { title: string; changes: { field: string; from: string | null; to: string | null }[] }[];
  }[];
}

describe('cadeia de indicação da fazenda', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let broker: { id: string; name: string };
  let carlos: { id: string; name: string };
  let outsider: { id: string; name: string };
  let managerCookie: string;
  let brokerCookie: string;
  let viewerCookie: string;
  let otherCookie: string;
  let deactivated: string;
  let counter = 0;

  const farmsUrl = (path = '', slug = tenant.slug) => `/e/${slug}/farms${path}`;
  const post = (body: unknown, cookie = managerCookie) => app.request(farmsUrl(), jsonRequest('POST', body, cookie));
  const patch = (id: string, body: unknown, cookie = managerCookie) =>
    app.request(farmsUrl(`/${id}`), jsonRequest('PATCH', body, cookie));
  const get = (id: string, cookie = managerCookie) => app.request(farmsUrl(`/${id}`), { headers: { cookie } });
  const remove = (id: string) => app.request(farmsUrl(`/${id}`), { method: 'DELETE', headers: { cookie: managerCookie } });
  const body = async (response: Response) => (await response.json()) as FarmBody;
  const history = async (id: string, cookie = managerCookie) =>
    (await (await app.request(farmsUrl(`/${id}/history`), { headers: { cookie } })).json()) as HistoryBody;
  const unique = (name: string) => `${name} ${(counter += 1)}`;
  const farmBody = (extra: Record<string, unknown> = {}) => ({
    name: unique('Fazenda'),
    municipalityIbgeCode: RIO_VERDE,
    totalAreaHa: '1000',
    ...extra,
  });
  const create = async (extra: Record<string, unknown> = {}, cookie = managerCookie) => {
    const response = await post(farmBody(extra), cookie);
    expect(response.status).toBe(201);
    return body(response);
  };
  const createContact = async (name: string) => {
    const response = await app.request(
      `/e/${tenant.slug}/contacts`,
      jsonRequest('POST', { personType: 'pf', name: unique(name), roles: ['buyer'] }, managerCookie),
    );
    expect(response.status).toBe(201);
    return (await response.json()) as ContactBody;
  };
  const getContact = async (id: string) =>
    (await (await app.request(`/e/${tenant.slug}/contacts/${id}`, { headers: { cookie: managerCookie } })).json()) as ContactBody;
  const asContact = (id: string, notes?: string) => ({ referrer: { kind: 'contact', id }, ...(notes ? { notes } : {}) });
  const asUser = (id: string) => ({ referrer: { kind: 'user', id } });
  const linesOf = (entity: string) =>
    db.withTenant(tenant.id, (tx) => tx.select().from(auditLog).where(eq(auditLog.entity, entity)).orderBy(asc(auditLog.id)));
  const storedChain = (farmId: string) =>
    db.withTenant(tenant.id, (tx) => tx.select().from(referralLinks).where(eq(referralLinks.subjectFarmId, farmId)));

  beforeAll(async () => {
    tenant = await createTenant(db, 'indicacao-fazenda');
    other = await createTenant(db, 'indicacao-fazenda-b');
    const [m, b, c, v, o, s] = await Promise.all(
      ['Gestora', 'Corretora', 'Carlos', 'Leitor', 'Gestora B', 'Corretor de Fora'].map((name) =>
        createUserWithPassword(db, name),
      ),
    );
    for (const user of [m!, b!, c!, v!]) await createMembership(db, user.id, tenant.id, { isDefault: true });
    await createMembership(db, o!.id, other.id, { isDefault: true });
    await createMembership(db, s!.id, other.id, { isDefault: true });
    broker = { id: b!.id, name: b!.name };
    carlos = { id: c!.id, name: c!.name };
    outsider = { id: s!.id, name: s!.name };

    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: m!.id, profileId: ids.get('Gestor')! },
        { tenantId: tenant.id, userId: b!.id, profileId: ids.get('Corretor')! },
      ]);
      await tx
        .insert(commercialStatuses)
        .values({ tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 });
      const [status] = await tx
        .insert(commercialStatuses)
        .values({ tenantId: tenant.id, name: 'Desativada', systemMeaning: 'inactive', displayOrder: 1 })
        .returning();
      deactivated = status!.id;
    });
    // Sem `fazendas.editar`: lê, mas não grava.
    await createLinkedAccessProfile(db, tenant.id, v!.id, 'Leitor', {
      permissions: ['fazendas.ver', 'contatos.ver'],
      dataScopes: { fazendas: 'all' },
    });
    await db.withTenant(other.id, async (tx) => {
      await tx.insert(commercialStatuses).values({ tenantId: other.id, name: 'Disponível', systemMeaning: 'available' });
    });
    await createLinkedAccessProfile(db, other.id, o!.id, 'Admin', {
      permissions: ['fazendas.ver', 'fazendas.criar', 'fazendas.editar'],
      dataScopes: { fazendas: 'all' },
    });

    managerCookie = await loginAs(app, m!);
    brokerCookie = await loginAs(app, b!);
    viewerCookie = await loginAs(app, v!);
    otherCookie = await loginAs(app, o!);
  });

  afterAll(() => pool.end());

  describe('cadastro e leitura (1)', () => {
    it('POST com usuário na 1 e contato na 2 grava no change_id da fazenda e o GET devolve a cadeia na ordem', async () => {
      const antonio = await createContact('Antônio');
      const farm = await create({ referralChain: [asUser(carlos.id), asContact(antonio.id, 'conhece a região')] });

      expect(farm.referralChain).toMatchObject([
        { position: 1, referrer: { kind: 'user', id: carlos.id, name: carlos.name, linked: true }, notes: null },
        { position: 2, referrer: { kind: 'contact', id: antonio.id, name: antonio.name }, notes: 'conhece a região' },
      ]);
      const read = await body(await get(farm.id));
      expect(read.referralChain.map((link) => link.position)).toEqual([1, 2]);

      const farmLines = (await linesOf('farms')).filter((line) => line.entityId === farm.id);
      const chainLines = (await linesOf('referral_links')).filter((line) =>
        farm.referralChain.some((link) => link.id === line.entityId),
      );
      expect(chainLines.length).toBeGreaterThan(0);
      expect(new Set(chainLines.map((line) => line.changeId))).toEqual(new Set([farmLines[0]!.changeId]));
    });

    it('fazenda sem cadeia devolve []', async () => {
      const farm = await create();
      expect(farm.referralChain).toEqual([]);
      expect((await body(await get(farm.id))).referralChain).toEqual([]);
    });
  });

  describe('PATCH (2)', () => {
    it('sem a chave não toca a cadeia', async () => {
      const a = await createContact('A');
      const farm = await create({ referralChain: [asContact(a.id)] });
      const untouched = await body(await patch(farm.id, { name: 'Renomeada' }));
      expect(untouched.referralChain.map((link) => link.id)).toEqual(farm.referralChain.map((link) => link.id));
    });

    it('[] apaga a cadeia, com as remoções auditadas', async () => {
      const a = await createContact('A');
      const farm = await create({ referralChain: [asContact(a.id)] });
      const cleared = await body(await patch(farm.id, { referralChain: [] }));
      expect(cleared.referralChain).toEqual([]);
      expect(await storedChain(farm.id)).toEqual([]);
      const removals = (await linesOf('referral_links')).filter(
        (line) => line.entityId === farm.referralChain[0]!.id && line.field === 'id' && line.newValue === null,
      );
      expect(removals).toHaveLength(1);
    });

    it('lista nova substitui, mantendo o id de quem ficou', async () => {
      const [a, b, c] = [await createContact('A'), await createContact('B'), await createContact('C')];
      const farm = await create({ referralChain: [asContact(a.id), asContact(b.id)] });
      const [idA, idB] = farm.referralChain.map((link) => link.id);

      const replaced = await body(await patch(farm.id, { referralChain: [asContact(b.id), asContact(c.id)] }));
      expect(replaced.referralChain.map((link) => [link.referrer.id, link.position])).toEqual([
        [b.id, 1],
        [c.id, 2],
      ]);
      expect(replaced.referralChain[0]!.id).toBe(idB);
      expect((await storedChain(farm.id)).map((row) => row.id)).not.toContain(idA);
    });

    it('PATCH só com referralChain grava só a cadeia', async () => {
      const a = await createContact('A');
      const farm = await create();
      const saved = await body(await patch(farm.id, { referralChain: [asContact(a.id)] }));
      expect(saved.name).toBe(farm.name);
      expect(saved.referralChain).toHaveLength(1);
    });
  });

  describe('inversão de ordem (3)', () => {
    it('mantém os ids e mostra "Posição: 1 → 2" e "2 → 1" no histórico da fazenda', async () => {
      const joao = await createContact('João');
      const sebastiao = await createContact('Sebastião');
      const farm = await create({ referralChain: [asContact(joao.id), asContact(sebastiao.id)] });
      const ids = farm.referralChain.map((link) => link.id);

      const swapped = await body(await patch(farm.id, { referralChain: [asContact(sebastiao.id), asContact(joao.id)] }));
      expect(swapped.referralChain.map((link) => link.id)).toEqual([ids[1], ids[0]]);

      const entry = (await history(farm.id)).entries[0]!;
      expect(entry.kind).toBe('updated');
      expect(entry.children).toEqual([
        { title: `Indicador alterado: ${joao.name}`, changes: [{ field: 'Posição', from: '1', to: '2' }] },
        { title: `Indicador alterado: ${sebastiao.name}`, changes: [{ field: 'Posição', from: '2', to: '1' }] },
      ]);
      expect(entry.children.some((child) => /adicionado|removido/.test(child.title))).toBe(false);

      const positions = (await linesOf('referral_links'))
        .filter((line) => line.changeId === entry.changeId && line.field === 'position')
        .map((line) => line.newValue);
      expect(positions.every((value) => value === '1' || value === '2')).toBe(true);
    });

    it('o histórico de cadastro mostra "Indicador adicionado: … (posição N)"', async () => {
      const joao = await createContact('João');
      const farm = await create({ referralChain: [asContact(joao.id)] });
      const [entry] = (await history(farm.id)).entries;
      expect(entry!.children.map((child) => child.title)).toContain(`Indicador adicionado: ${joao.name} (posição 1)`);
    });
  });

  describe('papel Corretor externo (5)', () => {
    it('o contato da cadeia da fazenda ganha o papel', async () => {
      const antonio = await createContact('Antônio');
      await create({ referralChain: [asUser(carlos.id), asContact(antonio.id)] });
      expect((await getContact(antonio.id)).roles).toContain('external_broker');
    });
  });

  describe('recusas (7): 400 sem nenhuma escrita', () => {
    it('indicador repetido no POST: 400 na posição 2 e a fazenda não é criada', async () => {
      const joao = await createContact('João');
      const name = unique('Fantasma');
      const response = await post(farmBody({ name, referralChain: [asContact(joao.id), asContact(joao.id)] }));
      expect(response.status).toBe(400);
      expect((await body(response)).error).toMatchObject({
        field: 'referralChain',
        position: 2,
        message: `${joao.name} já está na cadeia, na posição 1.`,
      });
      const list = (await (
        await app.request(farmsUrl(`?q=${encodeURIComponent(name)}`), { headers: { cookie: managerCookie } })
      ).json()) as {
        items: unknown[];
      };
      expect(list.items).toEqual([]);
    });

    it('PATCH com nome novo e usuário sem vínculo: 400 e o nome não muda', async () => {
      const farm = await create();
      const response = await patch(farm.id, { name: 'Nome que não pode gravar', referralChain: [asUser(outsider.id)] });
      expect(response.status).toBe(400);
      expect((await body(response)).error).toMatchObject({
        field: 'referralChain',
        position: 1,
        message: 'Usuário não faz parte da equipe.',
      });
      expect((await body(await get(farm.id))).name).toBe(farm.name);
    });

    it('contato de outra empresa é 400 no item', async () => {
      const foreign = await db.withTenant(other.id, async (tx) => {
        const { contacts } = await import('@crm/db');
        const [row] = await tx
          .insert(contacts)
          .values({ tenantId: other.id, personType: 'pf', name: 'De outra empresa' })
          .returning();
        return row!.id;
      });
      const farm = await create();
      const response = await patch(farm.id, { referralChain: [asContact(foreign)] });
      expect(response.status).toBe(400);
      expect((await body(response)).error).toMatchObject({ position: 1, message: 'Contato não encontrado nesta empresa.' });
    });
  });

  describe('exclusão (9)', () => {
    it('excluir a fazenda leva a cadeia, com a remoção auditada no change_id da exclusão', async () => {
      const joao = await createContact('João');
      const farm = await create({ referralChain: [asContact(joao.id)] });
      const linkId = farm.referralChain[0]!.id;
      expect((await patch(farm.id, { commercialStatusId: deactivated })).status).toBe(200);

      expect((await remove(farm.id)).status).toBe(204);

      expect(await storedChain(farm.id)).toEqual([]);
      const removal = (await linesOf('referral_links')).filter(
        (line) => line.entityId === linkId && line.field === 'id' && line.newValue === null,
      );
      expect(removal).toHaveLength(1);
      const farmDelete = (await linesOf('farms')).filter((line) => line.entityId === farm.id && line.newValue === null);
      expect(farmDelete[0]!.changeId).toBe(removal[0]!.changeId);
    });
  });

  describe('acesso (13)', () => {
    it('fora do escopo own é 404 em GET e PATCH, inclusive só com referralChain, sem alterar nada', async () => {
      const joao = await createContact('João');
      const farm = await create({ referralChain: [asContact(joao.id)] });
      const before = (await linesOf('referral_links')).length;

      expect((await get(farm.id, brokerCookie)).status).toBe(404);
      expect((await patch(farm.id, { referralChain: [] }, brokerCookie)).status).toBe(404);
      expect((await patch(farm.id, { name: 'Invasão', referralChain: [] }, brokerCookie)).status).toBe(404);

      expect(await storedChain(farm.id)).toHaveLength(1);
      expect((await linesOf('referral_links')).length).toBe(before);
      expect((await body(await get(farm.id))).name).toBe(farm.name);
    });

    it('na própria fazenda o Corretor lê a cadeia', async () => {
      const joao = await createContact('João');
      const mine = await create({ responsibleUserId: broker.id, referralChain: [asContact(joao.id)] });
      const response = await get(mine.id, brokerCookie);
      expect(response.status).toBe(200);
      expect((await body(response)).referralChain).toHaveLength(1);
    });

    it('gravar a cadeia exige fazendas.editar: 403 e nada gravado', async () => {
      const joao = await createContact('João');
      const farm = await create();
      expect((await patch(farm.id, { referralChain: [asContact(joao.id)] }, viewerCookie)).status).toBe(403);
      expect(await storedChain(farm.id)).toEqual([]);
    });

    it('a cadeia de outra empresa não é lida: 404 por id e nenhuma linha visível', async () => {
      const joao = await createContact('João');
      const farm = await create({ referralChain: [asContact(joao.id)] });
      expect((await app.request(farmsUrl(`/${farm.id}`, other.slug), { headers: { cookie: otherCookie } })).status).toBe(404);
      const rows = await db.withTenant(other.id, (tx) =>
        tx
          .select()
          .from(referralLinks)
          .where(
            and(
              eq(referralLinks.subjectFarmId, farm.id),
              inArray(
                referralLinks.id,
                farm.referralChain.map((link) => link.id),
              ),
            ),
          ),
      );
      expect(rows).toEqual([]);
    });
  });
});
