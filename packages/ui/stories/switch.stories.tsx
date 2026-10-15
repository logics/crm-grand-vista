import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from '../src/index.js';
import { Row } from './support/layout.js';

const meta = {
  title: 'Primitivos/Switch',
  component: Switch,
  args: { 'aria-label': 'Receber alertas de inércia' },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Estados: Story = {
  render: (args) => (
    <Row>
      <Switch {...args} />
      <Switch {...args} defaultChecked />
      <Switch {...args} disabled />
      <Switch {...args} disabled defaultChecked />
    </Row>
  ),
};
