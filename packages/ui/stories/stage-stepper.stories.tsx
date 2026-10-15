import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StageStepper } from '../src/index.js';

const meta = {
  title: 'Navegação/StageStepper',
  component: StageStepper,
  args: {
    stages: ['Lead', 'Qualificação', 'Apresentação', 'Visita', 'Proposta', 'Negociação'],
    current: 3,
  },
} satisfies Meta<typeof StageStepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SomenteLeitura: Story = { name: 'Somente leitura' };

export const Navegavel: Story = { name: 'Navegável', args: { onSelect: fn() } };

export const Compacto: Story = { args: { compact: true, onSelect: fn() } };
