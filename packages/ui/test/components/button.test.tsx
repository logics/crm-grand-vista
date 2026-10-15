// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../src/index.js';

describe('Button', () => {
  it('é um botão nomeado pelo rótulo; os glifos são decorativos', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button icon="plus" iconRight="chevron-right" onClick={onClick}>
        Cadastrar fazenda
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('mostra o contador depois do rótulo', () => {
    render(<Button count={3}>Filtros</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Filtros3');
  });

  it('contador zero ainda aparece', () => {
    render(<Button count={0}>Filtros</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Filtros0');
  });

  it('desabilitado não dispara clique', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('não envia o formulário sem declarar `submit`', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <Button variant="ghost">Cancelar</Button>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia o formulário quando é do tipo submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Entrar</Button>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
