import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  LEVEL_LABELS,
  createFarmSchema,
  farmFormSchema,
  farmOptionSchema,
  formatHectares,
  priceDerivatives,
  updateFarmSchema,
} from '../src/farm.js';

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

const CROP = '0199c1d2-7a4b-7c3e-9f10-1a2b3c4d5e6f';

describe('priceDerivatives', () => {
  const none = {
    pricingMode: null,
    askingPrice: null,
    valuationBags: null,
    valuationBagsUnit: null,
    valuationBagsAlqueireType: null,
    totalAreaHa: '1000',
    usableAreaHa: null,
  } as const;

  it('em reais: valor por hectare e por hectare útil', () => {
    expect(priceDerivatives({ ...none, pricingMode: 'brl', askingPrice: '80000000', usableAreaHa: '800' })).toEqual({
      pricePerHectare: '80000',
      pricePerUsableHectare: '100000',
      bagsPerHectare: null,
    });
  });

  it('em reais sem área útil: só o valor por hectare', () => {
    expect(priceDerivatives({ ...none, pricingMode: 'brl', askingPrice: '10000000' })).toEqual({
      pricePerHectare: '10000',
      pricePerUsableHectare: null,
      bagsPerHectare: null,
    });
  });

  it('em reais arredonda o valor por hectare em duas casas', () => {
    expect(
      priceDerivatives({ ...none, pricingMode: 'brl', askingPrice: '100', totalAreaHa: '3' }).pricePerHectare,
    ).toBe('33.33');
  });

  it('em sacas por hectare: sacas por hectare é a própria quantidade', () => {
    expect(
      priceDerivatives({ ...none, pricingMode: 'bags', valuationBags: '1200.5', valuationBagsUnit: 'per_hectare' }),
    ).toEqual({ pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: '1200.5' });
  });

  it.each([
    ['goiano', '1446.281'],
    ['paulista', '2892.562'],
    ['norte', '2573.5294'],
  ] as const)('em sacas por alqueire: converte pelo tipo congelado (%s), não pelo padrão da empresa', (type, expected) => {
    expect(
      priceDerivatives({
        ...none,
        pricingMode: 'bags',
        valuationBags: '7000',
        valuationBagsUnit: 'per_alqueire',
        valuationBagsAlqueireType: type,
      }).bagsPerHectare,
    ).toBe(expected);
  });

  it('sem preço: todos nulos', () => {
    expect(priceDerivatives(none)).toEqual({ pricePerHectare: null, pricePerUsableHectare: null, bagsPerHectare: null });
  });
});

describe('precificação no schema', () => {
  const base = { name: 'Boa Vista', municipalityIbgeCode: '5218805', totalAreaHa: '1000' };
  const bags = {
    pricingMode: 'bags',
    valuationBags: '7000',
    valuationBagsUnit: 'per_alqueire',
    valuationBagsAlqueireType: 'goiano',
    valuationCropId: CROP,
  };

  const pathsOf = (schema: typeof createFarmSchema | typeof updateFarmSchema, input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
  };

  it('aceita sem preço, em reais e em sacas completos', () => {
    expect(createFarmSchema.safeParse(base).success).toBe(true);
    expect(createFarmSchema.safeParse({ ...base, pricingMode: null }).success).toBe(true);
    expect(createFarmSchema.safeParse({ ...base, pricingMode: 'brl', askingPrice: '80000000' }).success).toBe(true);
    expect(createFarmSchema.safeParse({ ...base, ...bags }).success).toBe(true);
    expect(
      createFarmSchema.safeParse({ ...base, ...bags, valuationBagsUnit: 'per_hectare', valuationBagsAlqueireType: null }).success,
    ).toBe(true);
  });

  it.each([
    ['modo nulo com preço pedido', { askingPrice: '10' }, 'askingPrice'],
    ['modo nulo com sacas', { pricingMode: null, valuationBags: '10' }, 'valuationBags'],
    ['modo nulo com cultura', { valuationCropId: CROP }, 'valuationCropId'],
    ['reais sem preço pedido', { pricingMode: 'brl' }, 'askingPrice'],
    ['reais com sacas', { pricingMode: 'brl', askingPrice: '10', valuationBags: '1' }, 'valuationBags'],
    ['reais com cultura', { pricingMode: 'brl', askingPrice: '10', valuationCropId: CROP }, 'valuationCropId'],
    ['reais com preço zero', { pricingMode: 'brl', askingPrice: '0' }, 'askingPrice'],
    ['reais com mais de duas casas', { pricingMode: 'brl', askingPrice: '10.123' }, 'askingPrice'],
    ['sacas sem quantidade', { ...bags, valuationBags: undefined }, 'valuationBags'],
    ['sacas com quantidade zero', { ...bags, valuationBags: '0' }, 'valuationBags'],
    ['sacas sem unidade', { ...bags, valuationBagsUnit: undefined }, 'valuationBagsUnit'],
    ['sacas sem cultura', { ...bags, valuationCropId: undefined }, 'valuationCropId'],
    ['sacas com preço pedido', { ...bags, askingPrice: '10' }, 'askingPrice'],
    ['por alqueire sem tipo', { ...bags, valuationBagsAlqueireType: null }, 'valuationBagsAlqueireType'],
    ['por hectare com tipo', { ...bags, valuationBagsUnit: 'per_hectare' }, 'valuationBagsAlqueireType'],
    ['tipo de alqueire desconhecido', { ...bags, valuationBagsAlqueireType: 'mineiro' }, 'valuationBagsAlqueireType'],
  ])('create recusa %s apontando o campo', (_label, overrides, field) => {
    expect(pathsOf(createFarmSchema, { ...base, ...overrides })).toContain(field);
  });

  it('update recusa campo de preço sem o modo, no campo do modo', () => {
    expect(pathsOf(updateFarmSchema, { askingPrice: '10' })).toContain('pricingMode');
  });

  it('update aceita só o modo nulo (volta a sem preço) e o bloco completo', () => {
    expect(updateFarmSchema.safeParse({ pricingMode: null }).success).toBe(true);
    expect(updateFarmSchema.safeParse({ pricingMode: 'brl', askingPrice: '10' }).success).toBe(true);
    expect(updateFarmSchema.safeParse(bags).success).toBe(true);
    expect(updateFarmSchema.safeParse({ name: 'Nova' }).success).toBe(true);
  });

  it('update recusa bloco incompleto', () => {
    expect(pathsOf(updateFarmSchema, { pricingMode: 'brl' })).toContain('askingPrice');
  });

  it('o schema do formulário confere o mesmo conjunto', () => {
    const form = { ...base, responsibleUserId: CROP };
    expect(farmFormSchema.safeParse({ ...form, ...bags }).success).toBe(true);
    expect(farmFormSchema.safeParse({ ...form, pricingMode: 'brl' }).success).toBe(false);
  });
});
