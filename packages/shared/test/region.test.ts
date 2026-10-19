import { describe, expect, it } from 'vitest';
import {
  UFS,
  UF_NAMES,
  isMunicipality,
  municipalityLabel,
  municipalityOptionSchema,
  regionKey,
  regionLabel,
  regionOptionSchema,
} from '../src/region.js';

const rioVerde = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' } as const;

describe('UFs', () => {
  it('são as 27 unidades da federação, cada uma com nome', () => {
    expect(UFS).toHaveLength(27);
    expect(Object.keys(UF_NAMES).sort()).toEqual([...UFS].sort());
    expect(UF_NAMES.GO).toBe('Goiás');
    expect(UF_NAMES.DF).toBe('Distrito Federal');
  });
});

describe('municipalityOptionSchema', () => {
  it('aceita código IBGE de sete dígitos e UF conhecida', () => {
    expect(municipalityOptionSchema.parse(rioVerde)).toEqual(rioVerde);
  });

  it.each([
    ['código curto', { ...rioVerde, ibgeCode: '52188' }],
    ['código com letra', { ...rioVerde, ibgeCode: '521880A' }],
    ['UF inexistente', { ...rioVerde, uf: 'XX' }],
  ])('recusa %s', (_case, option) => {
    expect(municipalityOptionSchema.safeParse(option).success).toBe(false);
  });
});

describe('regionOptionSchema', () => {
  it('aceita município ou UF', () => {
    expect(regionOptionSchema.parse(rioVerde)).toEqual(rioVerde);
    expect(regionOptionSchema.parse({ uf: 'MT' })).toEqual({ uf: 'MT' });
  });

  it('recusa UF inexistente', () => {
    expect(regionOptionSchema.safeParse({ uf: 'XX' }).success).toBe(false);
  });
});

describe('região', () => {
  it('distingue município de UF', () => {
    expect(isMunicipality(rioVerde)).toBe(true);
    expect(isMunicipality({ uf: 'GO' })).toBe(false);
  });

  it('a chave é o código IBGE ou a sigla, que nunca colidem', () => {
    expect(regionKey(rioVerde)).toBe('5218805');
    expect(regionKey({ uf: 'GO' })).toBe('GO');
  });

  it('o rótulo é "Município — UF" ou "Estado (UF)"', () => {
    expect(municipalityLabel(rioVerde)).toBe('Rio Verde — GO');
    expect(regionLabel(rioVerde)).toBe('Rio Verde — GO');
    expect(regionLabel({ uf: 'GO' })).toBe('Goiás (UF)');
  });
});
