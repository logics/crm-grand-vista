// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../src/index.js';

function SendOpportunity() {
  return (
    <Dialog>
      <DialogTrigger>Enviar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>Oportunidade</DialogEyebrow>
          <DialogTitle>Enviar ao comprador</DialogTitle>
          <DialogDescription>A ficha da fazenda vai por WhatsApp.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <input aria-label="Mensagem" />
        </DialogBody>
        <DialogFooter>
          <DialogClose>Cancelar</DialogClose>
          <button type="button">Confirmar</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function openWithKeyboard() {
  const user = userEvent.setup();
  render(<SendOpportunity />);
  const trigger = screen.getByRole('button', { name: 'Enviar' });
  await user.tab();
  expect(trigger).toHaveFocus();
  await user.keyboard('{Enter}');
  return { user, trigger, dialog: await screen.findByRole('dialog') };
}

describe('Dialog', () => {
  it('abre pelo teclado com nome e descrição acessíveis', async () => {
    const { dialog } = await openWithKeyboard();
    expect(dialog).toHaveAccessibleName('Enviar ao comprador');
    expect(dialog).toHaveAccessibleDescription('A ficha da fazenda vai por WhatsApp.');
  });

  it('leva o foco para dentro do diálogo ao abrir', async () => {
    const { dialog } = await openWithKeyboard();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('prende o foco: Tab e Shift+Tab circulam só dentro do diálogo', async () => {
    const { user, dialog } = await openWithKeyboard();
    for (let step = 0; step < 6; step++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let step = 0; step < 6; step++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('Escape fecha e devolve o foco ao gatilho', async () => {
    const { user, trigger } = await openWithKeyboard();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('o botão Fechar fecha e devolve o foco ao gatilho', async () => {
    const { user, trigger } = await openWithKeyboard();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('DialogClose do rodapé fecha e devolve o foco ao gatilho', async () => {
    const { user, trigger } = await openWithKeyboard();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('trava a rolagem da página enquanto aberto', async () => {
    const { user } = await openWithKeyboard();
    expect(document.body).toHaveAttribute('data-scroll-locked');
    await user.keyboard('{Escape}');
    expect(document.body).not.toHaveAttribute('data-scroll-locked');
  });
});
