import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuditTimeline } from '../src/index.js';
import { constrained } from './support/layout.js';

const meta = {
  title: 'Domínio/AuditTimeline',
  component: AuditTimeline,
  decorators: [constrained('xl')],
} satisfies Meta<typeof AuditTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Histórico de alterações de uma fazenda: cada entrada é uma alteração salva. */
export const Historico: Story = {
  name: 'Histórico',
  args: {
    items: [
      {
        id: 3,
        title: 'Preço revisado',
        date: '24/07/2026, 14h30',
        author: 'Rafael Tavares',
        detail: 'Contraproposta do comprador aceita pelo proprietário.',
        changes: [
          { field: 'Preço pedido', from: 'R$ 18.000.000', to: 'R$ 16.400.000' },
          { field: 'Valor por hectare', from: 'R$ 12.162', to: 'R$ 11.081' },
        ],
      },
      {
        id: 2,
        title: 'Documento anexado',
        icon: 'file-text',
        date: '20/07/2026, 09h12',
        author: 'Ana Prado',
        changes: [{ field: 'CAR', from: undefined, to: 'MG-3106200-…' }],
      },
      { id: 1, title: 'Fazenda cadastrada', icon: 'plus', date: '02/07/2026, 17h45', author: 'Rafael Tavares' },
    ],
  },
};

export const EntradaUnica: Story = {
  name: 'Entrada única',
  args: { items: [{ title: 'Fazenda cadastrada', icon: 'plus', date: '02/07/2026', author: 'Rafael Tavares' }] },
};
