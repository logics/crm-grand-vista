import { describe, expect, it } from 'vitest';
import { caretAfterDigits, formatPhone, isBlankPhone, maskPhoneInput, normalizePhone } from '../src/phone.js';

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

describe('maskPhoneInput', () => {
  it.each([
    ['vazio', '', ''],
    ['1 dígito', '6', '(6'],
    ['2 dígitos', '64', '(64'],
    ['3 dígitos', '649', '(64) 9'],
    ['6 dígitos', '649999', '(64) 9999'],
    ['7 dígitos (fixo em andamento)', '6499999', '(64) 9999-9'],
    ['10 dígitos (fixo)', '6433334444', '(64) 3333-4444'],
    ['11 dígitos (celular)', '64999990000', '(64) 99999-0000'],
    ['12+ dígitos cortados em 11', '649999900001234', '(64) 99999-0000'],
    ['idempotente sobre o celular', '(64) 99999-0000', '(64) 99999-0000'],
    ['idempotente sobre o fixo', '(64) 3333-4444', '(64) 3333-4444'],
    ['colar com +55', '+55 (64) 99999-0000', '(64) 99999-0000'],
    ['colar com 55 sem +', '55 64 99999 0000', '(64) 99999-0000'],
    ['DDD 55 com 11 dígitos não perde o DDD', '55999990000', '(55) 99999-0000'],
    ['+351 sem máscara', '+351 912 345 678', '+351912345678'],
    ['internacional cortado em 15 dígitos', '+1234567890123456789', '+123456789012345'],
    ['+ sozinho entra na via internacional', '+', '+'],
    ['+5 pode ser +51, +52 ou +55', '+5', '+5'],
    ['+55 é o vazio do campo brasileiro', '+55', ''],
    ['+55 com espaço', '+55 ', ''],
    ['+55 e dígitos nacionais voltam à máscara BR', '+5564', '(64'],
    ['letras descartadas', '(6a4) abc9', '(64) 9'],
    ['espaço à esquerda', '  64', '(64'],
  ])('%s', (_case, input, expected) => {
    expect(maskPhoneInput(input)).toBe(expected);
  });

  it('o vazio do campo brasileiro é blank', () => {
    expect(isBlankPhone(maskPhoneInput('+55'))).toBe(true);
  });
});

describe('caretAfterDigits', () => {
  it('zero dígitos: início', () => expect(caretAfterDigits('(64) 9', 0)).toBe(0));
  it('no meio: logo depois do dígito', () => expect(caretAfterDigits('(64) 99999-0000', 3)).toBe(6));
  it('depois do 2º dígito, antes do separador', () => expect(caretAfterDigits('(64) 9', 2)).toBe(3));
  it('no fim', () => expect(caretAfterDigits('(64) 99999-0000', 11)).toBe(15));
  it('além dos dígitos: fim dos dígitos', () => expect(caretAfterDigits('(64', 9)).toBe(3));
  it('com +: o + é posição fixa', () => {
    expect(caretAfterDigits('+351912', 0)).toBe(1);
    expect(caretAfterDigits('+351912', 3)).toBe(4);
  });
});
