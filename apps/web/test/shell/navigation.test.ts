import type { PermissionCode } from '@crm/shared';
import { describe, expect, it } from 'vitest';
import { activeNavigationId, type NavigationEntry, visibleNavigation } from '../../src/shell/navigation.js';

const entries: NavigationEntry[] = [
  { id: 'home', label: 'Início', icon: 'house', path: '' },
  { id: 'fazendas', label: 'Fazendas', icon: 'tractor', path: 'farms', section: 'Comercial', permission: 'fazendas.ver' },
  { id: 'contatos', label: 'Contatos', icon: 'users', path: 'contacts', section: 'Comercial', permission: 'contatos.ver' },
  {
    id: 'perfis',
    label: 'Perfis de acesso',
    icon: 'user-round-cog',
    path: 'access-profiles',
    section: 'Administração',
    permission: 'perfis_de_acesso.gerenciar',
  },
];

const can = (...granted: PermissionCode[]) => (code: PermissionCode) => granted.includes(code);

describe('visibleNavigation', () => {
  it('mostra o item sem permissão exigida a todos', () => {
    expect(visibleNavigation(entries, can())).toEqual([{ id: 'home', label: 'Início', icon: 'house' }]);
  });

  it('mostra só os itens cuja permissão o usuário tem, sob o rótulo do grupo', () => {
    expect(visibleNavigation(entries, can('contatos.ver'))).toEqual([
      { id: 'home', label: 'Início', icon: 'house' },
      { section: 'Comercial' },
      { id: 'contatos', label: 'Contatos', icon: 'users' },
    ]);
  });

  it('repete o rótulo do grupo uma vez só, e só para grupo com item visível', () => {
    const items = visibleNavigation(entries, can('fazendas.ver', 'contatos.ver', 'perfis_de_acesso.gerenciar'));
    expect(items.filter((item) => 'section' in item)).toEqual([{ section: 'Comercial' }, { section: 'Administração' }]);
    expect(items).toHaveLength(6);
  });
});

describe('activeNavigationId', () => {
  it('na raiz da empresa, é o início', () => {
    expect(activeNavigationId(entries, '/e/grand-vista')).toBe('home');
    expect(activeNavigationId(entries, '/e/grand-vista/')).toBe('home');
  });

  it('dentro de um módulo, é o item do módulo', () => {
    expect(activeNavigationId(entries, '/e/grand-vista/farms')).toBe('fazendas');
    expect(activeNavigationId(entries, '/e/grand-vista/farms/123')).toBe('fazendas');
  });

  it('não confunde módulo com outro de mesmo prefixo', () => {
    expect(activeNavigationId(entries, '/e/grand-vista/farmsteads')).toBeUndefined();
  });
});
