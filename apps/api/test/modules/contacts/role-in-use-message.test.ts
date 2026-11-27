import { describe, expect, it } from 'vitest';
import { roleInUseMessage } from '../../../src/modules/contacts/role-in-use-message.js';

const chains = { singular: 'cadeia de indicação', plural: 'cadeias de indicação' };
const farms = { singular: 'fazenda', plural: 'fazendas' };

describe('roleInUseMessage', () => {
  it('omite o número quando a contagem visível é menor que a total, com a frase própria', () => {
    const message = roleInUseMessage('Antônio', 'corretor externo', [
      { label: chains, uncountedPhrase: 'em cadeias de indicação', total: 3, visible: 1 },
    ]);
    expect(message).toBe(
      'Antônio é corretor externo em cadeias de indicação; troque o corretor externo antes de retirar o papel.',
    );
  });

  it('omite o número sem frase própria usando "de <plural>"', () => {
    const message = roleInUseMessage('Paulo', 'proprietário', [{ label: farms, total: 3, visible: 1 }]);
    expect(message).toBe('Paulo é proprietário de fazendas; troque o proprietário antes de retirar o papel.');
  });

  it('omite o número também quando a contagem visível é zero', () => {
    const message = roleInUseMessage('Paulo', 'proprietário', [{ label: farms, total: 2, visible: 0 }]);
    expect(message).toBe('Paulo é proprietário de fazendas; troque o proprietário antes de retirar o papel.');
  });

  it('mantém o número quando a contagem visível é igual à total (plural e singular)', () => {
    expect(roleInUseMessage('Paulo', 'proprietário', [{ label: farms, total: 3, visible: 3 }])).toBe(
      'Paulo é proprietário de 3 fazendas; troque o proprietário antes de retirar o papel.',
    );
    expect(
      roleInUseMessage('Antônio', 'corretor externo', [
        { label: chains, uncountedPhrase: 'em cadeias de indicação', total: 1, visible: 1 },
      ]),
    ).toBe('Antônio é corretor externo de 1 cadeia de indicação; troque o corretor externo antes de retirar o papel.');
  });

  it('mantém o número quando a declaração não tem contagem visível', () => {
    expect(roleInUseMessage('João', 'proprietário', [{ label: farms, total: 2 }])).toBe(
      'João é proprietário de 2 fazendas; troque o proprietário antes de retirar o papel.',
    );
  });

  it('junta várias declarações com "e", cada uma com a sua regra', () => {
    const message = roleInUseMessage('Ana', 'proprietário', [
      { label: farms, total: 2 },
      { label: chains, uncountedPhrase: 'em cadeias de indicação', total: 3, visible: 1 },
    ]);
    expect(message).toBe(
      'Ana é proprietário de 2 fazendas e em cadeias de indicação; troque o proprietário antes de retirar o papel.',
    );
  });
});
