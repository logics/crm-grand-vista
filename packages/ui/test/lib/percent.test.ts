import { describe, expect, it } from 'vitest';
import { clampPercent, roundPercent } from '../../src/lib/percent.js';

describe('clampPercent', () => {
  it('mantém o valor entre 0 e 100', () => {
    expect(clampPercent(42)).toBe(42);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(140)).toBe(100);
  });

  it('valor que não é número finito vira 0', () => {
    expect(clampPercent(Number.NaN)).toBe(0);
    expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('roundPercent', () => {
  it('limita e arredonda para exibir', () => {
    expect(roundPercent(63.7)).toBe(64);
    expect(roundPercent(140)).toBe(100);
  });
});
