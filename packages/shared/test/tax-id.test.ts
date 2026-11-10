import { describe, expect, it } from 'vitest';
import { formatTaxId, isValidCnpj, isValidCpf, maskTaxId, normalizeTaxId } from '../src/tax-id.js';

describe('normalizeTaxId', () => {
  it.each([
    ['529.982.247-25', '52998224725'],
    ['11.222.333/0001-81', '11222333000181'],
    ['12.abc.345/01de-35', '12ABC34501DE35'],
    ['  12 ABC 345 01DE 35 ', '12ABC34501DE35'],
    ['', ''],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeTaxId(input)).toBe(expected);
  });
});

describe('isValidCpf', () => {
  it.each(['52998224725', '529.982.247-25', '12345678909'])('aceita %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each([
    ['dígito verificador errado', '52998224726'],
    ['tamanho errado', '5299822472'],
    ['tamanho a mais', '529982247250'],
    ['sequência repetida', '11111111111'],
    ['zeros', '00000000000'],
    ['letras', '5299822472A'],
    ['vazio', ''],
  ])('recusa %s', (_case, cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it.each(['11222333000181', '11.222.333/0001-81', '12ABC34501DE35', '12.abc.345/01de-35'])('aceita %s', (cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(true);
  });

  it.each([
    ['dígito verificador errado (numérico)', '11222333000182'],
    ['dígito verificador errado (alfanumérico)', '12ABC34501DE36'],
    ['tamanho errado', '1122233300018'],
    ['tamanho a mais', '112223330001811'],
    ['sequência repetida', '11111111111111'],
    ['zeros', '00000000000000'],
    ['letra nos dígitos verificadores', '12ABC34501DEA5'],
    ['vazio', ''],
  ])('recusa %s', (_case, cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(false);
  });

  it('um CPF válido não é CNPJ, e vice-versa', () => {
    expect(isValidCnpj('52998224725')).toBe(false);
    expect(isValidCpf('11222333000181')).toBe(false);
  });
});

describe('formatTaxId', () => {
  it.each([
    ['52998224725', '529.982.247-25'],
    ['11222333000181', '11.222.333/0001-81'],
    ['12abc34501de35', '12.ABC.345/01DE-35'],
    ['529.982.247-25', '529.982.247-25'],
    ['123', '123'],
  ])('formata %s', (input, expected) => {
    expect(formatTaxId(input)).toBe(expected);
  });
});

describe('maskTaxId', () => {
  it.each([
    ['pf', '5299822', '529.982.2'],
    ['pf', '52998224725', '529.982.247-25'],
    ['pf', '529.982.247-25999', '529.982.247-25'],
    ['pf', 'ab52998', '529.98'],
    ['pj', '12ab', '12.AB'],
    ['pj', '12abc34501de35', '12.ABC.345/01DE-35'],
    ['pj', '12abc34501dexx35', '12.ABC.345/01DE-35'],
    ['pj', '', ''],
  ] as const)('%s: %s vira %s', (personType, input, expected) => {
    expect(maskTaxId(input, personType)).toBe(expected);
  });
});
