import type { Level } from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, LevelSelect } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/LevelSelect',
  component: LevelSelect,
  args: { 'aria-label': 'Potencial de venda', value: null, onChange: () => undefined },
  decorators: [constrained('md')],
} satisfies Meta<typeof LevelSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NaoInformado: Story = { name: 'Não informado' };

export const ComValor: Story = { name: 'Com valor', args: { value: 'high' } };

export const ValorEntregue: Story = {
  name: 'Valor entregue',
  render: function Render(args) {
    const [value, setValue] = useState<Level | null>('medium');
    return (
      <Field label="Prioridade" hint={`Valor entregue: ${value ?? 'nulo'}`}>
        <LevelSelect {...args} aria-label={undefined} value={value} onChange={setValue} />
      </Field>
    );
  },
};

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Disponibilidade hídrica" error="Informe a disponibilidade hídrica.">
        <LevelSelect {...args} aria-label={undefined} />
      </Field>
      <Field label="Potencial de irrigação" hint="Definido pela vistoria.">
        <LevelSelect {...args} aria-label={undefined} value="low" disabled />
      </Field>
    </Stack>
  ),
};
