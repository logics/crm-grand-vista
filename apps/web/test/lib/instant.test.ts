import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatInstant } from '../../src/lib/instant.js';

// `TZ` troca o fuso do processo, que faz as vezes do fuso do navegador.
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('formatInstant', () => {
  it('formata o instante UTC no fuso do navegador: Goiás em UTC−3', () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    expect(formatInstant('2026-07-24T17:30:00.000Z')).toBe('24/07 · 14h30');
  });

  it('o mesmo instante, lido em Mato Grosso (UTC−4), sai uma hora antes', () => {
    vi.stubEnv('TZ', 'America/Cuiaba');
    expect(formatInstant('2026-07-24T17:30:00.000Z')).toBe('24/07 · 13h30');
  });

  it('o dia também é o do fuso de quem lê', () => {
    vi.stubEnv('TZ', 'America/Sao_Paulo');
    expect(formatInstant('2026-07-25T03:05:00.000Z')).toBe('25/07 · 00h05');
    vi.stubEnv('TZ', 'America/Cuiaba');
    expect(formatInstant('2026-07-25T03:05:00.000Z')).toBe('24/07 · 23h05');
  });
});
