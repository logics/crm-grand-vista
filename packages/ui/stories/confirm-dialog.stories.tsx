import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Button, ConfirmDialog, type ConfirmDialogProps } from '../src/index.js';

/** O botão reabre a confirmação depois de fechada, como na tela. */
function WithTrigger({ trigger, ...props }: ConfirmDialogProps & { trigger: string }) {
  const [open, setOpen] = useState(props.open);
  return (
    <>
      <Button variant="soft" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <ConfirmDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

// Aberto, o diálogo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Feedback/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['!autodocs'],
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    title: 'Remover matricula-12345.pdf?',
    description: 'O arquivo sai da fazenda.',
    confirmLabel: 'Remover',
    confirmIcon: 'trash-2',
  },
  render: (args) => <WithTrigger {...args} trigger="Remover documento" />,
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Remover: Story = {};

export const Descartar: Story = {
  args: {
    title: 'Descartar alterações?',
    description: 'O que foi preenchido e não foi salvo se perde.',
    confirmLabel: 'Descartar',
    confirmIcon: undefined,
    cancelLabel: 'Continuar editando',
  },
  render: (args) => <WithTrigger {...args} trigger="Cancelar cadastro" />,
};
