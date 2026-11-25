// A cadeia chega ao banco sem passar pela validação do serviço: o CHECK e o
// UNIQUE de `referral_links` (inclusive a posição adiada, que estoura no
// `COMMIT`) viram 400 no campo `referralChain`, nunca 409 nem 500 (spec
// fase-1-cadeia-de-indicacao, Contratos de API).
//
// O caminho do banco é forçado por um gatilho de teste, criado e removido aqui
// pelo papel dono: a nota do elo escolhe a violação. A validação do serviço fica
// intacta, e o código de produção não ganha nada só para o teste.
import { auditedWrites, commercialStatuses, createDatabase, createPool, userProfiles } from '@crm/db';
import { loadApiEnv, loadMigrationEnv } from '@crm/shared/env';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { jsonRequest, loginAs } from '../../support/http.js';

const env = loadApiEnv();

const CHECK_MARKER = 'forca-check';
const UNIQUE_MARKER = 'forca-indicador-repetido';
const POSITION_MARKER = 'forca-posicao-repetida';
const GONE_MARKER = 'forca-indicador-excluido';

const TRIGGER_FUNCTION = `
  create or replace function referral_links_force_violation_for_test() returns trigger language plpgsql as $$
  begin
    if new.notes = '${CHECK_MARKER}' then
      new.position := 11;
    elsif new.notes = '${UNIQUE_MARKER}' then
      select referrer_contact_id into new.referrer_contact_id
        from referral_links
        where (subject_contact_id = new.subject_contact_id or subject_farm_id = new.subject_farm_id)
          and referrer_contact_id is not null limit 1;
    elsif new.notes = '${POSITION_MARKER}' then
      new.position := 1;
    elsif new.notes = '${GONE_MARKER}' then
      new.referrer_contact_id := gen_random_uuid();
    end if;
    return new;
  end $$`;

interface ErrorBody {
  error: { code: string; message: string; field?: string };
}

