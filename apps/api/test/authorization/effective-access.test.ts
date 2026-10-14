import { PERMISSION_CATALOG, PERMISSION_MODULES } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import {
  buildEffectiveAccess,
  dataScopeOf,
  unrestrictedAccess,
  widestScope,
} from '../../src/authorization/effective-access.js';

const USER_ID = '0190a5e0-0000-7000-8000-000000000001';

describe('permissão efetiva', () => {
  it('é a união das permissões dos perfis de acesso, sem subtração', () => {
    const access = buildEffectiveAccess(USER_ID, [
      { permissions: ['fazendas.ver', 'fazendas.criar'], dataScopes: [] },
      { permissions: ['fazendas.ver', 'configuracoes.gerenciar'], dataScopes: [] },
      // Perfil vazio não tira nada de ninguém.
      { permissions: [], dataScopes: [] },
    ]);

    expect([...access.permissions].sort()).toEqual(['configuracoes.gerenciar', 'fazendas.criar', 'fazendas.ver']);
  });

  it('sem perfil de acesso, não concede nada e o escopo é own em todo módulo', () => {
    const access = buildEffectiveAccess(USER_ID, []);

    expect(access.permissions.size).toBe(0);
    expect(PERMISSION_MODULES.map((module) => dataScopeOf(access, module))).toEqual(PERMISSION_MODULES.map(() => 'own'));
  });

  it('a travessia irrestrita tem todo o catálogo e escopo all em todo módulo', () => {
    const access = unrestrictedAccess(USER_ID);

    expect([...access.permissions].sort()).toEqual(PERMISSION_CATALOG.map((permission) => permission.code).sort());
    expect(PERMISSION_MODULES.every((module) => dataScopeOf(access, module) === 'all')).toBe(true);
  });
});

describe('escopo de dados por módulo', () => {
  it('o mais amplo vence: all em qualquer escopo vence own', () => {
    expect(widestScope(['own', 'all'])).toBe('all');
    expect(widestScope(['all', 'own'])).toBe('all');
    expect(widestScope(['own', 'own'])).toBe('own');
    expect(widestScope([])).toBe('own');
  });

  it('com um perfil de acesso, vale o escopo dele em cada módulo', () => {
    const access = buildEffectiveAccess(USER_ID, [
      { permissions: [], dataScopes: [{ module: 'fazendas', scope: 'own' }, { module: 'contatos', scope: 'all' }] },
    ]);

    expect(dataScopeOf(access, 'fazendas')).toBe('own');
    expect(dataScopeOf(access, 'contatos')).toBe('all');
  });

  it('dois perfis com escopos divergentes no mesmo módulo resolvem para o mais amplo', () => {
    const scopes = (first: 'own' | 'all', second: 'own' | 'all') =>
      buildEffectiveAccess(USER_ID, [
        { permissions: [], dataScopes: [{ module: 'fazendas', scope: first }, { module: 'oportunidades', scope: 'own' }] },
        { permissions: [], dataScopes: [{ module: 'fazendas', scope: second }] },
      ]);

    // A ordem dos perfis não muda o resultado.
    expect(dataScopeOf(scopes('own', 'all'), 'fazendas')).toBe('all');
    expect(dataScopeOf(scopes('all', 'own'), 'fazendas')).toBe('all');
    // O módulo que só um perfil declara fica como ele declarou.
    expect(dataScopeOf(scopes('own', 'all'), 'oportunidades')).toBe('own');
  });

  it('módulo que nenhum perfil de acesso declara vale own', () => {
    const access = buildEffectiveAccess(USER_ID, [
      { permissions: [], dataScopes: [{ module: 'contatos', scope: 'all' }] },
    ]);

    expect(dataScopeOf(access, 'fazendas')).toBe('own');
  });
});
