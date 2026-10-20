import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DateRangePicker, type DateRangeValue, Field } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

// Datas fixas: a story não muda de aparência conforme o dia em que abre.
const today = new Date(2026, 9, 15);

const meta = {
  title: 'Formulário/DateRangePicker',
  component: DateRangePicker,
  args: { 'aria-label': 'Período', size: 'md', today },
  decorators: [constrained('md')],
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {};

export const Preenchido: Story = { args: { defaultValue: { from: '2026-10-05', to: '2026-10-09' } } };

export const Aberto: Story = {
  args: { defaultOpen: true, defaultValue: { from: '2026-10-05', to: '2026-10-09' } },
  decorators: [(Story) => <div className="min-h-[calc(10*var(--space-10))]">{Story()}</div>],
};

export const ValorEntregue: Story = {
  name: 'Valor entregue',
  render: function Render(args) {
    const [value, setValue] = useState<DateRangeValue>({ from: '2026-10-01', to: '2026-10-15' });
    return (
      <Field label="Período da visita" hint={`Valor entregue: ${value.from ?? '—'} a ${value.to ?? '—'}`}>
        <DateRangePicker {...args} aria-label={undefined} value={value} onChange={setValue} />
      </Field>
    );
  },
};

export const AtalhosPropios: Story = {
  name: 'Atalhos próprios',
  args: {
    defaultOpen: true,
    presets: [
      { label: 'Safra 2026/27', range: { from: '2026-07-01', to: '2027-06-30' } },
      { label: 'Próximos 30 dias', range: { from: '2026-10-15', to: '2026-11-13' } },
    ],
  },
  decorators: Aberto.decorators,
};

export const DatasDesabilitadas: Story = {
  name: 'Datas desabilitadas',
  args: { defaultOpen: true, disabledDates: [{ before: new Date(2026, 9, 10) }, { dayOfWeek: [0] }] },
  decorators: Aberto.decorators,
};

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Field label="Período da visita" error="Informe o período.">
        <DateRangePicker {...args} aria-label={undefined} />
      </Field>
      <Field label="Período da safra" hint="Definido pelo contrato.">
        <DateRangePicker {...args} aria-label={undefined} disabled defaultValue={{ from: '2026-07-01', to: '2027-06-30' }} />
      </Field>
    </Stack>
  ),
};

export const Tamanhos: Story = {
  render: (args) => (
    <Stack>
      <DateRangePicker {...args} size="sm" />
      <DateRangePicker {...args} size="md" />
      <DateRangePicker {...args} size="lg" />
    </Stack>
  ),
};
