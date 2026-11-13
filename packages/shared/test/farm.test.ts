import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_LABELS, createFarmSchema, farmFormSchema, farmOptionSchema, formatHectares, updateFarmSchema } from '../src/farm.js';

describe('farmOptionSchema', () => {
  const farm = {
    id: '0199c1d2-7a4b-7c3e-9f10-1a2b3c4d5e6f',
    name: 'Fazenda Santa Helena',
    municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
    totalAreaHa: '1480.5',
  };

  it('aceita a fazenda com área em decimal canônico', () => {
    expect(farmOptionSchema.parse(farm)).toEqual(farm);
  });

  it('recusa área que não é decimal canônico', () => {
    expect(farmOptionSchema.safeParse({ ...farm, totalAreaHa: 1480.5 }).success).toBe(false);
    expect(farmOptionSchema.safeParse({ ...farm, totalAreaHa: '1.480,5' }).success).toBe(false);
  });
});

describe('formatHectares', () => {
  it.each([
    ['1480', '1.480 ha'],
    ['1480.5', '1.480,5 ha'],
    ['0.1234', '0,1234 ha'],
  ])('%s vira %s', (area, expected) => {
    expect(formatHectares(area)).toBe(expected);
  });
});

describe('createFarmSchema', () => {
  const base = { name: 'Boa Vista', municipalityIbgeCode: '5218805', totalAreaHa: '1000' };

  it('aceita o mínimo e apara o nome', () => {
    expect(createFarmSchema.parse({ ...base, name: '  Boa Vista  ' })).toEqual(base);
  });

  it.each([
    ['sem nome', { name: '' }],
    ['sem município', { municipalityIbgeCode: undefined }],
    ['município fora do formato IBGE', { municipalityIbgeCode: '52' }],
    ['sem área total', { totalAreaHa: undefined }],
    ['área total zero', { totalAreaHa: '0' }],
    ['área com mais de 4 casas', { totalAreaHa: '10.12345' }],
    ['área útil maior que a total', { usableAreaHa: '1000.0001' }],
  ])('recusa %s', (_label, overrides) => {
    expect(createFarmSchema.safeParse({ ...base, ...overrides }).success).toBe(false);
  });

  it('aceita área útil igual à total', () => {
    expect(createFarmSchema.safeParse({ ...base, usableAreaHa: '1000' }).success).toBe(true);
  });
});

describe('updateFarmSchema', () => {
  it('aceita só o que muda e confere o par de áreas enviado junto', () => {
    expect(updateFarmSchema.safeParse({ name: 'Nova' }).success).toBe(true);
    expect(updateFarmSchema.safeParse({ totalAreaHa: '10', usableAreaHa: '11' }).success).toBe(false);
  });
});

describe('áreas vazias ou ilegíveis', () => {
  const base = { name: 'Fazenda', municipalityIbgeCode: '5218805', responsibleUserId: '0199c1d2-7a4b-7c3e-9f10-1a2b3c4d5e6f' };

  it.each(['', ' ', 'abc', '1,5'])('área total %j é recusada com mensagem, sem lançar exceção', (totalAreaHa) => {
    for (const schema of [createFarmSchema, farmFormSchema]) {
      expect(schema.safeParse({ ...base, totalAreaHa }).success).toBe(false);
    }
  });

  it('área útil ilegível é recusada com mensagem, sem lançar exceção', () => {
    expect(createFarmSchema.safeParse({ ...base, totalAreaHa: '10', usableAreaHa: '' }).success).toBe(false);
  });

  it('o schema do formulário exige o corretor responsável', () => {
    const { responsibleUserId: _omit, ...withoutResponsible } = base;
    expect(createFarmSchema.safeParse({ ...withoutResponsible, totalAreaHa: '10' }).success).toBe(true);
    expect(farmFormSchema.safeParse({ ...withoutResponsible, totalAreaHa: '10' }).success).toBe(false);
  });
});

describe('LEVELS', () => {
  it('tem rótulo para cada nível', () => {
    expect(LEVELS.map((level) => LEVEL_LABELS[level])).toEqual(['Alta', 'Média', 'Baixa']);
  });
});

describe('ficha técnica e comercial', () => {
  const base = { name: 'Boa Vista', municipalityIbgeCode: '5218805', totalAreaHa: '1000' };
  const A = '0199c1d2-7a4b-7c3e-9f10-1a2b3c4d5e6f';

  it('recusa latitude sem longitude e longitude sem latitude', () => {
    for (const schema of [createFarmSchema, farmFormSchema, updateFarmSchema]) {
      const extra = schema === updateFarmSchema ? {} : { ...base, responsibleUserId: A, owners: [] };
      const lat = schema.safeParse({ ...extra, latitude: '-17.7923', longitude: null });
      const lng = schema.safeParse({ ...extra, latitude: null, longitude: '-51.5' });
      expect(lat.success).toBe(false);
      expect(lng.success).toBe(false);
      expect(lat.error?.issues[0]?.path).toEqual(['longitude']);
      expect(lng.error?.issues[0]?.path).toEqual(['latitude']);
    }
    // sem a chave do outro lado
    expect(createFarmSchema.safeParse({ ...base, latitude: '-17.7923' }).success).toBe(false);
    expect(updateFarmSchema.safeParse({ latitude: '-17.7923' }).success).toBe(true);
    expect(createFarmSchema.safeParse({ ...base, latitude: '-17.7923', longitude: '-51.5' }).success).toBe(true);
    expect(createFarmSchema.safeParse({ ...base, latitude: null, longitude: null }).success).toBe(true);
  });

  it('recusa latitude fora de −90..90 e longitude fora de −180..180', () => {
    expect(createFarmSchema.safeParse({ ...base, latitude: '90.0000001', longitude: '0' }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...base, latitude: '-91', longitude: '0' }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...base, latitude: '0', longitude: '180.5' }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...base, latitude: '-90', longitude: '-180' }).success).toBe(true);
  });

  it('nível fora de LEVELS é recusado', () => {
    expect(createFarmSchema.safeParse({ ...base, priority: 'urgent' }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...base, priority: 'high', salesPotential: null }).success).toBe(true);
  });

  it('recusa distância negativa ou com mais de duas casas', () => {
    expect(createFarmSchema.safeParse({ ...base, distanceToHighwayKm: '-1' }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...base, distanceToHighwayKm: '1.234' }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...base, distanceToHighwayKm: '12.5' }).success).toBe(true);
  });

  it('situação documental fora da lista é recusada; texto vazio vira nulo', () => {
    expect(createFarmSchema.safeParse({ ...base, documentStatus: 'ok' }).success).toBe(false);
    expect(createFarmSchema.parse({ ...base, soil: '  ' }).soil).toBeNull();
  });

  it('aptitudeIds repetidos chegam uma vez só', () => {
    expect(createFarmSchema.parse({ ...base, aptitudeIds: [A, A], cropIds: [] })).toMatchObject({ aptitudeIds: [A], cropIds: [] });
    expect(createFarmSchema.safeParse({ ...base, cropIds: ['x'] }).success).toBe(false);
  });
});
