// Praças com municípios atendidos e a sugestão de praça, por HTTP contra o Postgres real.
import { auditLog, createDatabase, createPool, tradingPostMunicipalities, tradingPosts } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { and, eq, inArray, or } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
} from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

const RIO_VERDE = '5218805';
const JATAI = '5211909';
const GOIANIA = '5208707';
const ANAPOLIS = '5201108';
const APARECIDA = '5201405';

interface Municipality {
  ibgeCode: string;
  name: string;
  uf: string;
}
interface Post {
  id: string;
  name: string;
  active: boolean;
  municipalities: Municipality[];
}

describe('cadastros auxiliares — Praças', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let otherTenant: Awaited<ReturnType<typeof createTenant>>;
  let manager: Awaited<ReturnType<typeof createUserWithPassword>>;
  let managerCookie: string;
  let brokerCookie: string;
  let otherCookie: string;

  const send = (method: string, path: string, body?: unknown, cookie = managerCookie) =>
    app.request(
      `/e/${tenant.slug}/settings${path}`,
      body === undefined ? { method, headers: { cookie } } : jsonRequest(method, body, cookie),
    );
  const posts = (method: string, path: string, body?: unknown, cookie = managerCookie) =>
    send(method, `/vocabularies/trading-posts${path}`, body, cookie);
  const create = (name: string, municipalities?: string[]) => posts('POST', '', { name, municipalities });
  const createOk = async (name: string, municipalities?: string[]): Promise<Post> => {
    const response = await create(name, municipalities);
    expect(response.status).toBe(201);
    return (await response.json()) as Post;
  };
  const suggest = async (municipality: string, cookie = managerCookie) => {
    const response = await send('GET', `/trading-posts/suggestion?municipality=${municipality}`, undefined, cookie);
    expect(response.status).toBe(200);
    return ((await response.json()) as { tradingPost: { id: string; name: string } | null }).tradingPost;
  };
  const codesOf = (post: Post) => post.municipalities.map((municipality) => municipality.ibgeCode).sort();

  beforeAll(async () => {
    tenant = await createTenant(db, 'pracas');
    otherTenant = await createTenant(db, 'pracas-alheia');
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

  const clear = () => db.withTenant(tenant.id, (tx) => tx.delete(tradingPosts));

  describe('municípios atendidos', () => {
    it('cria a praça com os municípios num save só', async () => {
      await clear();
      const post = await createOk('Sudoeste', [RIO_VERDE, JATAI]);

      expect(post).toMatchObject({ name: 'Sudoeste', active: true });
      expect(post.municipalities).toEqual([
        { ibgeCode: JATAI, name: 'Jataí', uf: 'GO' },
        { ibgeCode: RIO_VERDE, name: 'Rio Verde', uf: 'GO' },
      ]);
    });

    it('praça sem municípios devolve a lista vazia', async () => {
      await clear();
      expect((await createOk('Vazia')).municipalities).toEqual([]);
    });

    it('município de outra praça é 409, nomeando-a, e nada é gravado', async () => {
      await clear();
      await createOk('Jataí', [RIO_VERDE]);

      const response = await create('Norte', [GOIANIA, RIO_VERDE]);

      expect(response.status).toBe(409);
      expect(((await response.json()) as { error: { message: string } }).error.message).toBe(
        'Rio Verde — GO já é atendido pela praça Jataí.',
      );
      const names = await db.withTenant(tenant.id, (tx) => tx.select({ name: tradingPosts.name }).from(tradingPosts));
      expect(names).toEqual([{ name: 'Jataí' }]);
    });

    it('PATCH troca nome e municípios num save só e recusa município de outra praça', async () => {
      await clear();
      const first = await createOk('Primeira', [RIO_VERDE]);
      const second = await createOk('Segunda', [JATAI]);

      const conflict = await posts('PATCH', `/${second.id}`, { name: 'Renomeada', municipalities: [RIO_VERDE, GOIANIA] });
      expect(conflict.status).toBe(409);
      expect(((await conflict.json()) as { error: { message: string } }).error.message).toBe(
        'Rio Verde — GO já é atendido pela praça Primeira.',
      );

      const ok = await posts('PATCH', `/${second.id}`, { name: 'Renomeada', municipalities: [GOIANIA, JATAI] });
      expect(ok.status).toBe(200);
      const body = (await ok.json()) as Post;
      expect(body.name).toBe('Renomeada');
      expect(codesOf(body)).toEqual([GOIANIA, JATAI]);
      expect(codesOf((await (await posts('GET', '')).json() as { items: Post[] }).items.find((p) => p.id === first.id)!)).toEqual([RIO_VERDE]);
    });

    it('PATCH sem municípios os preserva; com lista vazia, os remove', async () => {
      await clear();
      const post = await createOk('Mantida', [RIO_VERDE]);

      const renamed = (await (await posts('PATCH', `/${post.id}`, { name: 'Mantida 2' })).json()) as Post;
      expect(codesOf(renamed)).toEqual([RIO_VERDE]);

      const emptied = (await (await posts('PATCH', `/${post.id}`, { municipalities: [] })).json()) as Post;
      expect(emptied.municipalities).toEqual([]);
    });

    it('município inexistente ou repetido: inexistente é 400; repetido conta uma vez', async () => {
      await clear();
      expect((await create('Fantasma', ['0000000'])).status).toBe(400);
      expect((await create('Mal formado', ['abc'])).status).toBe(400);
      expect(codesOf(await createOk('Repetido', [RIO_VERDE, RIO_VERDE]))).toEqual([RIO_VERDE]);
    });

    it('cadastro sem municípios atendidos recusa o campo', async () => {
      const response = await send('POST', '/vocabularies/crops', { name: 'Soja X', municipalities: [RIO_VERDE] });
      expect(response.status).toBe(400);
    });

    it('a listagem de administração traz os municípios', async () => {
      await clear();
      await createOk('Listada', [RIO_VERDE]);
      const page = (await (await posts('GET', '')).json()) as { items: Post[] };
      expect(codesOf(page.items[0]!)).toEqual([RIO_VERDE]);
    });

    it('excluir a praça remove os seus municípios', async () => {
      await clear();
      const post = await createOk('Efêmera', [RIO_VERDE, JATAI]);

      expect((await posts('DELETE', `/${post.id}`)).status).toBe(204);

      const rows = await db.withTenant(tenant.id, (tx) => tx.select().from(tradingPostMunicipalities));
      expect(rows).toEqual([]);
      // o município fica livre para outra praça
      expect(codesOf(await createOk('Outra', [RIO_VERDE]))).toEqual([RIO_VERDE]);
    });

    it('praça inativa mantém os seus municípios reservados', async () => {
      await clear();
      const post = await createOk('Dormente', [RIO_VERDE]);
      const off = (await (await posts('PATCH', `/${post.id}`, { active: false })).json()) as Post;
      expect(codesOf(off)).toEqual([RIO_VERDE]);

      const response = await create('Concorrente', [RIO_VERDE]);
      expect(response.status).toBe(409);
    });

    it('audita a inclusão e a remoção de municípios, com o autor', async () => {
      await clear();
      // Códigos que só este teste usa: a trilha da empresa acumula as escritas dos demais.
      const post = await createOk('Auditada', [ANAPOLIS]);
      await posts('PATCH', `/${post.id}`, { municipalities: [APARECIDA] });

      const rows = await db.withTenant(tenant.id, (tx) =>
        tx
          .select()
          .from(auditLog)
          .where(
            and(
              eq(auditLog.entity, 'trading_post_municipalities'),
              eq(auditLog.field, 'municipality_ibge_code'),
              or(
                inArray(auditLog.newValue, [ANAPOLIS, APARECIDA]),
                inArray(auditLog.oldValue, [ANAPOLIS, APARECIDA]),
              ),
            ),
          ),
      );
      expect(rows.map((row) => [row.oldValue, row.newValue]).sort()).toEqual(
        [
          [null, ANAPOLIS],
          [null, APARECIDA],
          [ANAPOLIS, null],
        ].sort(),
      );
      expect(new Set(rows.map((row) => row.userId))).toEqual(new Set([manager.id]));
    });
  });

  describe('sugestão de praça', () => {
    it('devolve a praça ativa que atende o município, ou null', async () => {
      await clear();
      const post = await createOk('Sudoeste', [RIO_VERDE]);

      expect(await suggest(RIO_VERDE)).toEqual({ id: post.id, name: 'Sudoeste' });
      expect(await suggest(JATAI)).toBeNull();
    });

    it('ignora a praça inativa', async () => {
      await clear();
      const post = await createOk('Inativa', [RIO_VERDE]);
      await posts('PATCH', `/${post.id}`, { active: false });

      expect(await suggest(RIO_VERDE)).toBeNull();
    });

    it('usuário sem configuracoes.gerenciar lê a sugestão', async () => {
      await clear();
      const post = await createOk('Aberta', [RIO_VERDE]);

      expect(await suggest(RIO_VERDE, brokerCookie)).toEqual({ id: post.id, name: 'Aberta' });
    });

    it('não vaza a praça de outra empresa', async () => {
      await clear();
      await createOk('Só minha', [RIO_VERDE]);
      const response = await app.request(`/e/${otherTenant.slug}/settings/trading-posts/suggestion?municipality=${RIO_VERDE}`, {
        headers: { cookie: otherCookie },
      });

      expect(await response.json()).toEqual({ tradingPost: null });
    });

    it('exige um código IBGE de sete dígitos', async () => {
      expect((await send('GET', '/trading-posts/suggestion?municipality=abc')).status).toBe(400);
      expect((await send('GET', '/trading-posts/suggestion')).status).toBe(400);
    });
  });
});
