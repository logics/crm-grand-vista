// Limite de tentativas de login por e-mail, em memória do processo. O contador
// é por e-mail digitado — exista a conta ou não — para que o bloqueio não
// revele quais e-mails têm conta. Janela fixa, aberta na primeira falha.
// Limite conhecido: o estado some no restart e não é compartilhado entre
// instâncias; com mais de uma instância, o contador passa para o banco.

interface Entry {
  failures: number;
  windowEndsAt: number;
}

export type LoginRateLimitCheck = { blocked: false } | { blocked: true; retryAfterSeconds: number };

interface LoginRateLimitOptions {
  maxFailures: number;
  windowMs: number;
  now?: () => number;
}

const keyOf = (email: string): string => email.trim().toLowerCase();

export function createLoginRateLimit({ maxFailures, windowMs, now = Date.now }: LoginRateLimitOptions) {
  const entries = new Map<string, Entry>();

  const sweep = (at: number): void => {
    for (const [key, entry] of entries) if (entry.windowEndsAt <= at) entries.delete(key);
  };

  return {
    check(email: string): LoginRateLimitCheck {
      const at = now();
      const entry = entries.get(keyOf(email));
      if (!entry || entry.windowEndsAt <= at || entry.failures < maxFailures) return { blocked: false };

      return { blocked: true, retryAfterSeconds: Math.ceil((entry.windowEndsAt - at) / 1000) };
    },

    recordFailure(email: string): void {
      const at = now();
      sweep(at);
      const key = keyOf(email);
      const entry = entries.get(key);
      if (entry) entry.failures += 1;
      else entries.set(key, { failures: 1, windowEndsAt: at + windowMs });
    },

    reset(email: string): void {
      entries.delete(keyOf(email));
    },

    size: (): number => entries.size,
  };
}

export type LoginRateLimit = ReturnType<typeof createLoginRateLimit>;
