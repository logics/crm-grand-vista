// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from '../../src/index.js';

describe('Icon', () => {
  it('é decorativo por padrão: fica fora da árvore de acessibilidade', () => {
    const { container } = render(<Icon name="tractor" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('com `title`, é uma imagem com nome acessível', () => {
    render(<Icon name="droplets" title="Disponibilidade hídrica" />);
    expect(screen.getByRole('img', { name: 'Disponibilidade hídrica' })).not.toHaveAttribute('aria-hidden');
  });

  it('desenha o glifo Lucide do nome, no traço de 1,5 da marca', () => {
    const { container } = render(<Icon name="map-pin" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveClass('lucide-map-pin');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
  });

  it('tamanho vem da escala de tokens e cede a uma classe de quem usa', () => {
    const { container } = render(<Icon name="x" size="md" className="size-8" />);
    expect(container.querySelector('svg')).toHaveClass('size-8');
    expect(container.querySelector('svg')).not.toHaveClass('size-6');
  });
});
