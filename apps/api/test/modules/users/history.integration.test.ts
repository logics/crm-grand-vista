// Histórico de alterações de usuário por HTTP, contra o Postgres real: a prova
// de ponta a ponta do serviço de montagem e da fábrica de rota de histórico.
import { auditedWrites, createDatabase, createPool, users, uuidv7 } from '@crm/db';
import type { HistoryPage } from '@crm/shared';
import { loadApiEnv } from '@crm/shared/env';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { provisionTenant, type ProvisionedTenant } from '../../../src/provisioning/tenant.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
} from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

type User = Awaited<ReturnType<typeof createUserWithPassword>>;

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('histórico de alterações de usuário', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let provisioned: ProvisionedTenant;
  let broker: User;
  let superAdmin: User;
  let outsider: User;

  const slug = () => provisioned.tenant.slug;

  const history = (userId: string, cookie: string, cursor?: string) =>
    app.request(`/e/${slug()}/users/${userId}/history${cursor === undefined ? '' : `?cursor=${cursor}`}`, {
      headers: { cookie },
    });

  const readHistory = async (userId: string, cookie: string, cursor?: string): Promise<HistoryPage> => {
    const response = await history(userId, cookie, cursor);
    expect(response.status).toBe(200);
    return (await response.json()) as HistoryPage;
  };

  const update = async (userId: string, body: unknown, cookie: string) => {
    const response = await app.request(`/e/${slug()}/users/${userId}`, jsonRequest('PATCH', body, cookie));
    expect(response.status).toBe(200);
  };

  /** Usuário novo na empresa, sem permissão nenhuma, com o próprio cookie. */
  const newMember = async (name: string) => {
    const user = await createUserWithPassword(db, name);
    await createMembership(db, user.id, provisioned.tenant.id, { isDefault: true });
    await createLinkedAccessProfile(db, provisioned.tenant.id, user.id, `Sem permissão de ${name}`);
    return { user, cookie: await loginAs(app, user) };
  };

  beforeAll(async () => {
    // Pelo CLI de provisionamento: o administrador nasce auditado, com autor nulo.
    provisioned = await provisionTenant(db, {
      slug: `historico-${uuidv7().slice(-12)}`,
      name: 'Histórico',
      admin: { name: 'Helena Administradora', email: `${uuidv7()}@teste.local` },
    });
    ({ user: broker } = await newMember('Bruno Corretor'));
    // O nome não diz quem tem a flag: a resposta é varrida pela palavra.
    superAdmin = await createUserWithPassword(db, 'Ana Gestora', { isSuperAdmin: true });
    await createMembership(db, superAdmin.id, provisioned.tenant.id, { isDefault: true });

    const otherTenant = await createTenant(db, 'historico-alheia');
    outsider = await createUserWithPassword(db, 'Diego de Outra Empresa');
    await createMembership(db, outsider.id, otherTenant.id, { isDefault: true });
  });

  afterAll(() => pool.end());

  it('uma entrada por save, mais nova primeiro, com rótulo e valor formatado — nunca nome de coluna', async () => {
    const { user, cookie } = await newMember('Eva Antes');

    await update(user.id, { name: 'Eva Durante' }, cookie);
    await update(user.id, { name: 'Eva Depois' }, cookie);
    const response = await history(user.id, cookie);
    const text = await response.text();
    const { entries } = JSON.parse(text) as HistoryPage;

    expect(response.status).toBe(200);
    // O autor sai pelo nome de hoje, não pelo da época do save.
    expect(entries).toMatchObject([
      { kind: 'updated', title: 'Nome alterado', author: 'Eva Depois', changes: [{ field: 'Nome', from: 'Eva Durante', to: 'Eva Depois' }] },
      { kind: 'updated', title: 'Nome alterado', changes: [{ field: 'Nome', from: 'Eva Antes', to: 'Eva Durante' }] },
    ]);
    expect(entries[0]?.children).toEqual([]);
    expect(text).not.toMatch(/"(name|image|email_verified)"/);
  });

  it('dois campos no mesmo save: uma entrada, na ordem do registro, "2 alterações"; um campo, o título dele', async () => {
    const { user, cookie } = await newMember('Fábio');

    // O corpo traz a foto antes do nome; a entrada segue a ordem do registro.
    await update(user.id, { image: 'fabio.png', name: 'Fábio Souza' }, cookie);
    await update(user.id, { image: 'fabio-2.png' }, cookie);
    const { entries } = await readHistory(user.id, cookie);

    expect(entries).toMatchObject([
      { title: 'Foto alterada', changes: [{ field: 'Foto', from: 'fabio.png', to: 'fabio-2.png' }] },
      {
        title: '2 alterações',
        changes: [
          { field: 'Nome', from: 'Fábio', to: 'Fábio Souza' },
          { field: 'Foto', from: null, to: 'fabio.png' },
        ],
      },
    ]);
  });

  it('a entrada de cadastro tem o título no gênero da entidade e os valores iniciais, e o CLI aparece como "Sistema"', async () => {
    const { admin } = provisioned;
    const cookie = await loginAs(app, admin);

    const { entries } = await readHistory(admin.id, cookie);

    expect(entries).toEqual([
      {
        changeId: expect.any(String),
        at: expect.stringMatching(ISO_UTC),
        author: 'Sistema',
        kind: 'created',
        title: 'Usuário cadastrado',
        changes: [
          { field: 'Nome', from: null, to: admin.name },
          { field: 'E-mail', from: null, to: admin.email },
          { field: 'E-mail verificado', from: null, to: 'Não' },
        ],
        children: [],
      },
    ]);
  });

  it('alteração feita por CLI, sem usuário, sai com autor "Sistema"', async () => {
    const { user, cookie } = await newMember('Lia');

    // O caminho do CLI: transação nominal, autor nulo, sob a empresa.
    await db.semTenant({ reason: 'cli', tenantId: provisioned.tenant.id }, (tx) =>
      auditedWrites(tx, { tenantId: provisioned.tenant.id, userId: null }).update(
        users,
        { name: 'Lia Corrigida' },
        eq(users.id, user.id),
      ),
    );
    const { entries } = await readHistory(user.id, cookie);

    expect(entries).toMatchObject([{ author: 'Sistema', title: 'Nome alterado', changes: [{ to: 'Lia Corrigida' }] }]);
  });

  describe('acesso', () => {
    it('sem usuarios.gerenciar, lê o próprio histórico e recebe 403 no de outro — colega ou estranho', async () => {
      const cookie = await loginAs(app, broker);

      const own = await history(broker.id, cookie);
      const colleague = await history(provisioned.admin.id, cookie);
      const stranger = await history(outsider.id, cookie);

      expect(own.status).toBe(200);
      expect(colleague.status).toBe(403);
      // A mesma recusa do `PATCH`: não diz quem é da equipe.
      expect(stranger.status).toBe(403);
      expect(await stranger.text()).toBe(await colleague.text());
    });

    it('com usuarios.gerenciar, usuário de outra empresa é 404, como o inexistente', async () => {
      const cookie = await loginAs(app, provisioned.admin);

      const stranger = await history(outsider.id, cookie);
      const missing = await history(uuidv7(), cookie);
      const malformed = await history('nao-e-um-id', cookie);

      expect(stranger.status).toBe(404);
      expect(missing.status).toBe(404);
      expect(malformed.status).toBe(404);
      expect(await stranger.json()).toEqual({ error: { code: 'not_found', message: 'Usuário não encontrado.' } });
      expect(await missing.text()).toBe(await malformed.text());
    });

    it('cursor que não foi emitido pela API é 400', async () => {
      const response = await history(broker.id, await loginAs(app, broker), 'inventado');

      expect(response.status).toBe(400);
    });
  });

  it('alteração do super admin sai com o nome dele, sem marcação', async () => {
    const { user, cookie } = await newMember('Gil');

    await update(user.id, { name: 'Gil Revisado' }, await loginAs(app, superAdmin));
    const response = await history(user.id, cookie);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect((JSON.parse(text) as HistoryPage).entries).toMatchObject([{ author: superAdmin.name, title: 'Nome alterado' }]);
    expect(text).not.toMatch(/super/i);
  });

  it('o instante sai em ISO 8601 UTC', async () => {
    const { user, cookie } = await newMember('Ivo');
    const before = Date.now();

    await update(user.id, { name: 'Ivo Lima' }, cookie);
    const [entry] = (await readHistory(user.id, cookie)).entries;

    expect(entry?.at).toMatch(ISO_UTC);
    expect(Date.parse(entry?.at ?? '')).toBeGreaterThanOrEqual(before - 1000);
  });

  it('a paginação por cursor nunca corta um save, e a última página não traz nextCursor', async () => {
    const { user, cookie } = await newMember('Joana 0');
    // Cada save grava duas linhas de `audit_log`: 25 saves, 50 linhas.
    for (let save = 1; save <= 25; save++) await update(user.id, { name: `Joana ${save}`, image: `joana-${save}.png` }, cookie);

    const first = await readHistory(user.id, cookie);
    const second = await readHistory(user.id, cookie, first.nextCursor);

    expect(first.entries).toHaveLength(20);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(second.entries).toHaveLength(5);
    expect(second).not.toHaveProperty('nextCursor');

    const entries = [...first.entries, ...second.entries];
    expect(entries.every((entry) => entry.changes.length === 2)).toBe(true);
    expect(entries.map((entry) => entry.changes[0]?.to)).toEqual(
      Array.from({ length: 25 }, (_, index) => `Joana ${25 - index}`),
    );
  });
});
