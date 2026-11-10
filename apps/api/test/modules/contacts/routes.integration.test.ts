// Contatos por HTTP, contra o Postgres real: cadastro mínimo, papéis, histórico,
// acesso (base compartilhada, 403 antes do banco) e isolamento entre empresas.
import { auditedWrites, createDatabase, createPool, userProfiles } from '@crm/db';
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
  taxId: string | null;
  roles: string[];
}

interface HistoryBody {
  entries: { title: string; children: { title: string }[] }[];
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
  describe('documento', () => {
    const cpf = (n: number) => ['52998224725', '12345678909', '10000000019'][n]!;
    const pj = (taxId: string | null, name = 'Agro') => ({ personType: 'pj', name, roles: ['owner'], taxId });
    const pf = (taxId: string | null, name = 'Pessoa') => ({ personType: 'pf', name, roles: ['buyer'], taxId });

    it('formatado e sem formatação gravam o mesmo valor', async () => {
      const formatted = await created(pf('529.982.247-25', 'Com pontuação'));
      expect(formatted.taxId).toBe('52998224725');
      expect(((await (await read(`/${formatted.id}`)).json()) as ContactBody).taxId).toBe('52998224725');

      const pjFormatted = await created(pj('11.222.333/0001-81', 'PJ formatado'));
      expect(pjFormatted.taxId).toBe('11222333000181');
      expect((await create(pj('11222333000181', 'PJ cru'))).status).toBe(409);
    });

    it('aceita CNPJ alfanumérico e grava em maiúsculas', async () => {
      const contact = await created(pj('12.abc.345/01de-35', 'Alfa'));
      expect(contact.taxId).toBe('12ABC34501DE35');
    });

    it.each([
      ['CNPJ em PF', pf('11222333000181')],
      ['CPF em PJ', pj('52998224725')],
      ['CPF com dígito errado', pf('52998224726')],
      ['CNPJ com dígito errado', pj('11222333000182')],
      ['sequência repetida', pf('11111111111')],
    ])('recusa %s com 400 no campo do documento', async (_label, body) => {
      const response = await create(body);
      expect(response.status).toBe(400);
      expect(JSON.stringify(await response.json())).toContain('taxId');
    });

    it('repetido na empresa é 409 com o contato existente', async () => {
      const first = await created(pf(cpf(1), 'Primeiro'));
      const response = await create(pf('123.456.789-09', 'Segundo'));

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({
        error: { code: 'conflict', existing: { id: first.id, name: 'Primeiro' } },
      });
      const page = (await (await read('?q=Segundo')).json()) as { total: number };
      expect(page.total).toBe(0);
    });

    it('duas empresas podem ter o mesmo documento', async () => {
      const mine = await created(pf(cpf(2), 'Minha empresa'));
      const theirs = await app.request(url('', other.slug), jsonRequest('POST', pf(cpf(2), 'Outra empresa'), outsiderCookie));

      expect(mine.taxId).toBe(cpf(2));
      expect(theirs.status).toBe(201);
    });

    it('vários contatos sem documento convivem', async () => {
      const [a, b, c] = await Promise.all([
        create(pf(null, 'Sem doc 1')),
        create({ personType: 'pf', name: 'Sem doc 2', roles: ['buyer'] }),
        create(pf('', 'Sem doc 3')),
      ]);
      expect([a.status, b.status, c.status]).toEqual([201, 201, 201]);
    });

    it('na edição, trocar para um documento alheio é 409; o próprio documento passa', async () => {
      const owner = await created(pf('39053344705', 'Dona do documento'));
      const other2 = await created(pf(null, 'Quer o documento'));

      const taken = await patch(other2.id, { taxId: '390.533.447-05' });
      expect(taken.status).toBe(409);
      expect(await taken.json()).toMatchObject({ error: { existing: { id: owner.id } } });

      expect((await patch(owner.id, { taxId: '39053344705', name: 'Mesma dona' })).status).toBe(200);
    });

    it('na edição, o documento é conferido contra o tipo de pessoa do cadastro', async () => {
      const contact = await created(pf('86288366757', 'Vai virar PJ'));

      expect((await patch(contact.id, { personType: 'pj' })).status).toBe(400);
      expect((await patch(contact.id, { taxId: '11222333000191' })).status).toBe(400);
      expect(((await (await read(`/${contact.id}`)).json()) as ContactBody).taxId).toBe('86288366757');

      expect((await patch(contact.id, { personType: 'pj', taxId: '45.723.174/0001-10' })).status).toBe(200);
    });

    it('retirar o documento (null) é permitido', async () => {
      const contact = await created(pf('10000791989', 'Sem mais doc'));
      const response = await patch(contact.id, { taxId: null });
      expect(((await response.json()) as ContactBody).taxId).toBeNull();
    });

    it('o documento aparece formatado no histórico', async () => {
      const contact = await created(pf('45317828791', 'Histórico doc'));
      await patch(contact.id, { taxId: '39053344705' });
      expect(JSON.stringify(await history(contact.id))).toContain('Documento');
    });
  });
});
