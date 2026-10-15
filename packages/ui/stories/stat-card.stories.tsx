import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard } from '../src/index.js';
import { Grid } from './support/layout.js';

const meta = {
  title: 'Dados/StatCard',
  component: StatCard,
  args: {
    label: 'Valor em negociação',
    value: 'R$ 48,2',
    unit: 'mi',
    delta: '+12%',
    deltaTone: 'success',
    icon: 'trending-up',
    tone: 'default',
  },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Tons: Story = {
  render: (args) => (
    <Grid>
      {(['default', 'hero', 'dark', 'gold'] as const).map((tone) => (
        <StatCard
          key={tone}
          {...args}
          tone={tone}
          rows={[
            { label: 'Soja', value: 'R$ 30,1 mi' },
            { label: 'Pecuária', value: 'R$ 18,1 mi' },
          ]}
          footnote="No mês corrente"
        />
      ))}
    </Grid>
  ),
};

export const Variacao: Story = {
  name: 'Variação, linhas e nota',
  render: (args) => (
    <Grid>
      <StatCard {...args} label="Fazendas vendidas" value="12" unit={undefined} delta="+3" deltaTone="success" />
      <StatCard {...args} label="Oportunidades paradas" value="5" unit={undefined} delta="+2" deltaTone="danger" />
      <StatCard {...args} label="Ticket médio" value="R$ 16" delta="0%" deltaTone="neutral" />
      <StatCard
        {...args}
        label="Por cultura"
        delta={undefined}
        rows={[
          { label: 'Soja', value: 'R$ 30,1 mi' },
          { label: 'Pecuária', value: 'R$ 18,1 mi' },
        ]}
        footnote="No mês corrente"
      />
    </Grid>
  ),
};
