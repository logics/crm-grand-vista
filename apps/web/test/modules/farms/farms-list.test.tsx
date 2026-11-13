import { describe, expect, it } from 'vitest';
import { primaryOwnerLabel } from '../../../src/modules/farms/farms-page.js';

const owner = (name: string, isPrimary: boolean) => ({ contactId: name, name, isPrimary });

describe('lista de fazendas: proprietário principal', () => {
  it('mostra o principal com +N quando há mais proprietários', () => {
    expect(primaryOwnerLabel([owner('João', false), owner('Maria', true), owner('Pedro', false)])).toBe('Maria +2');
  });

  it('mostra só o nome com um proprietário e traço sem nenhum', () => {
    expect(primaryOwnerLabel([owner('Maria', true)])).toBe('Maria');
    expect(primaryOwnerLabel([])).toBe('—');
  });
});
