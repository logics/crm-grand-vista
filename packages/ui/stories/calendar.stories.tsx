import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar } from '../src/index.js';

// Base do `DateRangePicker`, que chega com a spec do módulo que o usa.
// Datas fixas: a story não muda de aparência conforme o dia em que abre.
const october2026 = new Date(2026, 9, 1);
const today = new Date(2026, 9, 15);

const meta = {
  title: 'Primitivos/Calendar',
  component: Calendar,
  args: { defaultMonth: october2026, today },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DataUnica: Story = {
  name: 'Data única',
  args: { mode: 'single', selected: new Date(2026, 9, 20) },
};

export const Intervalo: Story = {
  args: {
    mode: 'range',
    selected: { from: new Date(2026, 9, 5), to: new Date(2026, 9, 9) },
    disabled: { before: new Date(2026, 9, 3) },
    numberOfMonths: 2,
  },
};
