import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { z } from 'zod';
import {
  EntityForm,
  type EntityFormSection,
  FormSubmitError,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../src/index.js';
import { constrained } from './support/layout.js';

// Cadastro de fazenda resumido: o de verdade tem uns trinta campos e os
// personalizados, e virá do registro de metadados de campo de `@crm/shared`.

const farmSchema = z.object({
  name: z.string().min(1),
  registration: z.string().min(1, 'Informe a matrícula do cartório'),
  municipality: z.string().min(1),
  aptitude: z.string().min(1, 'Escolha a aptidão'),
  totalArea: z.coerce.number().positive(),
  usefulArea: z.coerce.number().positive(),
  pricePerHectare: z.coerce.number().positive(),
  notes: z.string().optional(),
});

type FarmInput = z.input<typeof farmSchema>;

const FarmForm = EntityForm<typeof farmSchema>;

const empty: FarmInput = {
  name: '',
  registration: '',
  municipality: '',
  aptitude: '',
  totalArea: '',
  usefulArea: '',
  pricePerHectare: '',
  notes: '',
};

const filled: FarmInput = {
  name: 'Fazenda Três Barras',
  registration: '12.345',
  municipality: 'Luís Eduardo Magalhães (BA)',
  aptitude: 'agricultura',
  totalArea: '4820',
  usefulArea: '3900',
  pricePerHectare: '62000',
  notes: 'Sede reformada em 2024, dois pivôs.',
};

const sections: EntityFormSection<FarmInput>[] = [
  {
    title: 'Identificação',
    description: 'Como a fazenda aparece nas listas e no funil.',
    fields: [
      { name: 'name', label: 'Nome da fazenda', render: (field) => <Input {...field} /> },
      { name: 'registration', label: 'Matrícula', hint: 'Do cartório de registro de imóveis', render: (field) => <Input {...field} /> },
      { name: 'municipality', label: 'Município', render: (field) => <Input {...field} icon="map-pin" /> },
      {
        name: 'aptitude',
        label: 'Aptidão',
        render: ({ ref, value, onChange, onBlur, disabled }) => (
          <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger ref={ref} onBlur={onBlur}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agricultura">Agricultura</SelectItem>
              <SelectItem value="pecuaria">Pecuária</SelectItem>
              <SelectItem value="mista">Mista</SelectItem>
            </SelectContent>
          </Select>
        ),
      },
    ],
  },
  {
    title: 'Área e valor',
    fields: [
      { name: 'totalArea', label: 'Área total', render: (field) => <Input {...field} value={String(field.value)} suffix="ha" /> },
      {
        name: 'usefulArea',
        label: 'Área útil',
        hint: 'Sem reserva legal e APP',
        render: (field) => <Input {...field} value={String(field.value)} suffix="ha" />,
      },
      {
        name: 'pricePerHectare',
        label: 'Valor por hectare útil',
        render: (field) => <Input {...field} value={String(field.value)} prefix="R$" />,
      },
      { name: 'notes', label: 'Observações', colSpan: 2, render: (field) => <Input {...field} /> },
    ],
  },
];

const meta = {
  title: 'Formulário/EntityForm',
  component: FarmForm,
  args: {
    'aria-label': 'Cadastro de fazenda',
    schema: farmSchema,
    defaultValues: filled,
    sections,
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [constrained('form')],
} satisfies Meta<typeof FarmForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const clickSave = async (canvasElement: HTMLElement) =>
  userEvent.click(within(canvasElement).getByRole('button', { name: /Salvar|Cadastrar fazenda/ }));

export const Edicao: Story = { name: 'Edição' };

export const Cadastro: Story = { args: { defaultValues: empty, submitLabel: 'Cadastrar fazenda' } };

export const ComErros: Story = {
  name: 'Com erros',
  args: { defaultValues: { ...empty, name: 'Fazenda Três Barras', totalArea: '-10' }, submitLabel: 'Cadastrar fazenda' },
  play: async ({ canvasElement }) => {
    await clickSave(canvasElement);
    await expect(within(canvasElement).getByRole('textbox', { name: 'Matrícula' })).toHaveFocus();
  },
};

export const Enviando: Story = {
  args: { onSubmit: fn(() => new Promise<void>(() => {})) },
  play: async ({ canvasElement }) => {
    await clickSave(canvasElement);
    await expect(within(canvasElement).getByRole('button', { name: 'Salvar' })).toBeDisabled();
  },
};

export const ErroDoServidor: Story = {
  name: 'Erro do servidor',
  args: {
    onSubmit: fn(() =>
      Promise.reject(
        new FormSubmitError('Já existe uma fazenda com essa matrícula nesta empresa.', {
          registration: 'Matrícula já cadastrada',
        }),
      ),
    ),
  },
  play: async ({ canvasElement }) => {
    await clickSave(canvasElement);
    await expect(await within(canvasElement).findByRole('alert')).toBeVisible();
  },
};
