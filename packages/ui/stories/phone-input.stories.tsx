import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, PhoneInput } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/PhoneInput',
  component: PhoneInput,
  args: { 'aria-label': 'Telefone', size: 'md' },
  decorators: [constrained('md')],
} satisfies Meta<typeof PhoneInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {};

export const Brasileiro: Story = { args: { defaultValue: '(64) 99999-0000' } };

export const OutroPais: Story = {
  name: 'Outro país',
  args: { defaultValue: '+351912345678' },
};

export const Controlado: Story = {
  render: function Render(args) {
    const [text, setText] = useState<string | null>('');
    return (
      <Field label="Telefone" hint="Digite com DDD, ou comece por + para outro país.">
        <PhoneInput {...args} aria-label={undefined} value={text} onChange={setText} />
      </Field>
    );
  },
};

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Telefone" error="Informe um telefone válido.">
        <PhoneInput {...args} aria-label={undefined} defaultValue="(10) 99999-0000" />
      </Field>
      <Field label="Telefone">
        <PhoneInput {...args} aria-label={undefined} defaultValue="(64) 99999-0000" disabled />
      </Field>
    </Stack>
  ),
};
