import { describe, expect, it } from 'vitest';
import { farmOptionSchema, formatHectares } from '../src/farm.js';

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
