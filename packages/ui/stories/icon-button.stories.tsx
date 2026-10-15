import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from '../src/index.js';
import { Row } from './support/layout.js';

const meta = {
  title: 'Núcleo/IconButton',
  component: IconButton,
  args: { icon: 'pencil', label: 'Editar', variant: 'ghost', size: 'md' },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Variantes: Story = {
  render: (args) => (
    <Row>
      <IconButton {...args} variant="ghost" />
      <IconButton {...args} variant="outline" />
      <IconButton {...args} variant="soft" />
      <IconButton {...args} variant="solid" />
    </Row>
  ),
};

export const TamanhosEEstados: Story = {
  name: 'Tamanhos e estados',
  render: (args) => (
    <Row>
      <IconButton {...args} size="sm" />
      <IconButton {...args} size="md" />
      <IconButton {...args} size="lg" />
      <IconButton {...args} icon="bell" label="Notificações" variant="outline" dot />
      <IconButton {...args} icon="x" label="Fechar" disabled />
    </Row>
  ),
};
