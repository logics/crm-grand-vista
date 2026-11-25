// Cadeia de indicação do contato pelo HTTP real, contra o Postgres (spec
// fase-1-cadeia-de-indicacao, critérios 1 a 3, 5, 7, 9 e 13 do lado do contato).
import { auditLog, auditedWrites, createDatabase, createPool, memberships, referralLinks, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { readReferralChain } from '../../../src/modules/referrals/service.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

interface ChainItem {
  id: string;
  position: number;
  referrer: { kind: 'user' | 'contact'; id: string; name: string; linked?: boolean };
  notes: string | null;
}
interface ContactBody {
  id: string;
  name: string;
  roles: string[];
  referralChain: ChainItem[];
  error?: { code: string; message: string; field?: string; position?: number };
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

describe('cadeia de indicação do contato', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let cookie: string;
  let teamUser: { id: string; name: string };
  let departingUser: { id: string; name: string };
  let superAdmin: { id: string; name: string };
  let outsider: { id: string; name: string };

  const url = (path = '') => `/e/${tenant.slug}/contacts${path}`;
  const post = (body: unknown) => app.request(url(), jsonRequest('POST', body, cookie));
  const patch = (id: string, body: unknown) => app.request(url(`/${id}`), jsonRequest('PATCH', body, cookie));
  const get = async (id: string) => (await (await app.request(url(`/${id}`), { headers: { cookie } })).json()) as ContactBody;
  const remove = (id: string) => app.request(url(`/${id}`), { method: 'DELETE', headers: { cookie } });
  const history = async (id: string) =>
    (await (await app.request(url(`/${id}/history`), { headers: { cookie } })).json()) as HistoryBody;
  const body = async (response: Response) => (await response.json()) as ContactBody;
  let counter = 0;
  const create = async (name: string, extra: Record<string, unknown> = {}) => {
    const response = await post({ personType: 'pf', name, roles: ['buyer'], ...extra });
    expect(response.status).toBe(201);
    return body(response);
  };
  const asContact = (id: string, notes?: string) => ({ referrer: { kind: 'contact', id }, ...(notes ? { notes } : {}) });
  const asUser = (id: string) => ({ referrer: { kind: 'user', id } });
  const linesOf = (changeId?: string) =>
    db.withTenant(tenant.id, (tx) =>
      tx
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entity, 'referral_links'), changeId ? eq(auditLog.changeId, changeId) : undefined))
        .orderBy(asc(auditLog.id)),
    );
  const linesOfEntity = (entity: string) =>
    db.withTenant(tenant.id, (tx) => tx.select().from(auditLog).where(eq(auditLog.entity, entity)).orderBy(asc(auditLog.id)));
  const unique = (name: string) => `${name} ${(counter += 1)}`;

  beforeAll(async () => {
    tenant = await createTenant(db, 'indicacao-contato');
    other = await createTenant(db, 'indicacao-outra');
    const manager = await createUserWithPassword(db, 'Gestora');
    const member = await createUserWithPassword(db, 'Corretor da Casa');
    const departing = await createUserWithPassword(db, 'Corretor Saindo');
    const admin = await createUserWithPassword(db, 'Plataforma', { isSuperAdmin: true });
    const stranger = await createUserWithPassword(db, 'Corretor de Fora');
    for (const user of [manager, member, departing, admin]) await createMembership(db, user.id, tenant.id, { isDefault: true });
    await createMembership(db, stranger.id, other.id, { isDefault: true });
    teamUser = { id: member.id, name: member.name };
    departingUser = { id: departing.id, name: departing.name };
    superAdmin = { id: admin.id, name: admin.name };
    outsider = { id: stranger.id, name: stranger.name };
    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values({ tenantId: tenant.id, userId: manager.id, profileId: ids.get('Admin')! });
    });
    cookie = await loginAs(app, manager);
  });

  afterAll(() => pool.end());

  describe('cadastro e leitura (1)', () => {
    it('POST com usuário na 1 e contato na 2 grava no change_id do contato e o GET devolve a cadeia na ordem', async () => {
      const sebastiao = await create(unique('Sebastião'));
      const pedro = await create(unique('Pedro'), {
        referralChain: [asUser(teamUser.id), asContact(sebastiao.id, 'conhece a região')],
      });

      expect(pedro.referralChain).toMatchObject([
        { position: 1, referrer: { kind: 'user', id: teamUser.id, name: teamUser.name, linked: true }, notes: null },
        { position: 2, referrer: { kind: 'contact', id: sebastiao.id, name: sebastiao.name }, notes: 'conhece a região' },
      ]);
      expect((await get(pedro.id)).referralChain.map((link) => link.position)).toEqual([1, 2]);

      const contactLines = (await linesOfEntity('contacts')).filter((line) => line.entityId === pedro.id);
      const changeId = contactLines[0]!.changeId;
      const chainLines = (await linesOfEntity('referral_links')).filter((line) =>
        pedro.referralChain.some((link) => link.id === line.entityId),
      );
      expect(chainLines.length).toBeGreaterThan(0);
      expect(new Set(chainLines.map((line) => line.changeId))).toEqual(new Set([changeId]));
    });

    it('contato sem cadeia devolve []', async () => {
      const semCadeia = await create(unique('Sem cadeia'));
      expect(semCadeia.referralChain).toEqual([]);
      expect((await get(semCadeia.id)).referralChain).toEqual([]);
    });
  });

  describe('PATCH (2)', () => {
    it('sem a chave não toca; [] apaga (auditado); lista nova substitui mantendo o id de quem ficou', async () => {
      const [a, b, c] = [await create(unique('A')), await create(unique('B')), await create(unique('C'))];
      const pedro = await create(unique('Pedro'), { referralChain: [asContact(a.id), asContact(b.id)] });
      const [idA, idB] = pedro.referralChain.map((link) => link.id);

      const untouched = await body(await patch(pedro.id, { name: 'Pedro Renomeado' }));
      expect(untouched.referralChain.map((link) => link.id)).toEqual([idA, idB]);

      const replaced = await body(await patch(pedro.id, { referralChain: [asContact(b.id), asContact(c.id)] }));
      expect(replaced.referralChain.map((link) => [link.referrer.id, link.position])).toEqual([
        [b.id, 1],
        [c.id, 2],
      ]);
      expect(replaced.referralChain[0]!.id).toBe(idB);
      const stored = await db.withTenant(tenant.id, (tx) =>
        tx.select({ id: referralLinks.id }).from(referralLinks).where(eq(referralLinks.id, idA!)),
      );
      expect(stored).toEqual([]);

      const cleared = await body(await patch(pedro.id, { referralChain: [] }));
      expect(cleared.referralChain).toEqual([]);
      const removals = (await linesOfEntity('referral_links')).filter((line) => line.field === 'id' && line.newValue === null);
      expect(removals.map((line) => line.entityId)).toEqual(
        expect.arrayContaining([idA, replaced.referralChain[0]!.id, replaced.referralChain[1]!.id]),
      );
    });
  });

  describe('inversão de ordem (3)', () => {
    it('mantém os ids, grava só posição e mostra "Posição: 1 → 2" e "2 → 1" no histórico', async () => {
      const joao = await create(unique('João'));
      const sebastiao = await create(unique('Sebastião'));
      const pedro = await create(unique('Pedro'), { referralChain: [asContact(joao.id), asContact(sebastiao.id)] });
      const ids = pedro.referralChain.map((link) => link.id);

      const swapped = await body(await patch(pedro.id, { referralChain: [asContact(sebastiao.id), asContact(joao.id)] }));
      expect(swapped.referralChain.map((link) => link.id)).toEqual([ids[1], ids[0]]);

      const entries = (await history(pedro.id)).entries;
      const entry = entries[0]!;
      expect(entry.kind).toBe('updated');
      expect(entry.children).toEqual([
        { title: `Indicador alterado: ${joao.name}`, changes: [{ field: 'Posição', from: '1', to: '2' }] },
        { title: `Indicador alterado: ${sebastiao.name}`, changes: [{ field: 'Posição', from: '2', to: '1' }] },
      ]);
      expect(entry.children.some((child) => /adicionado|removido/.test(child.title))).toBe(false);

      const lines = (await linesOfEntity('referral_links')).filter(
        (line) => ids.includes(line.entityId) && line.field === 'position',
      );
      const swapPairs = lines.filter((line) => line.oldValue !== null).map((line) => [line.oldValue, line.newValue]);
      expect(swapPairs).toEqual(
        expect.arrayContaining([
          ['1', '2'],
          ['2', '1'],
        ]),
      );
      expect(swapPairs).toHaveLength(2);
    });

    it('o histórico de cadastro mostra "Indicador adicionado: … (posição N)"', async () => {
      const joao = await create(unique('João'));
      const pedro = await create(unique('Pedro'), { referralChain: [asContact(joao.id)] });
      const [entry] = (await history(pedro.id)).entries;
      expect(entry!.children.map((child) => child.title)).toContain(`Indicador adicionado: ${joao.name} (posição 1)`);
    });

    it('mudar só a nota gera só a linha "Nota"', async () => {
      const joao = await create(unique('João'));
      const pedro = await create(unique('Pedro'), { referralChain: [asContact(joao.id)] });
      await patch(pedro.id, { referralChain: [asContact(joao.id, 'trouxe na feira')] });
      const [entry] = (await history(pedro.id)).entries;
      expect(entry!.children).toEqual([
        { title: `Indicador alterado: ${joao.name}`, changes: [{ field: 'Nota', from: null, to: 'trouxe na feira' }] },
      ]);
    });
  });

  describe('papel Corretor externo (5)', () => {
    it('todo contato da cadeia ganha o papel, auditado no histórico dele; esvaziar a cadeia não o retira', async () => {
      const joao = await create(unique('João'));
      const sebastiao = await create(unique('Sebastião'));
      const pedro = await create(unique('Pedro'), { referralChain: [asContact(joao.id), asContact(sebastiao.id)] });

      for (const referrer of [joao, sebastiao]) {
        expect((await get(referrer.id)).roles).toContain('external_broker');
        const titles = (await history(referrer.id)).entries.flatMap((entry) => entry.children.map((child) => child.title));
        expect(titles).toContain('Papel adicionado: Corretor externo');
      }

      await patch(pedro.id, { referralChain: [] });
      expect((await get(joao.id)).roles).toContain('external_broker');
    });
  });

  describe('recusas (7): 400 sem nenhuma escrita', () => {
    const rejected = async (id: string, chain: unknown) => {
      const before = (await linesOf()).length;
      const response = await patch(id, { name: 'Nome que não pode gravar', referralChain: chain });
      expect(response.status).toBe(400);
      expect((await get(id)).name).not.toBe('Nome que não pode gravar');
      expect((await linesOf()).length).toBe(before);
      return (await body(response)).error!;
    };

    it('mais de 10 itens dão a mensagem do limite', async () => {
      const pedro = await create(unique('Pedro'));
      const eleven = Array.from({ length: 11 }, () => asContact('0190a000-0000-7000-8000-000000000001'));
      const error = await rejected(pedro.id, eleven);
      expect(error.message).toContain('A cadeia de indicação aceita até 10 indicadores.');
    });

    it('indicador repetido dá a mensagem de duplicado e a posição 2', async () => {
      const joao = await create(unique('João'));
      const pedro = await create(unique('Pedro'));
      const error = await rejected(pedro.id, [asContact(joao.id), asContact(joao.id)]);
      expect(error).toMatchObject({
        field: 'referralChain',
        position: 2,
        message: `${joao.name} já está na cadeia, na posição 1.`,
      });
    });

    it('o próprio contato dá a mensagem de ciclo, com a posição', async () => {
      const joao = await create(unique('João'));
      const pedro = await create(unique('Pedro'));
      const error = await rejected(pedro.id, [asContact(joao.id), asContact(pedro.id)]);
      expect(error).toMatchObject({
        position: 2,
        message: 'Nome que não pode gravar é quem foi indicado e não pode entrar na própria cadeia.',
      });
    });

    it('contato de outra empresa e usuário sem vínculo são recusados no item', async () => {
      const foreignContact = await db.withTenant(other.id, async (tx) => {
        const { contacts } = await import('@crm/db');
        const [row] = await tx
          .insert(contacts)
          .values({ tenantId: other.id, personType: 'pf', name: 'De outra empresa' })
          .returning();
        return row!.id;
      });
      const pedro = await create(unique('Pedro'));
      const joao = await create(unique('João'));

      const contactError = await rejected(pedro.id, [asContact(joao.id), asContact(foreignContact)]);
      expect(contactError).toMatchObject({ position: 2, message: 'Contato não encontrado nesta empresa.' });

      const userError = await rejected(pedro.id, [asUser(outsider.id)]);
      expect(userError).toMatchObject({ position: 1, message: 'Usuário não faz parte da equipe.' });
    });

    it('super admin vinculado à empresa é recusado no item', async () => {
      const pedro = await create(unique('Pedro'));
      const error = await rejected(pedro.id, [asUser(superAdmin.id)]);
      expect(error).toMatchObject({ position: 1, message: 'Usuário não faz parte da equipe.' });
    });

    it('um PATCH com nome novo e cadeia inválida não grava o nome (atomicidade)', async () => {
      const pedro = await create(unique('Pedro'));
      const response = await patch(pedro.id, { name: 'Outro Nome', referralChain: [asContact(pedro.id)] });
      expect(response.status).toBe(400);
      expect((await get(pedro.id)).name).toBe(pedro.name);
    });

    it('POST com cadeia inválida não cria o contato', async () => {
      const name = unique('Fantasma');
      const response = await post({ personType: 'pf', name, roles: ['buyer'], referralChain: [asUser(outsider.id)] });
      expect(response.status).toBe(400);
      const list = (await (await app.request(url(`?q=${encodeURIComponent(name)}`), { headers: { cookie } })).json()) as {
        items: unknown[];
      };
      expect(list.items).toEqual([]);
    });

    it('usuário que perdeu o vínculo depois passa sem alteração e volta com linked: false', async () => {
      const pedro = await create(unique('Pedro'), { referralChain: [asUser(departingUser.id)] });
      expect(pedro.referralChain[0]!.referrer.linked).toBe(true);
      await db.semTenant({ reason: 'cli' }, (tx) =>
        tx.delete(memberships).where(and(eq(memberships.userId, departingUser.id), eq(memberships.tenantId, tenant.id))),
      );

      const response = await patch(pedro.id, { referralChain: [asUser(departingUser.id)] });
      expect(response.status).toBe(200);
      const saved = await body(response);
      expect(saved.referralChain[0]).toMatchObject({
        id: pedro.referralChain[0]!.id,
        referrer: { id: departingUser.id, linked: false },
      });
      expect((await get(pedro.id)).referralChain[0]!.referrer.linked).toBe(false);
    });
  });

  describe('exclusão e papel em uso (9)', () => {
    it('excluir o contato sujeito leva a cadeia, com a remoção auditada', async () => {
      const joao = await create(unique('João'));
      const pedro = await create(unique('Pedro'), { referralChain: [asContact(joao.id)] });
      const linkId = pedro.referralChain[0]!.id;

      expect((await remove(pedro.id)).status).toBe(204);

      const left = await db.withTenant(tenant.id, (tx) => tx.select().from(referralLinks).where(eq(referralLinks.id, linkId)));
      expect(left).toEqual([]);
      const removal = (await linesOfEntity('referral_links')).filter(
        (line) => line.entityId === linkId && line.field === 'id' && line.newValue === null,
      );
      expect(removal).toHaveLength(1);
      expect(removal[0]).toMatchObject({ oldValue: linkId, newValue: null });
    });

    it('excluir contato indicador é 409 com a frase declarada', async () => {
      const joao = await create(unique('João'));
      await create(unique('Pedro'), { referralChain: [asContact(joao.id)] });
      const response = await remove(joao.id);
      expect(response.status).toBe(409);
      expect((await body(response)).error!.message).toBe(
        'Este contato é indicador em cadeia de indicação. Remova-o das cadeias de indicação antes de excluir.',
      );
    });

    it('retirar o papel Corretor externo em uso é 409', async () => {
      const joao = await create(unique('João'));
      await create(unique('Pedro'), { referralChain: [asContact(joao.id)] });
      const response = await patch(joao.id, { roles: ['buyer'] });
      expect(response.status).toBe(409);
      expect((await body(response)).error!.message).toBe(
        `${joao.name} é corretor externo de 1 cadeia de indicação; troque o corretor externo antes de retirar o papel.`,
      );
    });
  });

  describe('isolamento entre empresas (13, parte)', () => {
    it('a cadeia de outra empresa não é lida pela rota nem pelo serviço', async () => {
      const otherCookieOwner = await createUserWithPassword(db, 'Gestora B');
      await createMembership(db, otherCookieOwner.id, other.id, { isDefault: true });
      await db.withTenant(other.id, async (tx) => {
        const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: other.id, userId: null }), other.id);
        await tx.insert(userProfiles).values({ tenantId: other.id, userId: otherCookieOwner.id, profileId: ids.get('Admin')! });
      });
      const otherCookie = await loginAs(app, otherCookieOwner);
      const joao = await create(unique('João'));
      const pedro = await create(unique('Pedro'), { referralChain: [asContact(joao.id)] });

      const crossTenant = await app.request(`/e/${other.slug}/contacts/${pedro.id}`, { headers: { cookie: otherCookie } });
      expect(crossTenant.status).toBe(404);

      const leaked = await db.withTenant(other.id, (tx) => readReferralChain(tx, other.id, { kind: 'contact', id: pedro.id }));
      expect(leaked).toEqual([]);
      const rows = await db.withTenant(other.id, (tx) =>
        tx
          .select()
          .from(referralLinks)
          .where(
            inArray(
              referralLinks.id,
              pedro.referralChain.map((link) => link.id),
            ),
          ),
      );
      expect(rows).toEqual([]);
    });
  });
});
