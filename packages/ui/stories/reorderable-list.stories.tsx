import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Badge, ReorderableList } from '../src/index.js';
import { constrained } from './support/layout.js';

type Stage = { id: string; name: string; note?: string };

const stages: Stage[] = [
  { id: 's1', name: 'Prospecção', note: 'Primeiro contato' },
  { id: 's2', name: 'Visita à fazenda' },
  { id: 's3', name: 'Proposta' },
  { id: 's4', name: 'Em negociação' },
  { id: 's5', name: 'Fechamento' },
];

type Args = { initial?: Stage[]; disabled?: boolean; readOnly?: boolean };

function StageList({ initial = stages, disabled, readOnly }: Args) {
  const [items, setItems] = useState(initial);
  const onReorder = (ids: string[]) => setItems(ids.map((id) => items.find((item) => item.id === id)!));
  return (
    <ReorderableList
      aria-label="Etapas do funil"
      items={items}
      getId={(item) => item.id}
      getLabel={(item) => item.name}
      renderItem={(item, index) => (
        <span className="flex items-center gap-3 text-sm font-medium text-text-body">
          {item.name}
          {index === 0 && <Badge size="sm">Primeira</Badge>}
        </span>
      )}
      onReorder={readOnly ? undefined : onReorder}
      disabled={disabled}
    />
  );
}

const meta = {
  title: 'Formulário/ReorderableList',
  component: StageList,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof StageList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Arrastar a linha, usar a alça (Espaço e setas) ou os botões de mover. */
export const Padrao: Story = {};

export const Desabilitada: Story = { args: { disabled: true } };

export const SomenteLeitura: Story = { args: { readOnly: true } };

export const ComUmItem: Story = { args: { initial: [stages[0]!] } };
