import { describe, expect, it } from 'vitest';
import {
  alqueiresToHectares,
  compareDecimal,
  formatDecimal,
  hectaresToAlqueires,
  parseDecimal,
  parseShiftedDecimal,
  roundDecimal,
} from '../src/decimal.js';

const valueOf = (text: string, scale = 4) => {
  const parsed = parseDecimal(text, scale);
  return parsed.ok ? parsed.value : 'inválido';
};

describe('parseDecimal', () => {
  it.each([
    ['1.480,50', '1480.5'],
    ['1480,5', '1480.5'],
    ['1.480', '1480'],
    ['1.234.567,8', '1234567.8'],
    ['0,5', '0.5'],
    [',5', '0.5'],
    ['12,', '12'],
    ['007', '7'],
    [' 1 480,5 ', '1480.5'],
  ])('lê %s como %s', (text, expected) => {
    expect(valueOf(text)).toBe(expected);
  });

  it.each([
    ['-1.480,50', '-1480.5'],
    ['+12', '12'],
    ['-0', '0'],
    ['-0,00', '0'],
  ])('sinal: %s vira %s', (text, expected) => {
    expect(valueOf(text)).toBe(expected);
  });

  it.each(['', '   '])('vazio (%j) é null', (text) => {
    expect(parseDecimal(text, 2)).toEqual({ ok: true, value: null });
  });

  // pt-BR, como o campo exibe: vírgula é o único decimal, ponto só agrupa milhar
  it.each(['1480.5', '12.5', '0.500', '1.48', '1,480.50', '1.4801'])('ponto como decimal: recusa %j', (text) => {
    expect(parseDecimal(text, 4)).toEqual({ ok: false });
  });

  it.each(['abc', '12a', '-', ',', '.', '1,2,3', '1.48,5', '1.2.3', '12.3456,7', '1,234,5.6', '--1', '1-', '1e3', 'R$ 10'])(
    'recusa %j',
    (text) => {
      expect(parseDecimal(text, 2)).toEqual({ ok: false });
    },
  );

  it('arredonda nas casas, meio para longe do zero', () => {
    expect(valueOf('1,005', 2)).toBe('1.01');
    expect(valueOf('1,004', 2)).toBe('1');
    expect(valueOf('-1,005', 2)).toBe('-1.01');
    expect(valueOf('2,99999', 4)).toBe('3');
    expect(valueOf('0,00004', 4)).toBe('0');
  });
});

describe('parseShiftedDecimal', () => {
  it.each([
    ['1', '0.01'],
    ['14', '0.14'],
    ['148', '1.48'],
    ['1480', '14.8'],
    ['148050', '1480.5'],
    ['0', '0'],
    ['001', '0.01'],
  ])('os dígitos %s entram pela direita: %s', (text, expected) => {
    expect(parseShiftedDecimal(text, 2)).toBe(expected);
  });

  it('ignora o que não é dígito: milhar, vírgula, letra', () => {
    expect(parseShiftedDecimal('1.480,50', 2)).toBe('1480.5');
    expect(parseShiftedDecimal('1.480,5', 2)).toBe('148.05');
    expect(parseShiftedDecimal('12,00a', 2)).toBe('12');
  });

  it('sinal de menos à frente é negativo', () => {
    expect(parseShiftedDecimal('-1.480,50', 2)).toBe('-1480.5');
    expect(parseShiftedDecimal('-0,00', 2)).toBe('0');
  });

  it.each(['', '-', 'R$', ',', '  '])('sem dígito (%j) é vazio', (text) => {
    expect(parseShiftedDecimal(text, 2)).toBeNull();
  });
});

describe('formatDecimal', () => {
  it('milhar com ponto, decimal com vírgula', () => {
    expect(formatDecimal('1480.5', { minScale: 2, maxScale: 2 })).toBe('1.480,50');
    expect(formatDecimal('1234567', { minScale: 2, maxScale: 2 })).toBe('1.234.567,00');
    expect(formatDecimal('999', { minScale: 0, maxScale: 4 })).toBe('999');
  });

  it('mostra até `maxScale` casas, sem zeros à direita além de `minScale`', () => {
    expect(formatDecimal('1480.5000', { minScale: 0, maxScale: 4 })).toBe('1.480,5');
    expect(formatDecimal('12.3456', { minScale: 0, maxScale: 4 })).toBe('12,3456');
    expect(formatDecimal('12', { minScale: 0, maxScale: 4 })).toBe('12');
  });

  it('arredonda o que passa de `maxScale`', () => {
    expect(formatDecimal('0.125', { minScale: 2, maxScale: 2 })).toBe('0,13');
    expect(formatDecimal('9999.995', { minScale: 2, maxScale: 2 })).toBe('10.000,00');
  });

  it('sinal negativo antes do número; zero nunca negativo', () => {
    expect(formatDecimal('-1480.5', { minScale: 2, maxScale: 2 })).toBe('-1.480,50');
    expect(formatDecimal('-0.001', { minScale: 2, maxScale: 2 })).toBe('0,00');
  });

  it('o que sai lê de volta como o mesmo valor', () => {
    const text = formatDecimal('1234567.8912', { minScale: 0, maxScale: 4 });
    expect(valueOf(text)).toBe('1234567.8912');
    expect(valueOf(formatDecimal('1480', { minScale: 0, maxScale: 4 }))).toBe('1480');
  });

  it('recusa o que não é decimal canônico', () => {
    expect(() => formatDecimal('1.480,50', { minScale: 2, maxScale: 2 })).toThrow(/decimal/);
  });
});

describe('roundDecimal e compareDecimal', () => {
  it('arredonda o canônico', () => {
    expect(roundDecimal('1480.50', 2)).toBe('1480.5');
    expect(roundDecimal('0.00005', 4)).toBe('0.0001');
  });

  it('compara pelo valor, não pelo texto', () => {
    expect(compareDecimal('1480.50', '1480.5')).toBe(0);
    expect(compareDecimal('-1', '0')).toBe(-1);
    expect(compareDecimal('100.0001', '100')).toBe(1);
    expect(compareDecimal('9', '10')).toBe(-1);
  });
});

describe('alqueire ↔ hectare', () => {
  it.each([
    ['goiano', '100', '484'],
    ['paulista', '100', '242'],
    ['norte', '100', '272'],
    ['goiano', '1.5', '7.26'],
  ] as const)('alqueire %s: %s alq = %s ha', (type, alqueires, hectares) => {
    expect(alqueiresToHectares(alqueires, type)).toBe(hectares);
    expect(hectaresToAlqueires(hectares, type)).toBe(alqueires);
  });

  it('arredonda nas quatro casas da área', () => {
    expect(alqueiresToHectares('1.23456', 'goiano')).toBe('5.9753');
    expect(hectaresToAlqueires('1', 'goiano')).toBe('0.2066');
    expect(hectaresToAlqueires('1', 'paulista')).toBe('0.4132');
    expect(hectaresToAlqueires('1', 'norte')).toBe('0.3676');
    expect(hectaresToAlqueires('-1', 'norte')).toBe('-0.3676');
  });
});
