import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AsyncCombobox, type AsyncComboboxPage, type AsyncComboboxSearch, Field } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

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

const pageSize = 6;

/** Busca simulada: filtra pelo nome com um atraso de rede e pagina de seis em seis. */
const searchFarms: AsyncComboboxSearch<Farm> = (term, { signal, cursor }) =>
  new Promise<AsyncComboboxPage<Farm>>((resolve, reject) => {
    const timer = setTimeout(() => {
      const found = farms.filter((farm) => farm.name.toLowerCase().includes(term.toLowerCase()));
      const start = Number(cursor ?? 0);
      const end = start + pageSize;
      resolve({ items: found.slice(start, end), nextCursor: end < found.length ? String(end) : undefined });
    }, 400);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

const resolveFarms = async (ids: string[]) => farms.filter((farm) => ids.includes(farm.id));

const neverAnswers: AsyncComboboxSearch<Farm> = () => new Promise(() => {});
const answersEmpty: AsyncComboboxSearch<Farm> = async () => ({ items: [] });
const fails: AsyncComboboxSearch<Farm> = async () => {
  throw new Error('Falha de rede');
};

const getKey = (farm: Farm) => farm.id;
const getLabel = (farm: Farm) => farm.name;
const renderItem = (farm: Farm) => (
  <span className="flex flex-col gap-1">
    <span>{farm.name}</span>
    <span className="text-xs text-text-faint">{farm.city}</span>
  </span>
);

type SingleArgs = {
  search?: AsyncComboboxSearch<Farm>;
  initial?: Farm | string | null;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  minChars?: number;
};

function FarmPicker({ search = searchFarms, initial = null, label = 'Fazenda', hint, error, ...props }: SingleArgs) {
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

function FarmsPicker({ initial = [], defaultOpen }: { initial?: Array<Farm | string>; defaultOpen?: boolean }) {
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
  component: FarmPicker,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof FarmPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unica: Story = { name: 'Única', args: { initial: farms[2]!, hint: 'Busque pelo nome' } };

export const Aberta: Story = { args: { defaultOpen: true } };

export const ValorPorId: Story = { name: 'Valor por ID', args: { initial: 'f4', hint: 'O formulário só tem o ID' } };

export const Multipla: Story = {
  name: 'Múltipla',
  render: () => <FarmsPicker initial={['f1', farms[4]!, 'f7']} />,
};

export const MultiplaAberta: Story = {
  name: 'Múltipla aberta',
  render: () => <FarmsPicker initial={[farms[0]!]} defaultOpen />,
};

export const Carregando: Story = { args: { search: neverAnswers, defaultOpen: true } };

export const Vazio: Story = { args: { search: answersEmpty, defaultOpen: true } };

export const Erro: Story = { args: { search: fails, defaultOpen: true } };

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
