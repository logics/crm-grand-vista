// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OpportunityCard } from '../../src/index.js';

describe('OpportunityCard', () => {
  it('comprador, fazenda, valor e probabilidade', () => {
    render(
      <OpportunityCard
        client="Agro Holding Bertoldi"
        farm="Fazenda Três Barras"
        value="R$ 18,4 mi"
        probability={75}
      />,
    );
    expect(screen.getByText('Agro Holding Bertoldi')).toBeInTheDocument();
    expect(screen.getByText('Fazenda Três Barras')).toBeInTheDocument();
    expect(screen.getByText('R$ 18,4 mi')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Probabilidade' })).toHaveAttribute('aria-valuenow', '75');
  });

  it('sem probabilidade, não desenha a barra', () => {
    render(<OpportunityCard client="Agro Holding Bertoldi" value="R$ 18,4 mi" />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('corretor responsável vira iniciais, com o nome completo na dica', () => {
    render(<OpportunityCard client="Bertoldi" owner="Milson Sousa" nextAction="Visita técnica · 28/07" />);
    expect(screen.getByText('MS')).toHaveAttribute('title', 'Milson Sousa');
    expect(screen.getByText('Visita técnica · 28/07')).toBeInTheDocument();
  });

  it('próxima atividade atrasada fica em vermelho: é como a negociação estagnada aparece', () => {
    const { rerender } = render(<OpportunityCard client="Bertoldi" nextAction="Visita técnica · 28/07" />);
    const footer = () => screen.getByText('Visita técnica · 28/07').parentElement!;
    expect(footer()).not.toHaveClass('text-status-danger-fg');
    rerender(<OpportunityCard client="Bertoldi" nextAction="Visita técnica · 28/07" overdue />);
    expect(footer()).toHaveClass('text-status-danger-fg');
  });

  it('com onClick, abre pelo mouse e pelo teclado; sem ele, não é botão', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<OpportunityCard client="Bertoldi" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /Bertoldi/ }));
    screen.getByRole('button').focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
    rerender(<OpportunityCard client="Bertoldi" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
