// Contatos por HTTP, contra o Postgres real: cadastro mínimo, papéis, histórico,
// acesso (base compartilhada, 403 antes do banco) e isolamento entre empresas.
import { auditedWrites, contactClassifications, createDatabase, createPool, leadSources, userProfiles } from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import {
  createLinkedAccessProfile,
  createMembership,
  createTenant,
  createUserWithPassword,
} from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

interface ContactBody {
  id: string;
  name: string;
  personType: string;
  legalName: string | null;
  roles: string[];
  classificationId: string | null;
  leadSourceId: string | null;
}

interface HistoryBody {
  entries: { title: string; changes: { field: string; from: string | null; to: string | null }[]; children: { title: string }[] }[];
}

describe('contatos', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let other: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let brokerCookie: string;
  let otherBrokerCookie: string;
  let noAccessCookie: string;
  let readOnlyCookie: string;
  let outsiderCookie: string;
  let classA: string;
  let referral: string;

  const url = (path = '', slug = tenant.slug) => `/e/${slug}/contacts${path}`;
  const create = (body: unknown, cookie = managerCookie) => app.request(url(), jsonRequest('POST', body, cookie));
  const patch = (id: string, body: unknown, cookie = managerCookie, slug = tenant.slug) =>
    app.request(url(`/${id}`, slug), jsonRequest('PATCH', body, cookie));
  const read = (path: string, cookie = managerCookie, slug = tenant.slug) =>
    app.request(url(path, slug), { headers: { cookie } });
  const created = async (body: unknown, cookie = managerCookie) => (await create(body, cookie)).json() as Promise<ContactBody>;
  const history = async (id: string) => (await (await read(`/${id}/history`)).json()) as HistoryBody;

  beforeAll(async () => {
    tenant = await createTenant(db, 'contatos');
    other = await createTenant(db, 'contatos-alheia');
    const [manager, broker, otherBroker, noAccess, readOnly, outsider] = await Promise.all(
      ['Gestora', 'Corretor', 'Outro corretor', 'Sem acesso', 'Só leitura', 'De outra empresa'].map((name) =>
        createUserWithPassword(db, name),
      ),
    );
    const users = { manager: manager!, broker: broker!, otherBroker: otherBroker!, noAccess: noAccess!, readOnly: readOnly!, outsider: outsider! };
    for (const user of [users.manager, users.broker, users.otherBroker, users.noAccess, users.readOnly]) {
      await createMembership(db, user.id, tenant.id, { isDefault: true });
    }
    await createMembership(db, users.outsider.id, other.id, { isDefault: true });

    // Os perfis semeados de verdade: Corretor é o da produção.
    const profiles = await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: users.manager.id, profileId: ids.get('Admin')! },
        { tenantId: tenant.id, userId: users.broker.id, profileId: ids.get('Corretor')! },
        { tenantId: tenant.id, userId: users.otherBroker.id, profileId: ids.get('Corretor')! },
      ]);
      return ids;
    });
    expect(profiles.has('Corretor')).toBe(true);
    await createLinkedAccessProfile(db, tenant.id, users.noAccess.id, 'Sem nada');
    await createLinkedAccessProfile(db, tenant.id, users.readOnly.id, 'Leitor', { permissions: ['contatos.ver'] });
    await createLinkedAccessProfile(db, other.id, users.outsider.id, 'Admin', {
      permissions: ['contatos.ver', 'contatos.criar', 'contatos.editar', 'contatos.excluir'],
    });

    [classA, referral] = await db.withTenant(tenant.id, async (tx) => {
      const [a] = await tx.insert(contactClassifications).values({ tenantId: tenant.id, name: 'A' }).returning();
      const [indicacao] = await tx.insert(leadSources).values({ tenantId: tenant.id, name: 'Indicação' }).returning();
      return [a!.id, indicacao!.id] as const;
    });

    managerCookie = await loginAs(app, users.manager);
    brokerCookie = await loginAs(app, users.broker);
    otherBrokerCookie = await loginAs(app, users.otherBroker);
    noAccessCookie = await loginAs(app, users.noAccess);
    readOnlyCookie = await loginAs(app, users.readOnly);
    outsiderCookie = await loginAs(app, users.outsider);
  });

  afterAll(() => pool.end());

  describe('cadastro', () => {
    it('cria só com nome, tipo de pessoa e um papel', async () => {
      const response = await create({ personType: 'pf', name: '  Sebastião  ', roles: ['external_broker'] });

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({
        name: 'Sebastião',
        personType: 'pf',
        legalName: null,
        roles: ['external_broker'],
      });
    });

    it.each([
      ['sem papel', { personType: 'pf', name: 'A' }],
      ['com lista de papéis vazia', { personType: 'pf', name: 'A', roles: [] }],
      ['com papel desconhecido', { personType: 'pf', name: 'A', roles: ['rei'] }],
      ['sem nome', { personType: 'pf', name: '  ', roles: ['buyer'] }],
      ['sem tipo de pessoa', { name: 'A', roles: ['buyer'] }],
      ['com e-mail inválido', { personType: 'pf', name: 'A', roles: ['buyer'], email: 'nao-e-email' }],
    ])('recusa %s com 400', async (_label, body) => {
      expect((await create(body)).status).toBe(400);
    });

    it('guarda a razão social de PJ e limpa ao passar para PF', async () => {
      const pj = await created({ personType: 'pj', name: 'Fazenda Boa', legalName: 'Boa Agro Ltda', roles: ['owner'] });
      expect(pj.legalName).toBe('Boa Agro Ltda');

      const response = await patch(pj.id, { personType: 'pf' });

      expect(await response.json()).toMatchObject({ personType: 'pf', legalName: null });
      expect(await (await read(`/${pj.id}`)).json()).toMatchObject({ legalName: null });
    });

    it('PF não guarda razão social enviada no cadastro', async () => {
      const pf = await created({ personType: 'pf', name: 'Maria', legalName: 'Indevida', roles: ['buyer'] });
      expect(pf.legalName).toBeNull();
    });

    it('edita os campos e normaliza o e-mail', async () => {
      const contact = await created({ personType: 'pf', name: 'Edita', roles: ['buyer'] });

      const response = await patch(contact.id, { name: 'Editado', email: ' EDITA@Exemplo.com ', strategicNotes: 'Prefere ligar' });

      expect(await response.json()).toMatchObject({ name: 'Editado', email: 'edita@exemplo.com', strategicNotes: 'Prefere ligar' });
    });
  });

  describe('papéis', () => {
    it('o PATCH com roles substitui o conjunto', async () => {
      const contact = await created({ personType: 'pf', name: 'Papéis', roles: ['buyer', 'owner'] });

      const response = await patch(contact.id, { roles: ['owner', 'external_broker'] });

      expect(((await response.json()) as ContactBody).roles).toEqual(['owner', 'external_broker']);
      expect(((await (await read(`/${contact.id}`)).json()) as ContactBody).roles).toEqual(['owner', 'external_broker']);
    });

    it('retirar o último papel é 400 e nada muda', async () => {
      const contact = await created({ personType: 'pf', name: 'Único', roles: ['buyer'] });

      expect((await patch(contact.id, { roles: [] })).status).toBe(400);
      expect(((await (await read(`/${contact.id}`)).json()) as ContactBody).roles).toEqual(['buyer']);
    });

    it('o histórico mostra o papel incluído e o retirado como filhos', async () => {
      const contact = await created({ personType: 'pf', name: 'Histórico', roles: ['external_broker'] });
      await patch(contact.id, { roles: ['external_broker', 'buyer'] });
      await patch(contact.id, { roles: ['buyer'] });

      const { entries } = await history(contact.id);

      expect(entries.map((entry) => entry.title)).toEqual(['Papel removido', 'Papel adicionado', 'Contato cadastrado']);
      expect(entries[0]?.children.map((child) => child.title)).toEqual(['Papel removido: Corretor externo']);
      expect(entries[1]?.children.map((child) => child.title)).toEqual(['Papel adicionado: Comprador']);
    });

    it('trocar nome e papéis no mesmo save é uma entrada só', async () => {
      const contact = await created({ personType: 'pf', name: 'Junto', roles: ['buyer'] });
      await patch(contact.id, { name: 'Junto e Misturado', roles: ['buyer', 'owner'] });

      const { entries } = await history(contact.id);

      expect(entries[0]).toMatchObject({ title: '2 alterações', children: [{ title: 'Papel adicionado: Proprietário' }] });
    });
  });

  describe('classificação e origem do lead', () => {
    it('grava a origem em qualquer papel e a classificação no comprador', async () => {
      const response = await create({
        personType: 'pf',
        name: 'Classificado',
        roles: ['buyer'],
        classificationId: classA,
        leadSourceId: referral,
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ classificationId: classA, leadSourceId: referral });
      const owner = await created({ personType: 'pf', name: 'Dono', roles: ['owner'], leadSourceId: referral });
      expect(owner.leadSourceId).toBe(referral);
      expect(owner.classificationId).toBeNull();
    });

    it('classificationId em contato sem comprador é 400, no cadastro e na edição', async () => {
      expect((await create({ personType: 'pf', name: 'Sem comprador', roles: ['owner'], classificationId: classA })).status).toBe(400);

      const owner = await created({ personType: 'pf', name: 'Só dono', roles: ['owner'] });
      expect((await patch(owner.id, { classificationId: classA })).status).toBe(400);
      // Retirar o papel e classificar no mesmo save também é incoerente.
      const buyer = await created({ personType: 'pf', name: 'Troca', roles: ['buyer', 'owner'] });
      expect((await patch(buyer.id, { roles: ['owner'], classificationId: classA })).status).toBe(400);
    });

    it('recusa classificação e origem que não existem na empresa', async () => {
      const unknown = '0197c000-0000-7000-8000-00000000dead';
      expect((await create({ personType: 'pf', name: 'X', roles: ['buyer'], classificationId: unknown })).status).toBe(400);
      expect((await create({ personType: 'pf', name: 'Y', roles: ['buyer'], leadSourceId: unknown })).status).toBe(400);
    });

    it('retirar o papel comprador apaga a classificação no mesmo save, e o histórico guarda o valor anterior', async () => {
      const contact = await created({
        personType: 'pf',
        name: 'Deixa de comprar',
        roles: ['buyer', 'owner'],
        classificationId: classA,
        leadSourceId: referral,
      });

      const response = await patch(contact.id, { roles: ['owner'] });

      expect(await response.json()).toMatchObject({ roles: ['owner'], classificationId: null, leadSourceId: referral });
      expect(await (await read(`/${contact.id}`)).json()).toMatchObject({ classificationId: null });
      const { entries } = await history(contact.id);
      expect(entries).toHaveLength(2);
      expect(entries[0]?.changes).toContainEqual({ field: 'Classificação', from: 'A', to: null });
      expect(entries[0]?.children.map((child) => child.title)).toEqual(['Papel removido: Comprador']);
    });

    it('retirar o comprador de quem não tem classificação não escreve nada além do papel', async () => {
      const contact = await created({ personType: 'pf', name: 'Sem classe', roles: ['buyer', 'owner'] });
      await patch(contact.id, { roles: ['owner'] });

      const { entries } = await history(contact.id);
      expect(entries[0]?.changes).toEqual([]);
    });

    it('limpar a origem e a classificação com nulo registra o valor anterior', async () => {
      const contact = await created({ personType: 'pf', name: 'Limpa', roles: ['buyer'], classificationId: classA, leadSourceId: referral });

      await patch(contact.id, { classificationId: null, leadSourceId: null });

      const { entries } = await history(contact.id);
      expect(entries[0]?.changes).toEqual(
        expect.arrayContaining([
          { field: 'Classificação', from: 'A', to: null },
          { field: 'Origem do lead', from: 'Indicação', to: null },
        ]),
      );
    });
  });

  describe('listagem', () => {
    it('ordena por nome, desempata por id e conta o total', async () => {
      const slug = `lista-${crypto.randomUUID().slice(0, 8)}`;
      const names = ['Zélia', 'Beto', 'Ana', 'Álvaro'];
      for (const name of names) await created({ personType: 'pf', name: `${slug} ${name}`, roles: ['buyer'] });

      const page = (await (await read(`?q=${slug}&pageSize=25`)).json()) as { items: ContactBody[]; total: number };

      expect(page.total).toBe(4);
      expect(page.items.map((item) => item.name.slice(slug.length + 1))).toEqual(['Álvaro', 'Ana', 'Beto', 'Zélia']);
    });

    it('busca sem acento', async () => {
      await created({ personType: 'pf', name: 'Conceição Buscável', roles: ['buyer'] });
      const page = (await (await read('?q=conceicao%20buscavel')).json()) as { total: number };
      expect(page.total).toBe(1);
    });
  });

  describe('acesso', () => {
    it('o corretor vê o contato que outro corretor cadastrou (base compartilhada)', async () => {
      const contact = await created({ personType: 'pf', name: 'Do colega', roles: ['buyer'] }, otherBrokerCookie);

      expect((await read(`/${contact.id}`, brokerCookie)).status).toBe(200);
      const page = (await (await read('?q=Do%20colega', brokerCookie)).json()) as { total: number };
      expect(page.total).toBe(1);
      expect((await patch(contact.id, { name: 'Do colega 2' }, brokerCookie)).status).toBe(200);
    });

    it('sem contatos.ver, lista, ficha e histórico são 403', async () => {
      const contact = await created({ personType: 'pf', name: 'Fechado', roles: ['buyer'] });

      for (const path of ['', `/${contact.id}`, `/${contact.id}/history`]) {
        expect((await read(path, noAccessCookie)).status).toBe(403);
      }
    });

    it('sem contatos.criar/editar, as escritas são 403', async () => {
      const contact = await created({ personType: 'pf', name: 'Protegido', roles: ['buyer'] });

      expect((await create({ personType: 'pf', name: 'X', roles: ['buyer'] }, readOnlyCookie)).status).toBe(403);
      expect((await patch(contact.id, { name: 'Y' }, readOnlyCookie)).status).toBe(403);
      expect(((await (await read(`/${contact.id}`)).json()) as ContactBody).name).toBe('Protegido');
    });
  });

  describe('outra empresa', () => {
    it('é 404 em toda rota', async () => {
      const contact = await created({ personType: 'pf', name: 'Só desta empresa', roles: ['buyer'] });

      expect((await read(`/${contact.id}`, outsiderCookie, other.slug)).status).toBe(404);
      expect((await read(`/${contact.id}/history`, outsiderCookie, other.slug)).status).toBe(404);
      expect((await patch(contact.id, { name: 'Invadido' }, outsiderCookie, other.slug)).status).toBe(404);
      const page = (await (await read('?q=Só%20desta', outsiderCookie, other.slug)).json()) as { total: number };
      expect(page.total).toBe(0);
      expect(((await (await read(`/${contact.id}`)).json()) as ContactBody).name).toBe('Só desta empresa');
    });

    it('id malformado é 404', async () => {
      expect((await read('/nao-e-uuid')).status).toBe(404);
      expect((await read('/nao-e-uuid/history')).status).toBe(404);
    });
  });
});
