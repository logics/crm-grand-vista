import { describe, expect, it } from 'vitest';
import { landingPath } from '../../../src/modules/auth/landing.js';
import { session, sessionTenant as tenant } from '../../support/fake-api.js';

describe('landingPath', () => {
  it('leva à empresa padrão, onde quer que ela esteja na lista', () => {
    expect(landingPath(session({ tenants: [tenant('norte'), tenant('grand-vista', { isDefault: true })] }))).toBe(
      '/e/grand-vista',
    );
  });

  it('sem empresa padrão, leva à primeira da lista', () => {
    expect(landingPath(session({ tenants: [tenant('norte'), tenant('sul')] }))).toBe('/e/norte');
  });

  it('não leva à empresa bloqueada se houver outra disponível', () => {
    expect(
      landingPath(session({ tenants: [tenant('grand-vista', { isDefault: true, blocked: true }), tenant('norte')] })),
    ).toBe('/e/norte');
    expect(landingPath(session({ tenants: [tenant('norte', { blocked: true }), tenant('sul')] }))).toBe('/e/sul');
  });

  it('com todas bloqueadas, leva à padrão — a tela de lá diz o porquê', () => {
    expect(
      landingPath(
        session({
          tenants: [tenant('norte', { blocked: true }), tenant('grand-vista', { isDefault: true, blocked: true })],
        }),
      ),
    ).toBe('/e/grand-vista');
  });

  it('sem vínculo, não há empresa para onde ir', () => {
    expect(landingPath(session({ tenants: [] }))).toBeNull();
  });

  it('o slug vai codificado no caminho', () => {
    expect(landingPath(session({ tenants: [tenant('a b', { isDefault: true })] }))).toBe('/e/a%20b');
  });
});
