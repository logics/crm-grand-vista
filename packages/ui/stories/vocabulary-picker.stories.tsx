import type { VocabularyOption } from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Field, VocabularyPicker, type VocabularyPickerMode } from '../src/index.js';
import { constrained } from './support/layout.js';
import { simulatedResolve, simulatedSearch } from './support/search.js';

const crops: VocabularyOption[] = [
  { id: 'c1', name: 'Algodão', active: true },
  { id: 'c2', name: 'Café', active: true },
  { id: 'c3', name: 'Cana-de-açúcar', active: true },
  { id: 'c4', name: 'Milho', active: true },
  { id: 'c5', name: 'Soja', active: true },
  { id: 'c6', name: 'Trigo', active: false },
];

const activeCrops = crops.filter((crop) => crop.active);
const resolve = simulatedResolve(crops, (crop) => crop.id);

type Args = { mode?: VocabularyPickerMode; initial?: VocabularyOption | string | null; defaultOpen?: boolean };

function CropField({ mode = 'form', initial = null, defaultOpen }: Args) {
  const [value, setValue] = useState<VocabularyOption | string | null>(initial);
  // o servidor só devolve inativas quando o filtro as pede (`includeInactive`)
  const search = simulatedSearch(mode === 'filter' ? crops : activeCrops, (crop) => crop.name);
  return (
    <Field label="Cultura">
      <VocabularyPicker mode={mode} search={search} resolve={resolve} value={value} onChange={setValue} defaultOpen={defaultOpen} />
    </Field>
  );
}

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/VocabularyPicker',
  component: CropField,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof CropField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Formulario: Story = { name: 'Formulário', args: { defaultOpen: true } };

export const FiltroComInativa: Story = {
  name: 'Filtro com inativa',
  args: { mode: 'filter', defaultOpen: true },
};

export const ValorInativoHidratado: Story = {
  name: 'Valor inativo hidratado',
  args: { initial: 'c6' },
};
