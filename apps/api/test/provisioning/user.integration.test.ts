// Cadastro de usuário em empresa existente e de super admin contra o Postgres
// real, pelas mesmas funções que os CLIs chamam. O login vai pelo `createApp`.
import {
  accounts,
  auditLog,
  createDatabase,
  createPool,
  memberships,
  userProfiles,
  users,
  uuidv7,
} from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createAuth } from '../../src/modules/auth/auth.js';
import { provisionTenant, ProvisioningError } from '../../src/provisioning/tenant.js';
import { createSuperAdmin, createUser } from '../../src/provisioning/user.js';
import { createTenant } from '../support/fixtures.js';
import { jsonRequest } from '../support/http.js';

const env = loadApiEnv();
const uniqueEmail = () => `${uuidv7()}@teste.local`;

describe('cadastro de usuário', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let slug: string;
  let tenantId: string;
  let otherSlug: string;

  const membershipsOf = (email: string) =>
    db.semTenant({ reason: 'cli' }, (tx) =>
      tx
        .select({ tenantId: memberships.tenantId, isDefault: memberships.isDefault })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(eq(users.email, email)),
    );

  const userRow = (email: string) =>
    db.semTenant({ reason: 'cli' }, async (tx) => {
      const [row] = await tx.select().from(users).where(eq(users.email, email));
      return row;
    });

  const login = (email: string, password: string) =>
    app.request('/auth/login', jsonRequest('POST', { email, password }));

  beforeAll(async () => {
    slug = `cadastro-${uuidv7().slice(-12)}`;
    const provisioned = await provisionTenant(db, {
      slug,
      name: 'Empresa de Cadastro',
      admin: { name: 'Admin', email: uniqueEmail() },
    });
    tenantId = provisioned.tenant.id;
    otherSlug = (await createTenant(db, 'outra')).slug;
    await provisionTenant(db, {
      slug: `${otherSlug}-p`,
      name: 'Outra',
      admin: { name: 'Admin Dois', email: uniqueEmail() },
    });
  });

  afterAll(() => pool.end());

  it('cria usuário, vínculo padrão e perfil de acesso, e o usuário consegue entrar', async () => {
    const email = uniqueEmail();
    const created = await createUser(db, { name: 'Bia', email: email.toUpperCase(), tenantSlug: slug, profile: 'Corretor' });

    expect(created).toMatchObject({ profile: 'Corretor', isDefault: true, user: { name: 'Bia', email } });
    expect(created.password).toBeTruthy();
    expect(await membershipsOf(email)).toEqual([{ tenantId, isDefault: true }]);

    const linked = await db.withTenant(tenantId, (tx) =>
      tx.select().from(userProfiles).where(eq(userProfiles.userId, created.user.id)),
    );
    expect(linked).toHaveLength(1);

    expect((await login(email, created.password!)).status).toBe(200);
  });

  it('e-mail já cadastrado ganha só o vínculo novo, não padrão, e mantém a senha', async () => {
    const email = uniqueEmail();
    const first = await createUser(db, { name: 'Caio', email, tenantSlug: slug, profile: 'Gestor' });
    const second = await createUser(db, { name: 'Outro Nome', email, tenantSlug: `${otherSlug}-p`, profile: 'Admin' });

    expect(second.password).toBeNull();
    expect(second.isDefault).toBe(false);
    expect(second.user.name).toBe('Caio');
    expect(await membershipsOf(email)).toHaveLength(2);
    expect((await membershipsOf(email)).filter((m) => m.isDefault)).toHaveLength(1);
    expect((await login(email, first.password!)).status).toBe(200);
  });

  it('e-mail de super admin segue a mesma regra, sem tratamento próprio', async () => {
    const admin = await createSuperAdmin(db, { name: 'Dev', email: uniqueEmail() });
    const created = await createUser(db, { name: 'Dev', email: admin.email, tenantSlug: slug, profile: 'Corretor' });

    expect(created.password).toBeNull();
    expect(JSON.stringify(created)).not.toMatch(/super/i);
  });

  it('vínculo duplicado com a mesma empresa falha sem gravar', async () => {
    const email = uniqueEmail();
    await createUser(db, { name: 'Dani', email, tenantSlug: slug, profile: 'Corretor' });
    const logBefore = (await db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(auditLog))).length;

    await expect(createUser(db, { name: 'Dani', email, tenantSlug: slug, profile: 'Gestor' })).rejects.toThrow(
      /já tem vínculo/,
    );
    expect(await membershipsOf(email)).toHaveLength(1);
    expect((await db.semTenant({ reason: 'cli' }, (tx) => tx.select().from(auditLog))).length).toBe(logBefore);
  });

  it.each([
    ['slug inexistente', { tenantSlug: 'nao-existe-mesmo', profile: 'Corretor' }, /nao-existe-mesmo/],
    ['perfil inexistente na empresa', { profile: 'Fantasma' }, /Fantasma/],
    ['e-mail inválido', { email: 'sem-arroba' }, /e-mail válido/],
    ['nome vazio', { name: ' ' }, /nome/],
  ])('%s falha antes de gravar, nomeando o problema', async (_label, override, message) => {
    const email = uniqueEmail();
    const input = { name: 'Eva', email, tenantSlug: slug, profile: 'Corretor', ...override };

    await expect(createUser(db, input)).rejects.toThrow(ProvisioningError);
    await expect(createUser(db, input)).rejects.toThrow(message);
    expect(await userRow(input.email)).toBeUndefined();
  });

  it('é tudo ou nada: falha no meio não deixa usuário nem credencial', async () => {
    const email = uniqueEmail();
    // A falha vem do perfil inexistente, que só é conferido dentro da transação.
    await expect(createUser(db, { name: 'Fabi', email, tenantSlug: slug, profile: 'Nada' })).rejects.toThrow();

    const orphan = await db.semTenant({ reason: 'cli' }, (tx) =>
      tx.select().from(accounts).innerJoin(users, eq(users.id, accounts.userId)).where(eq(users.email, email)),
    );
    expect(orphan).toEqual([]);
  });

  it('audita sem o hash da senha, com autor nulo', async () => {
    const email = uniqueEmail();
    const created = await createUser(db, { name: 'Gil', email, tenantSlug: slug, profile: 'Corretor' });

    const rows = await db.withTenant(tenantId, (tx) =>
      tx.select().from(auditLog).where(eq(auditLog.entityId, created.user.id)).orderBy(asc(auditLog.id)),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.userId === null)).toBe(true);
    expect(rows.some((row) => /password/i.test(row.field))).toBe(false);
  });
});

