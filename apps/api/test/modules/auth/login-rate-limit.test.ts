import { describe, expect, it } from 'vitest';
import { createLoginRateLimit } from '../../../src/modules/auth/login-rate-limit.js';

const MINUTE = 60_000;

function setup(options: { maxFailures?: number; windowMs?: number } = {}) {
  let now = 1_000_000;
  const limit = createLoginRateLimit({
    maxFailures: options.maxFailures ?? 3,
    windowMs: options.windowMs ?? 15 * MINUTE,
    now: () => now,
  });
  return { limit, advance: (ms: number) => (now += ms) };
}

describe('limite de tentativas de login', () => {
  it('não bloqueia enquanto as falhas não chegam ao máximo', () => {
    const { limit } = setup();
    limit.recordFailure('a@x.com');
    limit.recordFailure('a@x.com');

    expect(limit.check('a@x.com')).toEqual({ blocked: false });
  });

  it('bloqueia ao atingir o máximo de falhas e informa quanto falta', () => {
    const { limit, advance } = setup();
    for (let i = 0; i < 3; i++) limit.recordFailure('a@x.com');
    advance(5 * MINUTE);

    expect(limit.check('a@x.com')).toEqual({ blocked: true, retryAfterSeconds: 10 * 60 });
  });

  it('libera quando a janela expira', () => {
    const { limit, advance } = setup();
    for (let i = 0; i < 3; i++) limit.recordFailure('a@x.com');
    advance(15 * MINUTE);

    expect(limit.check('a@x.com')).toEqual({ blocked: false });
  });

  it('conta por e-mail, sem diferenciar caixa e espaços', () => {
    const { limit } = setup();
    limit.recordFailure('A@x.com');
    limit.recordFailure(' a@X.com ');
    limit.recordFailure('a@x.com');

    expect(limit.check('a@x.com').blocked).toBe(true);
    expect(limit.check('b@x.com').blocked).toBe(false);
  });

  it('zera o contador num login bem-sucedido', () => {
    const { limit } = setup();
    limit.recordFailure('a@x.com');
    limit.recordFailure('a@x.com');
    limit.reset('a@x.com');
    limit.recordFailure('a@x.com');

    expect(limit.check('a@x.com').blocked).toBe(false);
  });

  it('descarta contadores vencidos para a memória não crescer sem limite', () => {
    const { limit, advance } = setup();
    limit.recordFailure('a@x.com');
    advance(16 * MINUTE);
    limit.recordFailure('b@x.com');

    expect(limit.size()).toBe(1);
  });
});
