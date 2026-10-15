import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Badge, DataTable, type DataTableColumn, EmptyState } from '../src/index.js';

type Farm = { id: number; name: string; city: string; area: string; price: string; status: string };

const columns: DataTableColumn<Farm>[] = [
  { key: 'name', label: 'Fazenda', strong: true },
  { key: 'city', label: 'Município', muted: true, wrap: true },
  { key: 'area', label: 'Área (ha)', align: 'right', mono: true, sorted: 'desc' },
  { key: 'price', label: 'Valor por hectare', align: 'right', mono: true },
  {
    key: 'status',
    label: 'Status',
    align: 'center',
    render: (row) => (
      <Badge tone={row.status === 'Disponível' ? 'success' : 'warning'} size="sm" dot>
        {row.status}
      </Badge>
    ),
  },
];

const rows: Farm[] = [
  { id: 1, name: 'Fazenda Boa Esperança', city: 'Jaborandi, BA', area: '1.480', price: 'R$ 62.000', status: 'Disponível' },
  { id: 2, name: 'Fazenda Três Barras', city: 'Patos de Minas, MG', area: '860', price: 'R$ 48.500', status: 'Em negociação' },
  { id: 3, name: 'Fazenda Santa Helena', city: 'Rio Verde, GO', area: '2.310', price: 'R$ 71.200', status: 'Disponível' },
];

const meta = {
  title: 'Dados/DataTable',
  component: DataTable<Farm>,
  args: { columns, rows, rowKey: (row) => row.id, onRowClick: fn() },
} satisfies Meta<typeof DataTable<Farm>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const DensaComSelecao: Story = { name: 'Densa, com seleção', args: { dense: true, selected: [2] } };

export const Vazia: Story = {
  args: {
    rows: [],
    onRowClick: undefined,
    empty: <EmptyState compact icon="search-x" title="Nenhuma fazenda encontrada" />,
  },
};
