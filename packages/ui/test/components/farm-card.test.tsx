// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FarmCard } from '../../src/index.js';

describe('FarmCard', () => {
  it('nome, município, preço com a unidade padrão, área e destaques técnicos', () => {
    render(
      <FarmCard
        name="Fazenda Boa Esperança"
        location="Jaborandi, BA · Oeste da Bahia"
        price="R$ 62.000"
        area="1.480 ha · 1.120 úteis"
        specs={[
          { icon: 'droplets', value: 'Irrigável' },
          { icon: 'wheat', value: 'Soja + milho' },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Fazenda Boa Esperança' })).toBeInTheDocument();
    expect(screen.getByText('Jaborandi, BA · Oeste da Bahia')).toBeInTheDocument();
    expect(screen.getByText('R$ 62.000')).toBeInTheDocument();
    expect(screen.getByText('por hectare')).toBeInTheDocument();
    const specs = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(specs).toEqual(['1.480 ha · 1.120 úteis', 'Irrigável', 'Soja + milho']);
  });

  it('sem foto, mostra o espaço reservado — foto nunca é inventada', () => {
    const { rerender } = render(<FarmCard name="Três Barras" />);
    expect(screen.getByText('Foto da propriedade')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    rerender(<FarmCard name="Três Barras" image="/fotos/tres-barras.webp" />);
    expect(screen.queryByText('Foto da propriedade')).toBeNull();
    expect(document.querySelector('img')).toHaveAttribute('src', '/fotos/tres-barras.webp');
  });

  it('status comercial e selo de destaque', () => {
    render(<FarmCard name="Três Barras" status="Em negociação" statusTone="warning" featured />);
    expect(screen.getByText('Em negociação')).toBeInTheDocument();
    expect(screen.getByText('Destaque')).toBeInTheDocument();
  });

  it('sem preço, não mostra a unidade sozinha', () => {
    render(<FarmCard name="Três Barras" />);
    expect(screen.queryByText('por hectare')).toBeNull();
  });

  it('com onClick, abre pelo mouse e pelo teclado', async () => {
    const onClick = vi.fn();
    render(<FarmCard name="Três Barras" onClick={onClick} />);
    const card = screen.getByRole('button', { name: /Três Barras/ });
    await userEvent.click(card);
    card.focus();
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
