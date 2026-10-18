import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, PercentInput } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/PercentInput',
  component: PercentInput,
  args: { 'aria-label': 'Comissão', placeholder: '0', size: 'md' },
  decorators: [constrained('md')],
} satisfies Meta<typeof PercentInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {};

export const Preenchido: Story = { args: { defaultValue: '5.5' } };

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Comissão" hint="De 0 a 100%.">
        <PercentInput {...args} aria-label={undefined} defaultValue="120" />
      </Field>
      <Field label="Comissão padrão" hint="Definida nas configurações da empresa.">
        <PercentInput {...args} aria-label={undefined} defaultValue="6" disabled />
      </Field>
    </Stack>
  ),
};
