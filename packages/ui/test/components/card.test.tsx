// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, Card } from '../../src/index.js';

describe('Card', () => {
  it('cabeçalho com sobretítulo, título, subtítulo e ação', () => {
    render(
      <Card
        eyebrow="Funil"
        title="Negociações ativas"
        subtitle="Atualizado hoje"
        action={<Button size="sm">Ver todas</Button>}
      >
        Corpo
      </Card>,
    );
    expect(screen.getByRole('heading', { name: 'Negociações ativas' })).toBeInTheDocument();
    expect(screen.getByText('Funil')).toBeInTheDocument();
    expect(screen.getByText('Atualizado hoje')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver todas' })).toBeInTheDocument();
    expect(screen.getByText('Corpo')).toBeInTheDocument();
  });

  it('subtítulo sozinho também abre o cabeçalho', () => {
    render(<Card subtitle="Sem título">Corpo</Card>);
    expect(screen.getByText('Sem título')).toBeInTheDocument();
  });

  it('sem título, sobretítulo nem ação, é só a superfície', () => {
    const { container } = render(<Card>Corpo</Card>);
    expect(container.querySelector('header')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
