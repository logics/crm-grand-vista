// Contatos por HTTP, contra o Postgres real: cadastro mínimo, papéis, histórico,
// acesso (base compartilhada, 403 antes do banco) e isolamento entre empresas.
import { auditedWrites, contactClassifications, contacts, createDatabase, createPool, leadSources, userProfiles } from '@crm/db';
import { eq, inArray } from 'drizzle-orm';
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
  classificationId: string | null;
  leadSourceId: string | null;
  phone: string | null;
  whatsapp: string | null;
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

  describe('telefones', () => {
    it('grava telefone e WhatsApp em formato internacional', async () => {
      const response = await create({
        personType: 'pf',
        name: 'Com telefone',
        roles: ['buyer'],
        phone: '(64) 99999-0000',
        whatsapp: '+351 912 345 678',
      });

      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ phone: '+5564999990000', whatsapp: '+351912345678' });
    });

    it('sem telefone, os campos voltam nulos; vazio apaga na edição', async () => {
      const contact = await created({ personType: 'pf', name: 'Sem telefone', roles: ['buyer'], phone: '(64) 99999-0000' });
      expect(await created({ personType: 'pf', name: 'Sem nada', roles: ['buyer'] })).toMatchObject({ phone: null, whatsapp: null });

      const response = await patch(contact.id, { phone: '' });

      expect(await response.json()).toMatchObject({ phone: null });
    });

    it.each([
      ['DDD inexistente', { phone: '(10) 99999-0000' }],
      ['tamanho errado', { phone: '(64) 9999' }],
      ['WhatsApp inválido', { whatsapp: 'abc' }],
    ])('telefone com %s é 400', async (_case, extra) => {
      expect((await create({ personType: 'pf', name: 'Inválido', roles: ['buyer'], ...extra })).status).toBe(400);
      const contact = await created({ personType: 'pf', name: 'Inválido na edição', roles: ['buyer'] });
      expect((await patch(contact.id, extra)).status).toBe(400);
    });

    it('o histórico mostra os números formatados', async () => {
      const contact = await created({ personType: 'pf', name: 'Histórico de telefone', roles: ['buyer'], phone: '64999990000' });
      await patch(contact.id, { phone: '(11) 3333-4444', whatsapp: '+351912345678' });

      const { entries } = await history(contact.id);

      expect(entries[0]?.changes).toEqual(
        expect.arrayContaining([
          { field: 'Telefone', from: '(64) 99999-0000', to: '(11) 3333-4444' },
          { field: 'WhatsApp', from: null, to: '+351912345678' },
        ]),
      );
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

    /** Marca única por teste: isola o que ele cadastrou do resto da empresa de teste. */
    const mark = () => `L${crypto.randomUUID().replaceAll('-', '').slice(0, 10)}`;
    const list = async (query: Record<string, string>) => {
      const response = await read(`?${new URLSearchParams(query)}`);
      expect(response.status).toBe(200);
      return (await response.json()) as { items: ContactBody[]; total: number; page: number; pageSize: number };
    };
    const names = (page: { items: ContactBody[] }, tag: string) => page.items.map((item) => item.name.replace(`${tag} `, ''));

    it('pagina com o total de todas as páginas', async () => {
      const tag = mark();
      for (let i = 0; i < 27; i++) await created({ personType: 'pf', name: `${tag} ${String(i).padStart(2, '0')}`, roles: ['buyer'] });

      const first = await list({ q: tag, pageSize: '25' });
      const second = await list({ q: tag, pageSize: '25', page: '2' });
      const beyond = await list({ q: tag, pageSize: '25', page: '3' });

      expect([first.items.length, second.items.length, beyond.items.length]).toEqual([25, 2, 0]);
      expect([first.total, second.total, beyond.total]).toEqual([27, 27, 27]);
      expect(second).toMatchObject({ page: 2, pageSize: 25 });
    });

    describe('busca', () => {
      it('acha pela razão social e pelo e-mail, sem caixa nem acento', async () => {
        const tag = mark();
        await created({ personType: 'pj', name: `${tag} Fantasia`, legalName: 'Agropecuária São João Ltda', roles: ['owner'] });
        await created({ personType: 'pf', name: `${tag} Com e-mail`, email: 'Contato.Rural@Exemplo.com.br', roles: ['buyer'] });

        expect((await list({ q: 'agropecuaria sao joao' })).items.map((item) => item.name)).toContain(`${tag} Fantasia`);
        expect((await list({ q: 'AGROPECUÁRIA' })).items.map((item) => item.name)).toContain(`${tag} Fantasia`);
        expect((await list({ q: 'contato.rural@exemplo' })).items.map((item) => item.name)).toEqual([`${tag} Com e-mail`]);
      });

      it('acha pelo documento digitado com ou sem pontuação, inteiro ou em parte', async () => {
        const tag = mark();
        const cpf = await created({ personType: 'pf', name: `${tag} CPF`, taxId: '168.995.350-09', roles: ['buyer'] });
        const cnpj = await created({ personType: 'pj', name: `${tag} CNPJ`, taxId: '34028316000103', roles: ['owner'] });

        for (const q of ['168.995.350-09', '16899535009', '995.350', '99535']) {
          expect((await list({ q })).items.map((item) => item.id), q).toEqual([cpf.id]);
        }
        for (const q of ['34.028.316/0001-03', '34028316000103', '028.316/0001']) {
          expect((await list({ q })).items.map((item) => item.id), q).toEqual([cnpj.id]);
        }
      });

      it('acha pelo telefone e pelo WhatsApp, digitados de qualquer jeito', async () => {
        const digits = `64${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
        const phone = `+55${digits}`;
        const tag = mark();
        const withPhone = await created({ personType: 'pf', name: `${tag} Fone`, phone, roles: ['buyer'] });
        const withWhatsapp = await created({ personType: 'pf', name: `${tag} Zap`, whatsapp: `+5511${digits.slice(2)}`, roles: ['buyer'] });

        const typed = [`(${digits.slice(0, 2)}) ${digits.slice(2)}`, `${digits.slice(0, 2)}-${digits.slice(2)}`, `+55 ${digits.slice(0, 2)} ${digits.slice(2)}`, digits.slice(2)];
        for (const q of typed) expect((await list({ q })).items.map((item) => item.id), q).toContain(withPhone.id);
        expect((await list({ q: `(11) ${digits.slice(2)}` })).items.map((item) => item.id)).toEqual([withWhatsapp.id]);
      });

      it('texto com letras não vira busca por dígitos', async () => {
        const tag = mark();
        await created({ personType: 'pf', name: `${tag} Fazenda 2`, phone: '+5562999990002', roles: ['buyer'] });
        await created({ personType: 'pf', name: `${tag} Outro`, phone: '+5562999990022', roles: ['buyer'] });

        expect(names(await list({ q: `${tag} Fazenda 2` }), tag)).toEqual(['Fazenda 2']);
      });

      it('curingas do LIKE na busca valem como texto', async () => {
        const tag = mark();
        await created({ personType: 'pf', name: `${tag} Cem por cento 100%`, roles: ['buyer'] });
        await created({ personType: 'pf', name: `${tag} Cem 1000`, roles: ['buyer'] });

        expect(names(await list({ q: `${tag} Cem por cento 100%` }), tag)).toEqual(['Cem por cento 100%']);
      });
    });

    describe('filtros', () => {
      it('role é "qualquer um dos papéis escolhidos"', async () => {
        const tag = mark();
        await created({ personType: 'pf', name: `${tag} Comprador`, roles: ['buyer'] });
        await created({ personType: 'pf', name: `${tag} Dono`, roles: ['owner'] });
        await created({ personType: 'pf', name: `${tag} Corretor`, roles: ['external_broker'] });
        await created({ personType: 'pf', name: `${tag} Dono comprador`, roles: ['buyer', 'owner'] });

        expect(names(await list({ q: tag, role: 'owner' }), tag)).toEqual(['Dono', 'Dono comprador']);
        const either = await list({ q: tag, role: 'buyer,external_broker' });
        expect(names(either, tag)).toEqual(['Comprador', 'Corretor', 'Dono comprador']);
        expect(either.total).toBe(3);
        expect(either.items.find((item) => item.name.endsWith('Dono comprador'))?.roles).toEqual(['buyer', 'owner']);
      });

      it('personType, classificação e origem do lead', async () => {
        const tag = mark();
        await created({ personType: 'pf', name: `${tag} PF A`, roles: ['buyer'], classificationId: classA, leadSourceId: referral });
        await created({ personType: 'pj', name: `${tag} PJ A`, roles: ['buyer'], classificationId: classA });
        await created({ personType: 'pf', name: `${tag} PF sem`, roles: ['owner'], leadSourceId: referral });

        expect(names(await list({ q: tag, personType: 'pj' }), tag)).toEqual(['PJ A']);
        expect(names(await list({ q: tag, classificationId: classA }), tag)).toEqual(['PF A', 'PJ A']);
        expect(names(await list({ q: tag, leadSourceId: referral }), tag)).toEqual(['PF A', 'PF sem']);
        expect(names(await list({ q: tag, role: 'buyer', personType: 'pf', classificationId: classA, leadSourceId: referral }), tag)).toEqual(['PF A']);
      });

      it('intervalo de cadastro inclui o dia inicial e o final inteiros', async () => {
        const tag = mark();
        const stamps: Record<string, string> = {
          antes: '2024-03-09T23:59:59-03:00',
          inicio: '2024-03-10T00:00:00-03:00',
          meio: '2024-03-12T12:00:00-03:00',
          fim: '2024-03-14T23:59:59-03:00',
          depois: '2024-03-15T00:00:00-03:00',
        };
        for (const [label, at] of Object.entries(stamps)) {
          const contact = await created({ personType: 'pf', name: `${tag} ${label}`, roles: ['buyer'] });
          await db.withTenant(tenant.id, (tx) =>
            tx.update(contacts).set({ createdAt: new Date(at) }).where(eq(contacts.id, contact.id)),
          );
        }

        const sorted = (page: { items: ContactBody[] }) => names(page, tag).sort();
        expect(sorted(await list({ q: tag, createdFrom: '2024-03-10', createdTo: '2024-03-14' }))).toEqual(['fim', 'inicio', 'meio']);
        expect(sorted(await list({ q: tag, createdFrom: '2024-03-12' }))).toEqual(['depois', 'fim', 'meio']);
        expect(sorted(await list({ q: tag, createdTo: '2024-03-10' }))).toEqual(['antes', 'inicio']);
      });

      it('valores inválidos são 400', async () => {
        for (const query of ['role=comprador', 'personType=xx', 'classificationId=1', 'leadSourceId=abc', 'createdFrom=ontem', 'createdTo=2024-13-40']) {
          expect((await read(`?${query}`)).status, query).toBe(400);
        }
      });

      it('classificação de outra empresa não acha nada', async () => {
        const [foreign] = await db.withTenant(other.id, (tx) =>
          tx.insert(contactClassifications).values({ tenantId: other.id, name: 'A' }).returning(),
        );
        expect((await list({ classificationId: foreign!.id })).total).toBe(0);
      });
    });

    describe('ordenação', () => {
      it('por nome, nos dois sentidos, e o padrão é por nome', async () => {
        const tag = mark();
        for (const name of ['Zélia', 'Beto', 'Ana', 'Álvaro']) await created({ personType: 'pf', name: `${tag} ${name}`, roles: ['buyer'] });

        expect(names(await list({ q: tag }), tag)).toEqual(['Álvaro', 'Ana', 'Beto', 'Zélia']);
        expect(names(await list({ q: tag, sort: 'name' }), tag)).toEqual(['Álvaro', 'Ana', 'Beto', 'Zélia']);
        expect(names(await list({ q: tag, sort: '-name' }), tag)).toEqual(['Zélia', 'Beto', 'Ana', 'Álvaro']);
      });

      it('por data de cadastro, e o empate cai no id nos dois sentidos', async () => {
        const tag = mark();
        const at = new Date('2024-05-01T12:00:00Z');
        const later = new Date('2024-05-02T12:00:00Z');
        const made: ContactBody[] = [];
        for (const name of ['c', 'a', 'b']) made.push(await created({ personType: 'pf', name: `${tag} ${name}`, roles: ['buyer'] }));
        const newest = await created({ personType: 'pf', name: `${tag} novo`, roles: ['buyer'] });
        await db.withTenant(tenant.id, async (tx) => {
          await tx.update(contacts).set({ createdAt: at }).where(inArray(contacts.id, made.map((contact) => contact.id)));
          await tx.update(contacts).set({ createdAt: later }).where(eq(contacts.id, newest.id));
        });
        const idsAsc = made.map((contact) => contact.id).sort();

        const asc = await list({ q: tag, sort: 'createdAt' });
        const desc = await list({ q: tag, sort: '-createdAt' });

        expect(asc.items.map((item) => item.id)).toEqual([...idsAsc, newest.id]);
        expect(desc.items.map((item) => item.id)).toEqual([newest.id, ...idsAsc]);
      });

      it('campo que não é ordenável é 400', async () => {
        expect((await read('?sort=email')).status).toBe(400);
      });
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
  describe('duplicatas', () => {
    interface DuplicatesBody {
      items: { id: string; name: string; roles: string[]; reasons: string[] }[];
    }
    const duplicates = async (query: Record<string, string>, cookie = managerCookie) => {
      const response = await read(`/duplicates?${new URLSearchParams(query)}`, cookie);
      return { status: response.status, body: (await response.json()) as DuplicatesBody };
    };
    const reasonsOf = (body: DuplicatesBody, id: string) => body.items.find((item) => item.id === id)?.reasons;

    it('acha por telefone, digitado de qualquer jeito', async () => {
      const contact = await created({ personType: 'pf', name: 'Dup Fone', roles: ['buyer'], phone: '(64) 98111-0001' });

      const { status, body } = await duplicates({ phone: '64981110001' });

      expect(status).toBe(200);
      expect(reasonsOf(body, contact.id)).toEqual(['phone']);
      expect(body.items.find((item) => item.id === contact.id)).toMatchObject({ name: 'Dup Fone', roles: ['buyer'] });
    });

    it('compara WhatsApp contra telefone e vice-versa', async () => {
      const byPhone = await created({ personType: 'pf', name: 'Tem telefone', roles: ['buyer'], phone: '64981110002' });
      const byWhatsapp = await created({ personType: 'pf', name: 'Tem zap', roles: ['buyer'], whatsapp: '64981110003' });

      expect(reasonsOf((await duplicates({ whatsapp: '64981110002' })).body, byPhone.id)).toEqual(['whatsapp']);
      expect(reasonsOf((await duplicates({ phone: '64981110003' })).body, byWhatsapp.id)).toEqual(['phone']);
    });

    it('acha por e-mail sem diferenciar caixa', async () => {
      const contact = await created({ personType: 'pf', name: 'Sócio 1', roles: ['owner'], email: 'socios@empresa.com' });

      expect(reasonsOf((await duplicates({ email: 'SOCIOS@Empresa.com' })).body, contact.id)).toEqual(['email']);
    });

    it('acha por nome sem caixa nem acento', async () => {
      const contact = await created({ personType: 'pf', name: 'José da Conceição', roles: ['buyer'] });

      expect(reasonsOf((await duplicates({ name: 'jose da conceicao' })).body, contact.id)).toEqual(['name']);
      expect((await duplicates({ name: 'jose da' })).body.items.find((item) => item.id === contact.id)).toBeUndefined();
    });

    it('junta os motivos de um mesmo contato', async () => {
      const contact = await created({
        personType: 'pf',
        name: 'Vários Motivos',
        roles: ['buyer'],
        whatsapp: '64981110004',
        email: 'varios@x.com',
      });

      const { body } = await duplicates({ name: 'vários motivos', whatsapp: '64981110004', email: 'varios@x.com' });

      expect(body.items.filter((item) => item.id === contact.id)).toHaveLength(1);
      expect(reasonsOf(body, contact.id)).toEqual(['whatsapp', 'email', 'name']);
    });

    it('excludeId tira o próprio contato', async () => {
      const contact = await created({ personType: 'pf', name: 'Edição', roles: ['buyer'], phone: '64981110005' });

      expect(reasonsOf((await duplicates({ phone: '64981110005' })).body, contact.id)).toEqual(['phone']);
      expect((await duplicates({ phone: '64981110005', excludeId: contact.id })).body.items).toEqual([]);
    });

    it('sem critério, ou com telefone inválido, não acha nada', async () => {
      expect((await duplicates({})).body.items).toEqual([]);
      expect((await duplicates({ phone: '123', name: '  ' })).body.items).toEqual([]);
    });

    it('não enxerga contato de outra empresa', async () => {
      await created({ personType: 'pf', name: 'Só daqui', roles: ['buyer'], phone: '64981110006' });

      const response = await read('/duplicates?phone=64981110006', outsiderCookie, other.slug);

      expect(((await response.json()) as DuplicatesBody).items).toEqual([]);
    });

    it('sem contatos.ver é 403', async () => {
      expect((await duplicates({ phone: '64981110001' }, noAccessCookie)).status).toBe(403);
    });

    it('excludeId malformado é 400', async () => {
      expect((await duplicates({ excludeId: 'x' })).status).toBe(400);
    });
  });
});
