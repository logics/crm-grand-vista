// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from '../../src/index.js';

describe('StatCard', () => {
  it('rótulo, valor com unidade, variação e rodapé', () => {
    render(
      <StatCard
        label="Tempo médio de venda"
        value="94"
        unit="dias"
        delta="estável"
        deltaTone="neutral"
        icon="clock"
        footnote="Últimos 12 meses"
      />,
    );
    expect(screen.getByText('Tempo médio de venda')).toBeInTheDocument();
    expect(screen.getByText('94')).toBeInTheDocument();
    expect(screen.getByText('dias')).toBeInTheDocument();
    expect(screen.getByText('estável')).toBeInTheDocument();
    expect(screen.getByText('Últimos 12 meses')).toBeInTheDocument();
  });

  it('a variação usa o tom pedido', () => {
    render(<StatCard label="Vendas" value="12" delta="-8%" deltaTone="danger" />);
    expect(screen.getByText('-8%').closest('[data-slot=badge]')).toHaveClass('text-status-danger-fg');
  });

  it('quebra em linhas de rótulo e valor', () => {
    render(
      <StatCard
        label="Valor em negociação"
        value="R$ 48,2 mi"
        rows={[
          { label: 'Soja', value: 'R$ 30 mi' },
          { label: 'Pecuária', value: 'R$ 18,2 mi' },
        ]}
      />,
    );
    expect(screen.getAllByRole('term').map((label) => label.textContent)).toEqual(['Soja', 'Pecuária']);
    expect(screen.getAllByRole('definition').map((value) => value.textContent)).toEqual(['R$ 30 mi', 'R$ 18,2 mi']);
  });
});
