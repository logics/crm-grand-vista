import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Popover, PopoverContent, PopoverTrigger } from '../src/index.js';

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Primitivos/Popover',
  component: PopoverContent,
  tags: ['!autodocs'],
  args: { align: 'start' },
  render: (args) => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="secondary" icon="sliders-horizontal">
          Filtros
        </Button>
      </PopoverTrigger>
      <PopoverContent {...args} className="text-sm">
        Faixa de valor, área útil e aptidão.
      </PopoverContent>
    </Popover>
  ),
} satisfies Meta<typeof PopoverContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const AlinhadoAoFim: Story = { name: 'Alinhado ao fim', args: { align: 'end' } };
