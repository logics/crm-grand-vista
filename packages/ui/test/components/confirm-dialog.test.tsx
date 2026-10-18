// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, type ConfirmDialogProps } from '../../src/index.js';

/** Botão que abre a confirmação e some ao confirmar, como a linha de um item removido. */
function Harness(props: Partial<ConfirmDialogProps>) {
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  return (
    <>
      <button type="button" id="destino">
        Enviar
      </button>
      {!removed && (
        <button type="button" onClick={() => setOpen(true)}>
          Remover laudo.pdf
        </button>
      )}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Remover laudo.pdf?"
        description="O arquivo sai da fazenda."
        confirmLabel="Remover"
        onConfirm={() => setRemoved(true)}
        {...props}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('é um diálogo nomeado pelo título e descrito pela descrição', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover laudo.pdf' }));
    const dialog = screen.getByRole('dialog', { name: 'Remover laudo.pdf?' });
    expect(dialog).toHaveAccessibleDescription('O arquivo sai da fazenda.');
  });

  it('confirma pelo botão de ação e fecha', async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover laudo.pdf' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Cancelar e Escape fecham sem confirmar, e o foco volta a quem abriu', async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    const trigger = screen.getByRole('button', { name: 'Remover laudo.pdf' });

    await userEvent.click(trigger);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(trigger).toHaveFocus();

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ao confirmar, o foco vai para `focusAfterConfirm` quando quem abriu sai da tela', async () => {
    render(<Harness focusAfterConfirm={() => document.getElementById('destino')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover laudo.pdf' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }));
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveFocus();
  });

  it('aceita outro texto para o cancelamento', async () => {
    render(<Harness cancelLabel="Continuar editando" />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover laudo.pdf' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Continuar editando' })).toBeInTheDocument();
  });
});