describe('cadeia de indicação: erros do banco viram 400', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });
  const owner = () => new pg.Client({ connectionString: loadMigrationEnv().MIGRATION_DATABASE_URL });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let cookie: string;
  let counter = 0;

  const url = (path = '') => `/e/${tenant.slug}/contacts${path}`;
  const post = (body: unknown) => app.request(url(), jsonRequest('POST', body, cookie));
  const create = async (name: string) => {
    const response = await post({ personType: 'pf', name: `${name} ${(counter += 1)}`, roles: ['buyer'] });
    expect(response.status).toBe(201);
    return (await response.json()) as { id: string };
  };
  const asContact = (id: string, notes?: string) => ({ referrer: { kind: 'contact', id }, ...(notes ? { notes } : {}) });
  const expectChainRefusal = async (response: Response) => {
    expect(response.status).toBe(400);
    const { error } = (await response.json()) as ErrorBody;
    expect(error).toMatchObject({ code: 'validation_error', field: 'referralChain' });
    expect(error.message).toMatch(/cadeia de indicação|posição|indicador/i);
    return error.message;
  };

  beforeAll(async () => {
    tenant = await createTenant(db, 'indicacao-erros-banco');
    const manager = await createUserWithPassword(db, 'Gestora');
    await createMembership(db, manager.id, tenant.id, { isDefault: true });
    await db.withTenant(tenant.id, async (tx) => {
      const ids = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values({ tenantId: tenant.id, userId: manager.id, profileId: ids.get('Admin')! });
    });
    await db.withTenant(tenant.id, (tx) =>
      tx.insert(commercialStatuses).values({ tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 }),
    );
    cookie = await loginAs(app, manager);

    const client = owner();
    await client.connect();
    try {
      await client.query(TRIGGER_FUNCTION);
      await client.query(
        `create trigger referral_links_force_violation_for_test before insert on referral_links
         for each row execute function referral_links_force_violation_for_test()`,
      );
    } finally {
      await client.end();
    }
  });

  afterAll(async () => {
    const client = owner();
    await client.connect();
    try {
      await client.query('drop trigger if exists referral_links_force_violation_for_test on referral_links');
      await client.query('drop function if exists referral_links_force_violation_for_test()');
    } finally {
      await client.end();
    }
    await pool.end();
  });

  it('CHECK de posição violado no INSERT é 400 com a mensagem do limite', async () => {
    const joao = await create('João');
    const response = await post({
      personType: 'pf',
      name: `Pedro ${(counter += 1)}`,
      roles: ['buyer'],
      referralChain: [asContact(joao.id, CHECK_MARKER)],
    });
    expect(await expectChainRefusal(response)).toContain('até 10 indicadores');
  });

  it('UNIQUE de indicador violado no INSERT é 400', async () => {
    const joao = await create('João');
    const sebastiao = await create('Sebastião');
    const response = await post({
      personType: 'pf',
      name: `Pedro ${(counter += 1)}`,
      roles: ['buyer'],
      referralChain: [asContact(joao.id), asContact(sebastiao.id, UNIQUE_MARKER)],
    });
    await expectChainRefusal(response);
  });

  it('UNIQUE de posição adiada, que estoura no COMMIT, é 400 e não grava o contato', async () => {
    const joao = await create('João');
    const sebastiao = await create('Sebastião');
    const name = `Pedro ${(counter += 1)}`;
    const response = await post({
      personType: 'pf',
      name,
      roles: ['buyer'],
      referralChain: [asContact(joao.id), asContact(sebastiao.id, POSITION_MARKER)],
    });
    await expectChainRefusal(response);
    const listed = (await (await app.request(`${url()}?q=${encodeURIComponent(name)}`, { headers: { cookie } })).json()) as {
      items: unknown[];
    };
    expect(listed.items).toHaveLength(0);
  });

  it('FK do indicador excluído entre a checagem e o INSERT é 400 com mensagem clara e não grava o contato', async () => {
    const joao = await create('João');
    const name = `Pedro ${(counter += 1)}`;
    const response = await post({
      personType: 'pf',
      name,
      roles: ['buyer'],
      referralChain: [asContact(joao.id, GONE_MARKER)],
    });
    expect(await expectChainRefusal(response)).toContain('foi excluído');
    const listed = (await (await app.request(`${url()}?q=${encodeURIComponent(name)}`, { headers: { cookie } })).json()) as {
      items: unknown[];
    };
    expect(listed.items).toHaveLength(0);
  });

  describe('fazenda', () => {
    const postFarm = (name: string, referralChain: unknown) =>
      app.request(
        `/e/${tenant.slug}/farms`,
        jsonRequest('POST', { name, municipalityIbgeCode: '5218805', totalAreaHa: '1000', referralChain }, cookie),
      );
    const farmExists = async (name: string) => {
      const listed = (await (
        await app.request(`/e/${tenant.slug}/farms?q=${encodeURIComponent(name)}`, { headers: { cookie } })
      ).json()) as { items: unknown[] };
      return listed.items.length > 0;
    };

    it('CHECK de posição violado no INSERT é 400 com a mensagem do limite e não grava a fazenda', async () => {
      const joao = await create('João');
      const name = `Fazenda ${(counter += 1)}`;
      const response = await postFarm(name, [asContact(joao.id, CHECK_MARKER)]);
      expect(await expectChainRefusal(response)).toContain('até 10 indicadores');
      expect(await farmExists(name)).toBe(false);
    });

    it('UNIQUE de indicador violado no INSERT é 400', async () => {
      const joao = await create('João');
      const sebastiao = await create('Sebastião');
      const response = await postFarm(`Fazenda ${(counter += 1)}`, [asContact(joao.id), asContact(sebastiao.id, UNIQUE_MARKER)]);
      await expectChainRefusal(response);
    });

    it('FK do indicador excluído entre a checagem e o INSERT é 400 com mensagem clara e não grava a fazenda', async () => {
      const joao = await create('João');
      const name = `Fazenda ${(counter += 1)}`;
      const response = await postFarm(name, [asContact(joao.id, GONE_MARKER)]);
      expect(await expectChainRefusal(response)).toContain('foi excluído');
      expect(await farmExists(name)).toBe(false);
    });

    it('UNIQUE de posição adiada, que estoura no COMMIT, é 400 e não grava a fazenda', async () => {
      const joao = await create('João');
      const sebastiao = await create('Sebastião');
      const name = `Fazenda ${(counter += 1)}`;
      const response = await postFarm(name, [asContact(joao.id), asContact(sebastiao.id, POSITION_MARKER)]);
      await expectChainRefusal(response);
      expect(await farmExists(name)).toBe(false);
    });
  });
});
