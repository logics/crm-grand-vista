import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, iconNames } from '../src/index.js';
import { Row } from './support/layout.js';

const meta = {
  title: 'Núcleo/Icon',
  component: Icon,
  args: { name: 'tractor', size: 'lg' },
  argTypes: { name: { control: 'select', options: iconNames } },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Tamanhos: Story = {
  render: (args) => (
    <Row>
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((size) => (
        <Icon key={size} {...args} size={size} />
      ))}
    </Row>
  ),
};

export const Registro: Story = {
  render: (args) => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(calc(4*var(--space-10)),1fr))] gap-4">
      {iconNames.map((name) => (
        <div key={name} className="flex items-center gap-4 text-sm text-text-muted">
          <Icon {...args} name={name} className="text-text-heading" />
          <code className="font-mono text-xs">{name}</code>
        </div>
      ))}
    </div>
  ),
};
