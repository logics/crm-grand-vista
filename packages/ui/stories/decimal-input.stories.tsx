import type { Meta, StoryObj } from '@storybook/react-vite';
import { DecimalInput, Field } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/DecimalInput',
  component: DecimalInput,
  args: { 'aria-label': 'Quantidade', placeholder: '0', size: 'md', suffix: 'sacas', scale: 4 },
  decorators: [constrained('md')],
} satisfies Meta<typeof DecimalInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {};

export const Preenchido: Story = { args: { defaultValue: '7000.5' } };

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Avaliação" hint="Até quatro casas.">
        <DecimalInput {...args} aria-label={undefined} defaultValue="7000" />
      </Field>
      <Field label="Avaliação travada" hint="Definida na captação.">
        <DecimalInput {...args} aria-label={undefined} defaultValue="1446.281" disabled />
      </Field>
    </Stack>
  ),
};
