import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card } from '../src/index.js';
import { Grid } from './support/layout.js';

const meta = {
  title: 'Núcleo/Card',
  component: Card,
  args: {
    eyebrow: 'Funil',
    title: 'Negociações em andamento',
    subtitle: 'Atualizado hoje, 14h30',
    children: 'R$ 48,2 mi em 18 oportunidades.',
    tone: 'default',
    padding: 'default',
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  name: 'Padrão',
  args: { action: <Button variant="ghost" size="sm">Ver funil</Button> },
};

export const Tons: Story = {
  render: (args) => (
    <Grid>
      <Card {...args} tone="default" />
      <Card {...args} tone="hero" />
      <Card {...args} tone="inverse" />
      <Card {...args} tone="sunken" />
    </Grid>
  ),
};

export const Estados: Story = {
  render: (args) => (
    <Grid>
      <Card {...args} accent title="Com faixa dourada" />
      <Card {...args} interactive title="Clicável (sobe no hover)" />
      <Card {...args} padding="none" eyebrow={undefined} title={undefined} subtitle={undefined}>
        Sem respiro interno, para mídia
      </Card>
    </Grid>
  ),
};
