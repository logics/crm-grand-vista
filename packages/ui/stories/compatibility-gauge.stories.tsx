import type { Meta, StoryObj } from '@storybook/react-vite';
import { CompatibilityGauge } from '../src/index.js';
import { Row } from './support/layout.js';

const meta = {
  title: 'Domínio/CompatibilityGauge',
  component: CompatibilityGauge,
  args: { value: 86, size: 'md', showLabel: true },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100 } } },
} satisfies Meta<typeof CompatibilityGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Faixas: Story = {
  render: (args) => (
    <Row className="gap-8">
      <CompatibilityGauge {...args} value={92} />
      <CompatibilityGauge {...args} value={64} />
      <CompatibilityGauge {...args} value={28} />
    </Row>
  ),
};

export const Tamanhos: Story = {
  render: (args) => (
    <Row className="gap-8">
      <CompatibilityGauge {...args} size="sm" />
      <CompatibilityGauge {...args} size="md" description="Região, área e cultura" />
      <CompatibilityGauge {...args} size="lg" showLabel={false} />
    </Row>
  ),
};
