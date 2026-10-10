import { describe, expect, it } from 'vitest';
import { uuidv7 } from './uuid.js';

describe('uuidv7', () => {
  it('gera um UUID versão 7, variante RFC 9562', () => {
    expect(uuidv7()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('carrega o instante em milissegundos nos 48 bits iniciais', () => {
    const instant = Date.UTC(2026, 9, 10, 12, 0, 0);

    const timestamp = Number.parseInt(uuidv7(instant).replaceAll('-', '').slice(0, 12), 16);

    expect(timestamp).toBe(instant);
  });

  it('ordena pelo instante de criação', () => {
    const earlier = uuidv7(1_000);
    const later = uuidv7(2_000);

    expect(earlier < later).toBe(true);
  });

  it('não repete dentro do mesmo milissegundo', () => {
    const ids = new Set(Array.from({ length: 1_000 }, () => uuidv7(1_000)));

    expect(ids.size).toBe(1_000);
  });
});
