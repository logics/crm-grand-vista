import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AreaInput, Field } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/AreaInput',
  component: AreaInput,
  args: { 'aria-label': 'Área total', placeholder: '0', size: 'md', unit: 'hectare', alqueireType: 'goiano' },
  decorators: [constrained('md')],
} satisfies Meta<typeof AreaInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {};

export const Preenchido: Story = { args: { defaultValue: '1480.25' } };

export const EmAlqueire: Story = {
  name: 'Em alqueire',
  render: function Render(args) {
    const [hectares, setHectares] = useState<string | null>('484');
    return (
      <Stack>
        <Field label="Área total" hint={`Em hectares: ${hectares ?? '—'}`}>
          <AreaInput
            {...args}
            aria-label={undefined}
            unit="alqueire"
            alqueireType="goiano"
            value={hectares}
            onChange={setHectares}
          />
        </Field>
        <Field label="Área total">
          <AreaInput
            {...args}
            aria-label={undefined}
            unit="alqueire"
            alqueireType="paulista"
            value={hectares}
            onChange={setHectares}
          />
        </Field>
        <Field label="Área total">
          <AreaInput
            {...args}
            aria-label={undefined}
            unit="alqueire"
            alqueireType="norte"
            value={hectares}
            onChange={setHectares}
          />
        </Field>
      </Stack>
    );
  },
};

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Área útil" error="A área útil passa da área total.">
        <AreaInput {...args} aria-label={undefined} defaultValue="1600" max="1480" />
      </Field>
      <Field label="Área total" hint="Conforme a matrícula.">
        <AreaInput {...args} aria-label={undefined} defaultValue="1480" disabled />
      </Field>
    </Stack>
  ),
};
