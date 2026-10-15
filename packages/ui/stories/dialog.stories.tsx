import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Button,
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
} from '../src/index.js';

// Aberto, o diálogo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Primitivos/Dialog',
  component: DialogContent,
  tags: ['!autodocs'],
  args: { variant: 'center', showCloseButton: true },
  render: (args) => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>Enviar oportunidade</Button>
      </DialogTrigger>
      <DialogContent {...args}>
        <DialogHeader>
          <DialogEyebrow>Oportunidade</DialogEyebrow>
          <DialogTitle>Enviar ao comprador</DialogTitle>
          <DialogDescription>Fazenda Três Barras · Agro Holding Bertoldi</DialogDescription>
        </DialogHeader>
        <DialogBody className="text-sm">
          A ficha resumida vai por WhatsApp, com o link da galeria e o valor por hectare útil.
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button icon="send">Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof DialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Centrado: Story = {};

export const Folha: Story = { args: { variant: 'sheet' } };

export const SemBotaoFechar: Story = { name: 'Sem botão fechar', args: { showCloseButton: false } };
