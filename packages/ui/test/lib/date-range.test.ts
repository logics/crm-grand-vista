import { describe, expect, it } from 'vitest';
import {
  defaultDateRangePresets,
  formatDisplayDate,
  maskDateInput,
  parseDisplayDate,
  parseIsoDate,
  toIsoDate,
} from '../../src/lib/date-range.js';

describe('toIsoDate / parseIsoDate', () => {
  it('vai e volta pela data local, sem deslocar o dia por fuso', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(parseIsoDate('2026-01-05')).toEqual(new Date(2026, 0, 5));
  });

  it('rejeita string que não é uma data real', () => {
    expect(parseIsoDate('2026-02-30')).toBeUndefined();
    expect(parseIsoDate('05/01/2026')).toBeUndefined();
    expect(parseIsoDate(undefined)).toBeUndefined();
  });
});

describe('formatDisplayDate / parseDisplayDate', () => {
  it('mostra dd/mm/aaaa', () => {
    expect(formatDisplayDate('2026-10-05')).toBe('05/10/2026');
    expect(formatDisplayDate(undefined)).toBe('');
  });

  it('lê dd/mm/aaaa completo e válido', () => {
    expect(parseDisplayDate('05/10/2026')).toBe('2026-10-05');
  });

  it('não lê incompleto, inexistente ou ano de dois dígitos', () => {
    expect(parseDisplayDate('05/10/20')).toBeUndefined();
    expect(parseDisplayDate('31/02/2026')).toBeUndefined();
    expect(parseDisplayDate('00/10/2026')).toBeUndefined();
    expect(parseDisplayDate('')).toBeUndefined();
  });

  it('aceita fevereiro de ano bissexto', () => {
    expect(parseDisplayDate('29/02/2028')).toBe('2028-02-29');
    expect(parseDisplayDate('29/02/2026')).toBeUndefined();
  });
});

describe('maskDateInput', () => {
  it('insere as barras e descarta o que não é dígito', () => {
    expect(maskDateInput('0', '')).toBe('0');
    expect(maskDateInput('051', '05')).toBe('05/1');
    expect(maskDateInput('05102026', '')).toBe('05/10/2026');
    expect(maskDateInput('05a/10/2026999', '')).toBe('05/10/2026');
  });

  it('apagar uma barra apaga o dígito antes dela', () => {
    expect(maskDateInput('05', '05/')).toBe('0');
    expect(maskDateInput('05/10', '05/10/')).toBe('05/1');
  });

  it('apagar um dígito comum só o tira', () => {
    expect(maskDateInput('05/10/202', '05/10/2026')).toBe('05/10/202');
  });
});

describe('defaultDateRangePresets', () => {
  const presets = defaultDateRangePresets(new Date(2026, 9, 20));
  const range = (label: string) => presets.find((preset) => preset.label === label)?.range;

  it('traz os quatro atalhos, na ordem', () => {
    expect(presets.map((preset) => preset.label)).toEqual([
      'Últimos 7 dias',
      'Este mês',
      'Mês passado',
      'Este ano',
    ]);
  });

  it('calcula cada intervalo a partir de hoje', () => {
    expect(range('Últimos 7 dias')).toEqual({ from: '2026-10-14', to: '2026-10-20' });
    expect(range('Este mês')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(range('Mês passado')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(range('Este ano')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('mês passado em janeiro cai em dezembro do ano anterior', () => {
    const january = defaultDateRangePresets(new Date(2027, 0, 10));
    expect(january.find((preset) => preset.label === 'Mês passado')?.range).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });
});