describe('criação de super admin', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);

  afterAll(() => pool.end());

  it('nasce com a flag, sem nenhum vínculo, e com auditoria de plataforma', async () => {
    const email = uniqueEmail();
    const admin = await createSuperAdmin(db, { name: 'Raiz', email });

    const { user, links, log } = await db.semTenant({ reason: 'cli' }, async (tx) => ({
      user: (await tx.select().from(users).where(eq(users.id, admin.id)))[0],
      links: await tx.select().from(memberships).where(eq(memberships.userId, admin.id)),
      log: await tx.select().from(auditLog).where(eq(auditLog.entityId, admin.id)),
    }));
    expect(user?.isSuperAdmin).toBe(true);
    expect(links).toEqual([]);
    expect(admin.password).toBeTruthy();
    expect(log.every((row) => row.tenantId === null && row.userId === null)).toBe(true);
    expect(log.some((row) => /password/i.test(row.field))).toBe(false);
  });

  it('e-mail existente falha sem revelar se é super admin e orienta o grant', async () => {
    const email = uniqueEmail();
    await createSuperAdmin(db, { name: 'Raiz', email });
    const plain = await db.semTenant({ reason: 'cli' }, (tx) =>
      tx.insert(users).values({ name: 'Comum', email: uniqueEmail() }).returning({ email: users.email }),
    );

    const messages = await Promise.all(
      [email, plain[0]!.email].map((taken) =>
        createSuperAdmin(db, { name: 'X', email: taken }).then(
          () => '',
          (error: Error) => error.message,
        ),
      ),
    );
    for (const message of messages) expect(message).toMatch(/super-admin grant/);
    const withoutEmail = messages.map((message) => message.replace(/\S+@teste\.local/, '<e-mail>'));
    expect(withoutEmail[0]).toBe(withoutEmail[1]);
  });

  it('e-mail inválido falha antes de gravar', async () => {
    await expect(createSuperAdmin(db, { name: 'X', email: 'ruim' })).rejects.toThrow(ProvisioningError);
  });
});
