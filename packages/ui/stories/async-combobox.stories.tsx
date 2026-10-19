import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AsyncCombobox, AsyncComboboxOption, type AsyncComboboxSearch, Field } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';
import { answersEmpty, fails, neverAnswers, simulatedResolve, simulatedSearch } from './support/search.js';

type Farm = { id: string; name: string; city: string };

const farms: Farm[] = [
  { id: 'f1', name: 'Fazenda Três Barras', city: 'Patos de Minas, MG' },
  { id: 'f2', name: 'Fazenda Boa Esperança', city: 'Luís Eduardo Magalhães, BA' },
  { id: 'f3', name: 'Fazenda Santa Helena', city: 'Rio Verde, GO' },
  { id: 'f4', name: 'Fazenda São Judas', city: 'Sorriso, MT' },
  { id: 'f5', name: 'Fazenda Água Limpa', city: 'Unaí, MG' },
  { id: 'f6', name: 'Fazenda Recanto', city: 'Balsas, MA' },
  { id: 'f7', name: 'Fazenda Santa Rita', city: 'Uruçuí, PI' },
  { id: 'f8', name: 'Fazenda Lagoa Seca', city: 'Barreiras, BA' },
  { id: 'f9', name: 'Fazenda Cachoeira', city: 'Jataí, GO' },
  { id: 'f10', name: 'Fazenda Primavera', city: 'Primavera do Leste, MT' },
];

/** Busca simulada pelo nome, paginando de seis em seis. */
const searchFarms = simulatedSearch(farms, (farm) => farm.name);
const resolveFarms = simulatedResolve(farms, (farm) => farm.id);

const getKey = (farm: Farm) => farm.id;
const getLabel = (farm: Farm) => farm.name;
const renderItem = (farm: Farm) => <AsyncComboboxOption title={farm.name} detail={farm.city} />;

type SingleArgs = {
  search?: AsyncComboboxSearch<Farm>;
  initial?: Farm | string | null;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  minChars?: number;
  onCreate?: (term: string) => void;
  createLabel?: string;
};

function FarmField({ search = searchFarms, initial = null, label = 'Fazenda', hint, error, ...props }: SingleArgs) {
  const [value, setValue] = useState<Farm | string | null>(initial);
  return (
    <Field label={label} hint={hint} error={error}>
      <AsyncCombobox
        search={search}
        resolve={resolveFarms}
        getKey={getKey}
        getLabel={getLabel}
        renderItem={renderItem}
        placeholder="Escolha a fazenda"
        searchPlaceholder="Buscar fazenda"
        value={value}
        onChange={setValue}
        {...props}
      />
    </Field>
  );
}

function FarmsField({ initial = [], defaultOpen }: { initial?: Array<Farm | string>; defaultOpen?: boolean }) {
  const [value, setValue] = useState<Array<Farm | string>>(initial);
  return (
    <Field label="Fazendas de interesse" hint="Escolha quantas quiser">
      <AsyncCombobox
        multiple
        search={searchFarms}
        resolve={resolveFarms}
        getKey={getKey}
        getLabel={getLabel}
        placeholder="Escolha as fazendas"
        searchPlaceholder="Buscar fazenda"
        value={value}
        onChange={setValue}
        defaultOpen={defaultOpen}
      />
    </Field>
  );
}

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/AsyncCombobox',
  component: FarmField,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof FarmField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unica: Story = { name: 'Única', args: { initial: farms[2]!, hint: 'Busque pelo nome' } };

export const Aberta: Story = { args: { defaultOpen: true } };

export const ValorPorId: Story = { name: 'Valor por ID', args: { initial: 'f4', hint: 'O formulário só tem o ID' } };

export const Multipla: Story = {
  name: 'Múltipla',
  render: () => <FarmsField initial={['f1', farms[4]!, 'f7']} />,
};

export const MultiplaAberta: Story = {
  name: 'Múltipla aberta',
  render: () => <FarmsField initial={[farms[0]!]} defaultOpen />,
};

export const Carregando: Story = { args: { search: neverAnswers(), defaultOpen: true } };

export const Vazio: Story = { args: { search: answersEmpty(), defaultOpen: true } };

export const VazioComCadastrar: Story = {
  name: 'Vazio com cadastrar',
  args: { search: answersEmpty(), defaultOpen: true, onCreate: () => {}, createLabel: 'Cadastrar fazenda' },
};

export const Erro: Story = { args: { search: fails(), defaultOpen: true } };

export const MinimoDeCaracteres: Story = {
  name: 'Mínimo de caracteres',
  args: { minChars: 3, defaultOpen: true, label: 'Município' },
};

export const Desabilitado: Story = { args: { initial: farms[0]!, disabled: true } };

export const Invalido: Story = { name: 'Inválido', args: { error: 'Escolha a fazenda da oportunidade' } };

export const Tamanhos: Story = {
  render: () => (
    <Stack>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Field key={size} label={`Tamanho ${size}`}>
          <AsyncCombobox
            size={size}
            search={searchFarms}
            getKey={getKey}
            getLabel={getLabel}
            placeholder="Escolha a fazenda"
            value={farms[1]!}
            onChange={() => {}}
          />
        </Field>
      ))}
    </Stack>
  ),
};
