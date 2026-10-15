import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '../src/index.js';
import { Row } from './support/layout.js';

// Rótulo e descrição ficam com quem compõe o campo: ver a story do `Field`.
const meta = {
  title: 'Primitivos/Checkbox',
  component: Checkbox,
  args: { 'aria-label': 'CAR válido' },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Estados: Story = {
  render: (args) => (
    <Row>
      <Checkbox {...args} />
      <Checkbox {...args} defaultChecked />
      <Checkbox {...args} checked="indeterminate" />
      <Checkbox {...args} aria-invalid />
      <Checkbox {...args} disabled />
      <Checkbox {...args} disabled defaultChecked />
    </Row>
  ),
};
