// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuditTimeline } from '../../src/index.js';

describe('AuditTimeline', () => {
  it('uma entrada por alteração salva, na ordem recebida, com autor e instante', () => {
    render(
      <AuditTimeline
        items={[
          { id: 'b', title: 'Preço pedido alterado', date: '24/07 · 09h00', author: 'Rafael Tavares' },
          { id: 'a', title: 'Fazenda cadastrada', date: '12/03 · 14h30', author: 'Renata Carvalho', icon: 'plus' },
        ]}
      />,
    );
    const entries = screen.getAllByRole('listitem');
    expect(entries).toHaveLength(2);
    expect(within(entries[0]!).getByText('Preço pedido alterado')).toBeInTheDocument();
    expect(within(entries[0]!).getByText('24/07 · 09h00')).toBeInTheDocument();
    expect(within(entries[0]!).getByText('Rafael Tavares')).toBeInTheDocument();
    expect(within(entries[1]!).getByText('Fazenda cadastrada')).toBeInTheDocument();
  });

  it('cada campo alterado mostra o valor anterior e o novo; vazio vira travessão', () => {
    render(
      <AuditTimeline
        items={[
          {
            title: 'Cadastro editado',
            changes: [
              { field: 'Preço pedido', from: 'R$ 18,4 mi', to: 'R$ 16,9 mi' },
              { field: 'Potencial de venda', from: null, to: 'Alto' },
            ],
          },
        ]}
      />,
    );
    const price = screen.getByText('Preço pedido').closest('li')!;
    expect(within(price).getByText('R$ 18,4 mi').tagName).toBe('DEL');
    expect(within(price).getByText('R$ 16,9 mi').tagName).toBe('INS');
    const potential = screen.getByText('Potencial de venda').closest('li')!;
    expect(within(potential).getByText('—').tagName).toBe('DEL');
  });

  it('detalhe em texto livre abaixo do título', () => {
    render(
      <AuditTimeline items={[{ title: 'Status comercial alterado', detail: 'Proprietário suspendeu a venda.' }]} />,
    );
    expect(screen.getByText('Proprietário suspendeu a venda.')).toBeInTheDocument();
  });
});
