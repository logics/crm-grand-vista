// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from '../../src/index.js';

describe('IconButton', () => {
  it('o rótulo obrigatório é o nome acessível e a dica', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon="pencil" label="Editar" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Editar' });
    expect(button).toHaveAttribute('title', 'Editar');
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('o ponto de notificação não altera o nome', () => {
    render(<IconButton icon="bell" label="Notificações" dot />);
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('não envia formulário por engano', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <IconButton icon="more-vertical" label="Mais ações" />
      </form>,
    );
    await user.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
