import { describe, expect, it } from 'vitest';
import { initials } from '../../src/lib/initials.js';

describe('initials', () => {
  it('primeira letra do primeiro e do último nome, em caixa-alta', () => {
    expect(initials('Rafael Tavares')).toBe('RT');
    expect(initials('renata de carvalho')).toBe('RC');
  });

  it('sigla já pronta passa como está', () => {
    expect(initials('RT')).toBe('RT');
  });

  it('nome de uma palavra só dá as duas primeiras letras', () => {
    expect(initials('Diego')).toBe('DI');
  });

  it('ignora espaços sobrando', () => {
    expect(initials('  Ana   Paula  ')).toBe('AP');
  });
});
