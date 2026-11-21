import { describe, expect, it } from 'vitest';
import {
  BUYER_PROFILE_AREA_ORDER_MESSAGE,
  BUYER_PROFILE_REQUIRES_BUYER_MESSAGE,
  BUYER_PROFILE_TICKET_ORDER_MESSAGE,
  FIELD_REGISTRY,
  QUALIFICATION_LEVEL_LABELS,
  LEVEL_LABELS,
  buyerProfileSchema,
  createContactSchema,
  isBuyerProfileEmpty,
  updateContactSchema,
} from '../src/index.js';

const parse = (value: unknown) => buyerProfileSchema.safeParse(value);
const messages = (value: unknown) => (parse(value).error?.issues ?? []).map((issue) => issue.message);

describe('buyerProfileSchema', () => {
  it('campo omitido vira nulo (substituição completa)', () => {
    expect(parse({}).data).toEqual({
      purchaseProfileId: null,
      avgTicket: null,
      maxTicket: null,
      minAreaHa: null,
      maxAreaHa: null,
      urgency: null,
      qualificationLevel: null,
    });
  });

  it('as chaves financeiras não existem na entrada: são descartadas', () => {
    const data = parse({ urgency: 'high', estimatedNetWorth: '1000000.00', investmentCapacity: '5.00' }).data!;
    expect(data).not.toHaveProperty('estimatedNetWorth');
    expect(data).not.toHaveProperty('investmentCapacity');
  });

  it('ticket médio acima do máximo e área mínima acima da máxima são recusados, com um lado nulo passa', () => {
    expect(messages({ avgTicket: '12000000', maxTicket: '8000000' })).toEqual([BUYER_PROFILE_TICKET_ORDER_MESSAGE]);
    expect(messages({ minAreaHa: '1500', maxAreaHa: '500' })).toEqual([BUYER_PROFILE_AREA_ORDER_MESSAGE]);
    expect(parse({ avgTicket: '12000000' }).success).toBe(true);
    expect(parse({ maxAreaHa: '500', minAreaHa: null }).success).toBe(true);
    expect(parse({ avgTicket: '8000000', maxTicket: '8000000' }).success).toBe(true);
  });

  it.each([{ avgTicket: '0' }, { maxTicket: '-5' }, { minAreaHa: '0' }, { urgency: 'urgent' }, { qualificationLevel: 'tepid' }])(
    'recusa %j',
    (value) => {
      expect(parse(value).success).toBe(false);
    },
  );

  it('perfil vazio é o que não tem nenhuma coluna preenchida', () => {
    expect(isBuyerProfileEmpty(parse({}).data!)).toBe(true);
    expect(isBuyerProfileEmpty(parse({ urgency: 'low' }).data!)).toBe(false);
  });
});

describe('buyerProfile no contato', () => {
  const base = { personType: 'pf', name: 'Ana' };

  it('na criação exige o papel comprador', () => {
    const refused = createContactSchema.safeParse({ ...base, roles: ['owner'], buyerProfile: { urgency: 'low' } });
    expect(refused.error?.issues.map((issue) => issue.message)).toEqual([BUYER_PROFILE_REQUIRES_BUYER_MESSAGE]);
    expect(createContactSchema.safeParse({ ...base, roles: ['buyer'], buyerProfile: { urgency: 'low' } }).success).toBe(true);
    expect(createContactSchema.safeParse({ ...base, roles: ['owner'], buyerProfile: null }).success).toBe(true);
  });

  it('na edição é opcional: ausente fica ausente, nulo é nulo', () => {
    expect(updateContactSchema.parse({})).not.toHaveProperty('buyerProfile');
    expect(updateContactSchema.parse({ buyerProfile: null }).buyerProfile).toBeNull();
  });
});

describe('metadados de campo de buyer_profiles', () => {
  const { fields } = FIELD_REGISTRY.buyer_profiles;

  it('usa os rótulos da spec', () => {
    expect(
      Object.fromEntries(Object.entries(fields).map(([column, meta]) => [column, 'label' in meta ? meta.label : null])),
    ).toMatchObject({
      purchase_profile_id: 'Perfil de compra',
      avg_ticket: 'Ticket médio',
      max_ticket: 'Ticket máximo',
      min_area_ha: 'Área mínima',
      max_area_ha: 'Área máxima',
      estimated_net_worth: 'Patrimônio estimado',
      investment_capacity: 'Capacidade de investimento',
      urgency: 'Urgência da compra',
      qualification_level: 'Grau de qualificação',
    });
  });

  it('urgência usa os níveis e o grau de qualificação os seus rótulos', () => {
    expect(fields.urgency).toMatchObject({ type: 'enum', options: LEVEL_LABELS });
    expect(fields.qualification_level).toMatchObject({ type: 'enum', options: QUALIFICATION_LEVEL_LABELS });
    expect(QUALIFICATION_LEVEL_LABELS).toEqual({ cold: 'Frio', warm: 'Morno', hot: 'Quente', qualified: 'Qualificado' });
  });

  it('a UF da região de interesse sai como "Goiás (UF)"', () => {
    expect(FIELD_REGISTRY.buyer_regions.fields.uf).toMatchObject({ options: { GO: 'Goiás (UF)' } });
  });
});
