// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, EmptyState } from '../../src/index.js';

describe('EmptyState', () => {
  it('diz o que falta e oferece a ação que resolve', () => {
    render(
      <EmptyState
        icon="tractor"
        title="Nenhuma fazenda compatível"
        description="Ajuste a faixa de valor do comprador."
        action={<Button variant="secondary">Revisar perfil</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Nenhuma fazenda compatível' })).toBeInTheDocument();
    expect(screen.getByText('Ajuste a faixa de valor do comprador.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar perfil' })).toBeInTheDocument();
  });
});
