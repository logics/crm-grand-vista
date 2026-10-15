import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../src/index.js';
import { Row } from './support/layout.js';

const meta = {
  title: 'Núcleo/Badge',
  component: Badge,
  args: { children: 'Disponível', tone: 'neutral', size: 'md' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Tons: Story = {
  render: (args) => (
    <Row>
      <Badge {...args} tone="neutral">
        Rascunho
      </Badge>
      <Badge {...args} tone="success" dot>
        Disponível
      </Badge>
      <Badge {...args} tone="warning" dot>
        Em negociação
      </Badge>
      <Badge {...args} tone="danger" dot>
        Vendida
      </Badge>
      <Badge {...args} tone="info">
        Nova
      </Badge>
      <Badge {...args} tone="brand" icon="check">
        Verificada
      </Badge>
      <Badge {...args} tone="gold">
        Destaque
      </Badge>
    </Row>
  ),
};

export const Tamanhos: Story = {
  render: (args) => (
    <Row>
      <Badge {...args} size="md" tone="success" icon="arrow-up-right">
        +12%
      </Badge>
      <Badge {...args} size="sm" tone="success" icon="arrow-up-right">
        +12%
      </Badge>
    </Row>
  ),
};
