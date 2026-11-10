import { describe, expect, it } from 'vitest';
import { formatPhone, isBlankPhone, normalizePhone } from '../src/phone.js';

describe('normalizePhone', () => {
  it.each([
    ['(64) 99999-0000', '+5564999990000'],
    ['64 99999-0000', '+5564999990000'],
    ['6433334444', '+556433334444'],
    ['(11) 3333-4444', '+551133334444'],
    ['+55 (64) 99999-0000', '+5564999990000'],
    ['+5564999990000', '+5564999990000'],
  ])('converte %s em %s (brasileiro)', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    ['+351 912 345 678', '+351912345678'],
    ['+1 (202) 555-0100', '+12025550100'],
    ['+12345678', '+12345678'],
    ['+123456789012345', '+123456789012345'],
  ])('aceita %s na faixa geral (8 a 15 dígitos)', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    ['DDD inexistente', '(10) 99999-0000'],
    ['DDD inexistente (20)', '2099990000'],
    ['poucos dígitos', '(64) 9999-000'],
    ['dígitos demais', '(64) 99999-00000'],
    ['sem DDD', '99999-0000'],
    ['só o código de país', '+55'],
    ['+55 com DDD inexistente', '+55 10 99999-0000'],
    ['+55 com tamanho errado', '+55 64 9999'],
    ['país com poucos dígitos', '+351 1234'],
    ['país com dígitos demais', '+1234567890123456'],
    ['letras', '(64) abcde-0000'],
    ['vazio', ''],
    ['+ no meio', '64+999990000'],
  ])('recusa %s', (_case, input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('isBlankPhone', () => {
  it.each(['', '   ', '+55', '+55 '])('%j é vazio', (input) => expect(isBlankPhone(input)).toBe(true));
  it.each(['(64)', '+351', '6'])('%j não é vazio', (input) => expect(isBlankPhone(input)).toBe(false));
});

describe('formatPhone', () => {
  it('celular brasileiro: (DD) 9XXXX-XXXX', () => expect(formatPhone('+5564999990000')).toBe('(64) 99999-0000'));
  it('fixo brasileiro: (DD) XXXX-XXXX', () => expect(formatPhone('+556433334444')).toBe('(64) 3333-4444'));
  it('internacional como veio', () => expect(formatPhone('+351912345678')).toBe('+351912345678'));
  it('nulo continua nulo', () => expect(formatPhone(null)).toBeNull());
});
