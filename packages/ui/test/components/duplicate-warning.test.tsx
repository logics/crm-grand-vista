// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DuplicateWarning, type DuplicateWarningItem, type DuplicateWarningLink } from '../../src/index.js';

const Anchor: DuplicateWarningLink = (props) => <a {...props} />;

function renderWarning(item: Partial<DuplicateWarningItem> = {}) {
  render(
    <DuplicateWarning
      title="Já existe um cadastro parecido com este."
      label="Possível cadastro duplicado"
      linkComponent={Anchor}
      onSaveAnyway={() => {}}
      items={[{ id: '1', label: 'Maria Souza', reasons: ['Mesmo WhatsApp'], href: '#maria', ...item }]}
    />,
  );
  return screen.getByRole('listitem');
}

describe('DuplicateWarning — detalhe do item', () => {
  it('mostra o detalhe depois dos motivos', () => {
    const li = renderWarning({ detail: 'Comprador, Proprietário' });
    const detail = within(li).getByText('Comprador, Proprietário');
    expect(li.lastElementChild).toBe(detail);
    expect(detail.previousElementSibling).toHaveTextContent('Mesmo WhatsApp');
  });

  it('sem detalhe, o item fica só com link e motivos', () => {
    const li = renderWarning();
    expect(li.children).toHaveLength(2);
    expect(li.querySelector('.opacity-80')).toBeNull();
  });

  it('detalhe vazio não deixa elemento sobrando', () => {
    for (const detail of ['', null, false]) {
      document.body.innerHTML = '';
      const li = renderWarning({ detail });
      expect(li.children).toHaveLength(2);
    }
  });

  it('aceita um nó como detalhe', () => {
    const li = renderWarning({ detail: <strong>Comprador</strong> });
    expect(within(li).getByText('Comprador').tagName).toBe('STRONG');
  });
});
