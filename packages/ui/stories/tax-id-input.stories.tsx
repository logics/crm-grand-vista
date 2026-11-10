import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, TaxIdInput } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/TaxIdInput',
  component: TaxIdInput,
  args: { 'aria-label': 'Documento', personType: 'pf', size: 'md' },
  decorators: [constrained('md')],
} satisfies Meta<typeof TaxIdInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cpf: Story = { name: 'CPF (pessoa física)', args: { defaultValue: '52998224725' } };

export const CnpjNumerico: Story = {
  name: 'CNPJ numérico',
  args: { personType: 'pj', defaultValue: '11222333000181' },
};

export const CnpjAlfanumerico: Story = {
  name: 'CNPJ alfanumérico',
  args: { personType: 'pj', defaultValue: '12ABC34501DE35' },
};

export const Vazio: Story = { args: { personType: 'pj' } };

export const TrocaDeTipo: Story = {
  name: 'Troca de tipo de pessoa',
  render: function Render(args) {
    const [personType, setPersonType] = useState<'pf' | 'pj'>('pj');
    const [taxId, setTaxId] = useState<string | null>('12ABC34501DE35');
    return (
      <Stack>
        <Field label="Documento" hint={`Tipo ${personType.toUpperCase()} · valor gravado: ${taxId ?? '—'}`}>
          <TaxIdInput {...args} aria-label={undefined} personType={personType} value={taxId} onChange={setTaxId} />
        </Field>
        <button type="button" onClick={() => setPersonType(personType === 'pj' ? 'pf' : 'pj')}>
          Alternar PF/PJ
        </button>
      </Stack>
    );
  },
};

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Documento" error="Já existe um contato com este documento.">
        <TaxIdInput {...args} aria-label={undefined} defaultValue="52998224725" />
      </Field>
      <Field label="Documento" hint="Conforme o cartão CNPJ.">
        <TaxIdInput {...args} aria-label={undefined} personType="pj" defaultValue="12ABC34501DE35" disabled />
      </Field>
    </Stack>
  ),
};
