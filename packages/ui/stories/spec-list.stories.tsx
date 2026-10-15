import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpecList } from '../src/index.js';
import { Stack } from './support/layout.js';

const meta = {
  title: 'Dados/SpecList',
  component: SpecList,
  args: {
    columns: 2,
    items: [
      { label: 'Área total', value: '1.480 ha' },
      { label: 'Área útil', value: '1.120 ha' },
      { label: 'Aptidão', value: 'Agricultura' },
      { label: 'Matrícula', value: '12.384', mono: true },
      { label: 'CAR', value: 'MG-3106200-8F2A', mono: true },
      { label: 'Água', value: undefined },
    ],
  },
} satisfies Meta<typeof SpecList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Valor ausente aparece como travessão (—), nunca como "N/A". */
export const Padrao: Story = { name: 'Padrão' };

export const Colunas: Story = {
  render: (args) => (
    <Stack>
      {([1, 3, 4] as const).map((columns) => (
        <SpecList key={columns} {...args} columns={columns} />
      ))}
    </Stack>
  ),
};
