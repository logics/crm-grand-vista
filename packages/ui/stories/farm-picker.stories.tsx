import { type FarmOption, municipalityLabel } from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type AsyncComboboxSearch, FarmPicker, Field } from '../src/index.js';
import { constrained } from './support/layout.js';
import { answersEmpty, fails, neverAnswers, simulatedResolve, simulatedSearch } from './support/search.js';

const farm = (id: number, name: string, municipality: FarmOption['municipality'], totalAreaHa: string): FarmOption => ({
  id: `0199c1d2-7a4b-7c3e-9f10-${String(id).padStart(12, '0')}`,
  name,
  municipality,
  totalAreaHa,
});

const farms: FarmOption[] = [
  farm(1, 'Fazenda Santa Helena', { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' }, '1480'),
  farm(2, 'Fazenda Três Barras', { ibgeCode: '3148004', name: 'Patos de Minas', uf: 'MG' }, '620.5'),
  farm(3, 'Fazenda Boa Esperança', { ibgeCode: '2919553', name: 'Luís Eduardo Magalhães', uf: 'BA' }, '3250'),
  farm(4, 'Fazenda São Judas', { ibgeCode: '5107925', name: 'Sorriso', uf: 'MT' }, '2100'),
  farm(5, 'Fazenda Água Limpa', { ibgeCode: '3170404', name: 'Unaí', uf: 'MG' }, '845.25'),
  farm(6, 'Fazenda Recanto', { ibgeCode: '2101400', name: 'Balsas', uf: 'MA' }, '5400'),
  farm(7, 'Fazenda Cachoeira', { ibgeCode: '5211909', name: 'Jataí', uf: 'GO' }, '980'),
];

/** Busca simulada pelo nome e pelo município. */
const searchFarms = simulatedSearch(farms, (farm) => `${farm.name} ${municipalityLabel(farm.municipality)}`);
const resolveFarms = simulatedResolve(farms, (farm) => farm.id);

type SingleArgs = {
  search?: AsyncComboboxSearch<FarmOption>;
  initial?: FarmOption | string | null;
  error?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  creatable?: boolean;
};

function FarmField({ search = searchFarms, initial = null, error, creatable, ...props }: SingleArgs) {
  const [value, setValue] = useState<FarmOption | string | null>(initial);
  return (
    <Field label="Fazenda" error={error}>
      <FarmPicker
        search={search}
        resolve={resolveFarms}
        value={value}
        onChange={setValue}
        onCreate={creatable ? () => {} : undefined}
        {...props}
      />
    </Field>
  );
}

function FarmsField({ initial = [], defaultOpen }: { initial?: Array<FarmOption | string>; defaultOpen?: boolean }) {
  const [value, setValue] = useState<Array<FarmOption | string>>(initial);
  return (
    <Field label="Fazendas candidatas" hint="As fazendas apresentadas ao comprador">
      <FarmPicker
        multiple
        search={searchFarms}
        resolve={resolveFarms}
        value={value}
        onChange={setValue}
        defaultOpen={defaultOpen}
      />
    </Field>
  );
}

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/FarmPicker',
  component: FarmField,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof FarmField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unica: Story = { name: 'Única', args: { initial: farms[0]! } };

export const Aberta: Story = { args: { defaultOpen: true } };

export const ValorPorId: Story = { name: 'Valor por ID', args: { initial: farms[3]!.id } };

export const Multipla: Story = {
  name: 'Múltipla',
  render: () => <FarmsField initial={[farms[0]!, farms[6]!.id]} />,
};

export const MultiplaAberta: Story = {
  name: 'Múltipla aberta',
  render: () => <FarmsField initial={[farms[0]!]} defaultOpen />,
};

export const VazioComCadastrar: Story = {
  name: 'Vazio com cadastrar',
  args: { search: answersEmpty(), defaultOpen: true, creatable: true },
};

export const Carregando: Story = { args: { search: neverAnswers(), defaultOpen: true } };

export const Erro: Story = { args: { search: fails(), defaultOpen: true } };

export const Desabilitado: Story = { args: { initial: farms[0]!, disabled: true } };

export const Invalida: Story = { name: 'Inválida', args: { error: 'Escolha a fazenda da oportunidade' } };
