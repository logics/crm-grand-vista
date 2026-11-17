// Lista de fazendas por HTTP, contra o Postgres real: filtros do contrato
// (critério 20), busca `q` (critério 21), ordenações e o escopo `own` (critério 15).
// A fixture entra direto pelo banco: o que se prova aqui é a leitura.
import {
  aptitudes,
  auditedWrites,
  commercialStatuses,
  contacts,
  createDatabase,
  createPool,
  crops,
  farmAptitudes,
  farmCrops,
  farmOwners,
  farms,
  tradingPosts,
  userProfiles,
} from '@crm/db';
import { loadApiEnv } from '@crm/shared/env';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../src/app.js';
import { createAuth } from '../../../src/modules/auth/auth.js';
import { seedAccessProfiles } from '../../../src/provisioning/seeded-access-profiles.js';
import { createMembership, createTenant, createUserWithPassword } from '../../support/fixtures.js';
import { loginAs } from '../../support/http.js';

const env = loadApiEnv();

const RIO_VERDE = '5218805';
const GOIANIA = '5208707';
const UBERLANDIA = '3170206';

interface ListBody {
  items: { id: string; name: string }[];
  total: number;
}

describe('fazendas: listagem com busca, filtros e ordenação', () => {
  const pool = createPool(env.DATABASE_URL);
  const db = createDatabase(pool);
  const app = createApp({ auth: createAuth({ db, env }), db, env });

  let tenant: Awaited<ReturnType<typeof createTenant>>;
  let managerCookie: string;
  let brokerCookie: string;
  let brokerId: string;
  let managerId: string;
  let otherBrokerId: string;
  let ids: { postA: string; postB: string; pecuaria: string; agricultura: string; soja: string; milho: string; deactivated: string };
  let owners: { maria: string; joao: string; sozinho: string };

  const names = async (query: string, cookie = managerCookie) => {
    const response = await app.request(`/e/${tenant.slug}/farms?pageSize=100&${query}`, { headers: { cookie } });
    expect(response.status).toBe(200);
    const body = (await response.json()) as ListBody;
    expect(body.total).toBe(body.items.length);
    return body.items.map((item) => item.name);
  };
  const status = async (query: string) => (await app.request(`/e/${tenant.slug}/farms?${query}`, { headers: { cookie: managerCookie } })).status;

  beforeAll(async () => {
    tenant = await createTenant(db, 'fazendas-lista');
    const [manager, broker, otherBroker] = await Promise.all(['Gestora', 'Corretor', 'Outro corretor'].map((name) => createUserWithPassword(db, name)));
    managerId = manager!.id;
    brokerId = broker!.id;
    otherBrokerId = otherBroker!.id;
    for (const user of [manager!, broker!, otherBroker!]) await createMembership(db, user.id, tenant.id, { isDefault: true });

    await db.withTenant(tenant.id, async (tx) => {
      const profiles = await seedAccessProfiles(tx, auditedWrites(tx, { tenantId: tenant.id, userId: null }), tenant.id);
      await tx.insert(userProfiles).values([
        { tenantId: tenant.id, userId: managerId, profileId: profiles.get('Gestor')! },
        { tenantId: tenant.id, userId: brokerId, profileId: profiles.get('Corretor')! },
        { tenantId: tenant.id, userId: otherBrokerId, profileId: profiles.get('Corretor')! },
      ]);

      const [available, deactivated] = await tx
        .insert(commercialStatuses)
        .values([
          { tenantId: tenant.id, name: 'Disponível', systemMeaning: 'available', displayOrder: 0 },
          { tenantId: tenant.id, name: 'Desativada', systemMeaning: 'inactive', displayOrder: 1 },
        ])
        .returning();
      const [postA, postB] = await tx
        .insert(tradingPosts)
        .values([
          { tenantId: tenant.id, name: 'Rio Verde' },
          { tenantId: tenant.id, name: 'Uberlândia' },
        ])
        .returning();
      const [pecuaria, agricultura] = await tx
        .insert(aptitudes)
        .values([
          { tenantId: tenant.id, name: 'Pecuária' },
          { tenantId: tenant.id, name: 'Agricultura' },
        ])
        .returning();
      const [soja, milho] = await tx
        .insert(crops)
        .values([
          { tenantId: tenant.id, name: 'Soja' },
          { tenantId: tenant.id, name: 'Milho' },
        ])
        .returning();
      ids = {
        postA: postA!.id,
        postB: postB!.id,
        pecuaria: pecuaria!.id,
        agricultura: agricultura!.id,
        soja: soja!.id,
        milho: milho!.id,
        deactivated: deactivated!.id,
      };

      const [maria, joao, sozinho] = await tx
        .insert(contacts)
        .values([
          { tenantId: tenant.id, personType: 'pf', name: 'Maria Antônia Souza' },
          { tenantId: tenant.id, personType: 'pf', name: 'João Pereira' },
          { tenantId: tenant.id, personType: 'pf', name: 'Dono Sem Fazenda Visível' },
        ])
        .returning();
      owners = { maria: maria!.id, joao: joao!.id, sozinho: sozinho!.id };

      const base = { tenantId: tenant.id, commercialStatusId: available!.id };
      const inserted = await tx
        .insert(farms)
        .values([
          {
            ...base,
            name: 'Fazenda Santa Rita',
            municipalityIbgeCode: RIO_VERDE,
            responsibleUserId: brokerId,
            totalAreaHa: '1000',
            tradingPostId: postA!.id,
            pricingMode: 'brl',
            askingPrice: '30000000',
            documentStatus: 'regular',
            distanceToHighwayKm: '5',
            distanceToWarehouseKm: '15',
            priority: 'high',
            salesPotential: 'high',
            soil: 'Latossolo vermelho profundo',
            documentNotes: 'Matrícula atualizada em 2025',
          },
          {
            ...base,
            name: 'Sítio Boa Esperança',
            municipalityIbgeCode: GOIANIA,
            responsibleUserId: managerId,
            totalAreaHa: '300',
            pricingMode: 'brl',
            askingPrice: '80000000',
            documentStatus: 'pending',
            distanceToWarehouseKm: '50',
            priority: 'low',
            water: 'Córrego perene e nascentes',
          },
          {
            ...base,
            name: 'Fazenda Águas Claras',
            municipalityIbgeCode: UBERLANDIA,
            responsibleUserId: brokerId,
            totalAreaHa: '2500',
            tradingPostId: postB!.id,
            pricingMode: 'bags',
            valuationBags: '1000',
            valuationBagsUnit: 'per_hectare',
            valuationCropId: soja!.id,
            documentStatus: 'regular',
            distanceToWarehouseKm: '10',
            priority: 'high',
          },
          {
            ...base,
            name: 'Fazenda Sem Preço',
            municipalityIbgeCode: UBERLANDIA,
            responsibleUserId: otherBrokerId,
            totalAreaHa: '800',
          },
          {
            ...base,
            name: 'Fazenda Gêmea',
            municipalityIbgeCode: RIO_VERDE,
            responsibleUserId: managerId,
            totalAreaHa: '1000',
            pricingMode: 'brl',
            askingPrice: '30000000',
          },
          {
            ...base,
            commercialStatusId: deactivated!.id,
            name: 'Fazenda Desativada Santa',
            municipalityIbgeCode: RIO_VERDE,
            responsibleUserId: managerId,
            totalAreaHa: '1000',
          },
        ])
        .returning();
      const farmId = Object.fromEntries(inserted.map((farm) => [farm.name, farm.id]));

      await tx.insert(farmAptitudes).values([
        { tenantId: tenant.id, farmId: farmId['Fazenda Santa Rita']!, aptitudeId: pecuaria!.id },
        { tenantId: tenant.id, farmId: farmId['Sítio Boa Esperança']!, aptitudeId: agricultura!.id },
        { tenantId: tenant.id, farmId: farmId['Fazenda Águas Claras']!, aptitudeId: pecuaria!.id },
        { tenantId: tenant.id, farmId: farmId['Fazenda Águas Claras']!, aptitudeId: agricultura!.id },
      ]);
      await tx.insert(farmCrops).values([
        { tenantId: tenant.id, farmId: farmId['Fazenda Santa Rita']!, cropId: soja!.id },
        { tenantId: tenant.id, farmId: farmId['Sítio Boa Esperança']!, cropId: milho!.id },
      ]);
      await tx.insert(farmOwners).values([
        { tenantId: tenant.id, farmId: farmId['Fazenda Santa Rita']!, contactId: maria!.id, isPrimary: true },
        { tenantId: tenant.id, farmId: farmId['Fazenda Santa Rita']!, contactId: joao!.id, isPrimary: false },
        { tenantId: tenant.id, farmId: farmId['Sítio Boa Esperança']!, contactId: joao!.id, isPrimary: true },
        { tenantId: tenant.id, farmId: farmId['Fazenda Sem Preço']!, contactId: owners.sozinho, isPrimary: true },
      ]);
    });

    managerCookie = await loginAs(app, manager!);
    brokerCookie = await loginAs(app, broker!);
  });

  afterAll(() => pool.end());

  describe('filtros (critério 20)', () => {
    it('região por município e por UF, e as duas juntas na mesma lista', async () => {
      expect(await names(`region=${GOIANIA}&sort=name`)).toEqual(['Sítio Boa Esperança']);
      expect(await names('region=MG&sort=name')).toEqual(['Fazenda Águas Claras', 'Fazenda Sem Preço']);
      expect(await names(`region=${GOIANIA},MG&sort=name`)).toEqual(['Fazenda Águas Claras', 'Fazenda Sem Preço', 'Sítio Boa Esperança']);
    });

    it('região com token que não é IBGE nem UF é 400', async () => {
      expect(await status('region=XX')).toBe(400);
      expect(await status('region=123')).toBe(400);
    });

    it('praça, aptidões e culturas casam com qualquer valor escolhido', async () => {
      expect(await names(`tradingPostId=${ids.postA},${ids.postB}&sort=name`)).toEqual(['Fazenda Águas Claras', 'Fazenda Santa Rita']);
      expect(await names(`aptitudeId=${ids.pecuaria}&sort=name`)).toEqual(['Fazenda Águas Claras', 'Fazenda Santa Rita']);
      expect(await names(`aptitudeId=${ids.pecuaria},${ids.agricultura}&sort=name`)).toEqual([
        'Fazenda Águas Claras',
        'Fazenda Santa Rita',
        'Sítio Boa Esperança',
      ]);
      expect(await names(`cropId=${ids.soja},${ids.milho}&sort=name`)).toEqual(['Fazenda Santa Rita', 'Sítio Boa Esperança']);
    });

    it('área mínima e máxima em hectares, pontas inclusas', async () => {
      expect(await names('areaMin=1000&areaMax=2500&sort=name')).toEqual(['Fazenda Águas Claras', 'Fazenda Gêmea', 'Fazenda Santa Rita']);
      expect(await names('areaMax=300')).toEqual(['Sítio Boa Esperança']);
    });

    it('valor só considera fazendas em reais; em sacas e sem preço ficam fora', async () => {
      expect(await names('priceMin=1&sort=name')).toEqual(['Fazenda Gêmea', 'Fazenda Santa Rita', 'Sítio Boa Esperança']);
      expect(await names('priceMax=30000000&sort=name')).toEqual(['Fazenda Gêmea', 'Fazenda Santa Rita']);
      expect(await names('priceMin=30000000.01&priceMax=80000000')).toEqual(['Sítio Boa Esperança']);
    });

    it('sem preço traz só as fazendas sem modo de precificação', async () => {
      expect(await names('noPrice=true')).toEqual(['Fazenda Sem Preço']);
    });

    it('noPrice com priceMin ou priceMax é 400', async () => {
      expect(await status('noPrice=true&priceMin=1')).toBe(400);
      expect(await status('noPrice=true&priceMax=10')).toBe(400);
      expect(await status('noPrice=false')).toBe(400);
    });

    it('status pedido por id; ausente continua todos menos desativadas', async () => {
      expect(await names('sort=name')).not.toContain('Fazenda Desativada Santa');
      expect(await names(`commercialStatusId=${ids.deactivated}`)).toEqual(['Fazenda Desativada Santa']);
    });

    it('níveis e situação documental casam com qualquer valor escolhido', async () => {
      expect(await names('priority=high&sort=name')).toEqual(['Fazenda Águas Claras', 'Fazenda Santa Rita']);
      expect(await names('priority=high,low&salesPotential=high')).toEqual(['Fazenda Santa Rita']);
      expect(await names('documentStatus=regular,pending&sort=name')).toEqual(['Fazenda Águas Claras', 'Fazenda Santa Rita', 'Sítio Boa Esperança']);
      expect(await status('priority=enorme')).toBe(400);
      expect(await status('documentStatus=ok')).toBe(400);
    });

    it('distâncias máximas excluem as maiores e as não informadas', async () => {
      expect(await names('maxDistanceToWarehouseKm=15&sort=name')).toEqual(['Fazenda Águas Claras', 'Fazenda Santa Rita']);
      expect(await names('maxDistanceToHighwayKm=5')).toEqual(['Fazenda Santa Rita']);
    });

    it('corretor responsável filtra com escopo all e é ignorado com own', async () => {
      expect(await names(`responsibleUserId=${managerId}&sort=name`)).toEqual(['Fazenda Gêmea', 'Sítio Boa Esperança']);
      // Com `own`, o escopo já restringe: pedir o colega não revela nada nem quebra.
      expect(await names(`responsibleUserId=${otherBrokerId}&sort=name`, brokerCookie)).toEqual(['Fazenda Águas Claras', 'Fazenda Santa Rita']);
    });

    it('proprietário casa com qualquer proprietário, não só o principal', async () => {
      expect(await names(`ownerContactId=${owners.joao}&sort=name`)).toEqual(['Fazenda Santa Rita', 'Sítio Boa Esperança']);
      expect(await names(`ownerContactId=${owners.maria}`)).toEqual(['Fazenda Santa Rita']);
      expect(await status('ownerContactId=nao-e-uuid')).toBe(400);
    });

    it('escopo own: proprietário que só tem fazendas alheias devolve lista vazia com total 0 (critério 15)', async () => {
      const response = await app.request(`/e/${tenant.slug}/farms?ownerContactId=${owners.sozinho}`, { headers: { cookie: brokerCookie } });

      expect(await response.json()).toMatchObject({ items: [], total: 0 });
    });

    it('filtros combinados se somam: E entre filtros, OU dentro da lista', async () => {
      const query = new URLSearchParams({
        region: 'GO',
        aptitudeId: ids.pecuaria,
        areaMin: '500',
        areaMax: '2000',
        priceMax: '50000000',
        documentStatus: 'regular',
        maxDistanceToWarehouseKm: '20',
      });

      expect(await names(query.toString())).toEqual(['Fazenda Santa Rita']);
      query.set('maxDistanceToWarehouseKm', '10');
      expect(await names(query.toString())).toEqual([]);
    });
  });

  describe('ordenação', () => {
    it('nome, área, preço e cadastro, crescente e decrescente, com desempate por id', async () => {
      expect(await names('sort=name')).toEqual(['Fazenda Águas Claras', 'Fazenda Gêmea', 'Fazenda Santa Rita', 'Fazenda Sem Preço', 'Sítio Boa Esperança']);
      expect(await names('sort=-name')).toEqual(['Sítio Boa Esperança', 'Fazenda Sem Preço', 'Fazenda Santa Rita', 'Fazenda Gêmea', 'Fazenda Águas Claras']);
      expect((await names('sort=totalAreaHa'))[0]).toBe('Sítio Boa Esperança');
      expect((await names('sort=-totalAreaHa'))[0]).toBe('Fazenda Águas Claras');
      expect((await names('sort=createdAt'))).toHaveLength(5);
    });

    it('preço põe sem preço e em sacas no fim nas duas direções, e empate sai pelo id', async () => {
      const asc = await names('sort=askingPrice');
      const desc = await names('sort=-askingPrice');

      expect(asc[0]).toMatch(/Fazenda (Gêmea|Santa Rita)/);
      expect(asc.slice(0, 3)).toContain('Sítio Boa Esperança');
      expect(asc.slice(-2).sort()).toEqual(['Fazenda Sem Preço', 'Fazenda Águas Claras']);
      expect(desc[0]).toBe('Sítio Boa Esperança');
      expect(desc.slice(-2).sort()).toEqual(['Fazenda Sem Preço', 'Fazenda Águas Claras']);
      // Os dois empatados no preço aparecem na mesma ordem (por id) nas duas direções.
      expect(asc.filter((name) => /Gêmea|Santa Rita/.test(name))).toEqual(desc.filter((name) => /Gêmea|Santa Rita/.test(name)));
    });
  });

  describe('busca q (critério 21)', () => {
    it('acha "Santa Rita" por "sant", sem caixa nem acento', async () => {
      expect(await names('q=sant&sort=name')).toEqual(['Fazenda Santa Rita']);
      expect(await names(`q=${encodeURIComponent('SÂNTA rita')}`)).toEqual(['Fazenda Santa Rita']);
    });

    it('acha pelo município, pelo nome de qualquer proprietário, pelos textos livres e pela observação documental', async () => {
      expect(await names('q=uberlandia&sort=name')).toEqual(['Fazenda Águas Claras', 'Fazenda Sem Preço']);
      expect(await names('q=joao')).toEqual(expect.arrayContaining(['Fazenda Santa Rita', 'Sítio Boa Esperança']));
      expect(await names('q=maria+antonia')).toEqual(['Fazenda Santa Rita']);
      expect(await names('q=latossolo')).toEqual(['Fazenda Santa Rita']);
      expect(await names('q=corrego')).toEqual(['Sítio Boa Esperança']);
      expect(await names('q=matricula')).toEqual(['Fazenda Santa Rita']);
    });

    it('busca respeita os filtros e o corte das desativadas, e não trata % como curinga', async () => {
      expect(await names('q=santa&sort=name')).toEqual(['Fazenda Santa Rita']);
      expect(await names(`q=santa&commercialStatusId=${ids.deactivated}`)).toEqual(['Fazenda Desativada Santa']);
      expect(await names('q=100%25')).toEqual([]);
    });
  });
});
