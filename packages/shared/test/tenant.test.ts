import { describe, expect, it } from 'vitest';
import { RESERVED_TENANT_SLUGS, tenantSlugSchema } from '../src/tenant.js';

const issueOf = (slug: string) => tenantSlugSchema.safeParse(slug).error?.issues[0]?.message;

describe('slug de empresa', () => {
  it.each(['grand-vista', 'gv2', 'fazendas-do-cerrado-2026', 'a'.repeat(63)])('aceita %s', (slug) => {
    expect(tenantSlugSchema.parse(slug)).toBe(slug);
  });

  it.each([
    ['maiúscula', 'Grand-Vista'],
    ['acento', 'agropecuária'],
    ['espaço', 'grand vista'],
    ['sublinhado', 'grand_vista'],
    ['barra', 'grand/vista'],
    ['hífen no início', '-grandvista'],
    ['hífen no fim', 'grandvista-'],
    ['hífen repetido', 'grand--vista'],
  ])('recusa %s', (_label, slug) => {
    expect(issueOf(slug)).toMatch(/minúsculas/);
  });

  it('recusa curto demais e longo demais', () => {
    expect(issueOf('gv')).toMatch(/ao menos 3/);
    expect(issueOf('a'.repeat(64))).toMatch(/no máximo 63/);
  });

  it.each(['api', 'admin', 'app', 'e', 'assets', 'static', 'login'])('recusa o reservado %s', (slug) => {
    expect(tenantSlugSchema.safeParse(slug).success).toBe(false);
  });

  it('recusa como reservado o slug que tem formato válido', () => {
    expect(issueOf('admin')).toBe('Este slug é reservado pela aplicação.');
  });

  it('a lista de reservados é a da spec', () => {
    expect([...RESERVED_TENANT_SLUGS].sort()).toEqual(['admin', 'api', 'app', 'assets', 'e', 'login', 'static']);
  });
});
