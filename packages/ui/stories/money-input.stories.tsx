import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, MoneyInput } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/MoneyInput',
  component: MoneyInput,
  args: { 'aria-label': 'Preço pedido', placeholder: '0,00', size: 'md' },
  decorators: [constrained('md')],
} satisfies Meta<typeof MoneyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {};

export const Preenchido: Story = { args: { defaultValue: '48200000' } };

export const ValorEntregue: Story = {
  name: 'Valor entregue',
  render: function Render(args) {
    const [value, setValue] = useState<string | null>('1480.5');
    return (
      <Field label="Preço pedido" hint={`Valor entregue: ${value ?? '—'}`}>
        <MoneyInput {...args} aria-label={undefined} value={value} onChange={setValue} />
      </Field>
    );
  },
};

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Entrada" error="A entrada passa do preço pedido.">
        <MoneyInput {...args} aria-label={undefined} defaultValue="5200000" max="4800000" />
      </Field>
      <Field label="Preço pedido" hint="Definido pelo proprietário.">
        <MoneyInput {...args} aria-label={undefined} defaultValue="48200000" disabled />
      </Field>
    </Stack>
  ),
};

export const Tamanhos: Story = {
  render: (args) => (
    <Stack>
      <MoneyInput {...args} size="sm" />
      <MoneyInput {...args} size="md" />
      <MoneyInput {...args} size="lg" />
    </Stack>
  ),
};
