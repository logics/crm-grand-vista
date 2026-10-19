import { describe, expect, it } from 'vitest';
import { relativeTenantPath, switchTenantPath, tenantPath, tenantRootPath } from '../../src/shell/tenant-path.js';

describe('tenantRootPath', () => {
  it('é a raiz da empresa, com o slug codificado', () => {
    expect(tenantRootPath('grand-vista')).toBe('/e/grand-vista');
    expect(tenantRootPath('a b')).toBe('/e/a%20b');
  });
});

describe('tenantPath', () => {
  it('é a página sob a raiz da empresa', () => {
    expect(tenantPath('grand-vista', 'farms')).toBe('/e/grand-vista/farms');
  });

  it('sem página, é a raiz', () => {
    expect(tenantPath('grand-vista', '')).toBe('/e/grand-vista');
  });
});

describe('relativeTenantPath', () => {
  it('é o caminho sob a raiz da empresa, sem barras nas pontas', () => {
    expect(relativeTenantPath('/e/grand-vista/farms/123/')).toBe('farms/123');
  });

  it('na raiz da empresa, é vazio', () => {
    expect(relativeTenantPath('/e/grand-vista')).toBe('');
    expect(relativeTenantPath('/e/grand-vista/')).toBe('');
  });
});

describe('switchTenantPath', () => {
  it('leva ao mesmo recurso sob o outro slug', () => {
    expect(switchTenantPath('/e/grand-vista/farms/123', 'norte')).toBe('/e/norte/farms/123');
  });

  it('da raiz de uma empresa, leva à raiz da outra', () => {
    expect(switchTenantPath('/e/grand-vista', 'norte')).toBe('/e/norte');
    expect(switchTenantPath('/e/grand-vista/', 'norte')).toBe('/e/norte/');
  });

  it('troca só o segmento da empresa, mesmo que o slug se repita adiante', () => {
    expect(switchTenantPath('/e/norte/farms/norte', 'sul')).toBe('/e/sul/farms/norte');
  });

  it('fora de uma empresa, leva à raiz da escolhida', () => {
    expect(switchTenantPath('/', 'norte')).toBe('/e/norte');
  });
});
