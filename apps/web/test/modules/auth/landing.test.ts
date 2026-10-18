import { describe, expect, it } from 'vitest';
import { landingPath } from '../../../src/modules/auth/landing.js';
import { session } from '../../support/fake-api.js';

const tenant = (slug: string, isDefault = false) => ({ slug, name: slug, isDefault, blocked: false });

describe('landingPath', () => {
  it('leva à empresa padrão, onde quer que ela esteja na lista', () => {
    expect(landingPath(session({ tenants: [tenant('norte'), tenant('grand-vista', true)] }))).toBe('/e/grand-vista');
  });

  it('sem empresa padrão, leva à primeira da lista', () => {
    expect(landingPath(session({ tenants: [tenant('norte'), tenant('sul')] }))).toBe('/e/norte');
  });

  it('sem vínculo, não há empresa para onde ir', () => {
    expect(landingPath(session({ tenants: [] }))).toBeNull();
  });

  it('o slug vai codificado no caminho', () => {
    expect(landingPath(session({ tenants: [tenant('a b', true)] }))).toBe('/e/a%20b');
  });
});
