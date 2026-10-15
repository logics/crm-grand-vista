import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from '../src/index.js';
import { Stack } from './support/layout.js';

const meta = {
  title: 'Dados/ProgressBar',
  component: ProgressBar,
  args: { value: 58, label: 'Due diligence', valueLabel: '7 de 12', tone: 'brand', height: 'md' },
  decorators: [(Story) => <div className="max-w-[calc(9*var(--space-10))]">{Story()}</div>],
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Tons: Story = {
  render: (args) => (
    <Stack>
      {(['brand', 'gold', 'success', 'danger'] as const).map((tone) => (
        <ProgressBar key={tone} {...args} tone={tone} />
      ))}
    </Stack>
  ),
};

export const AlturasEExtremos: Story = {
  name: 'Alturas e extremos',
  render: (args) => (
    <Stack>
      <ProgressBar {...args} height="sm" value={0} valueLabel="0%" />
      <ProgressBar {...args} height="md" value={50} valueLabel="50%" />
      <ProgressBar {...args} height="lg" value={100} valueLabel="100%" />
      <ProgressBar value={72} aria-label="Meta do mês" />
    </Stack>
  ),
};
