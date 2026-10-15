// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../../src/index.js';

describe('Badge', () => {
  it('mostra o estado; ponto e glifo ficam fora do texto acessível', () => {
    const { container } = render(
      <Badge tone="warning" icon="file-warning" dot>
        Documentação pendente
      </Badge>,
    );
    expect(screen.getByText('Documentação pendente')).toBeInTheDocument();
    for (const decoration of container.querySelectorAll('[data-slot=badge] > :not(:last-child)')) {
      expect(decoration).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
