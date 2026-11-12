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
