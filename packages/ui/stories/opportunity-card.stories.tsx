import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OpportunityCard } from '../src/index.js';

const meta = {
  title: 'Domínio/OpportunityCard',
  component: OpportunityCard,
  args: {
    client: 'Agro Holding Bertoldi',
    farm: 'Fazenda Três Barras',
    value: 'R$ 18,4 mi',
    probability: 75,
    owner: 'Milson Sousa',
    nextAction: 'Visita técnica · 28/07',
    onClick: fn(),
  },
  decorators: [(Story) => <div className="max-w-[calc(7*var(--space-10))]">{Story()}</div>],
} satisfies Meta<typeof OpportunityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Atrasada: Story = { args: { overdue: true, nextAction: 'Retorno da proposta · 12/07' } };

export const Minima: Story = {
  name: 'Mínima',
  args: { farm: undefined, value: undefined, probability: undefined, owner: undefined, nextAction: undefined },
};
