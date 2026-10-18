import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Pagination, type PaginationProps } from '../src/index.js';

/** A paginação é controlada: a story guarda página e tamanho, partindo dos args. */
function Controlled(args: PaginationProps) {
  const [page, setPage] = useState(args.page);
  const [pageSize, setPageSize] = useState(args.pageSize);
  const onPageChange = (next: number) => {
    setPage(next);
    args.onPageChange(next);
  };
  if (!args.pageSizeOptions) return <Pagination {...args} page={page} onPageChange={onPageChange} />;
  const { onPageSizeChange } = args;
  return (
    <Pagination
      {...args}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={(next: number) => {
        setPageSize(next);
        setPage(1);
        onPageSizeChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Navegação/Pagination',
  component: Pagination,
  args: { page: 6, pageSize: 25, total: 1480, onPageChange: fn() },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const ComItensPorPagina: Story = {
  name: 'Com itens por página',
  args: { pageSizeOptions: [25, 50, 100], onPageSizeChange: fn() },
};

export const Compacta: Story = { args: { compact: true, page: 3, pageSize: 12, total: 140 } };

export const PrimeiraPagina: Story = { name: 'Primeira página', args: { page: 1 } };

export const UltimaPagina: Story = { name: 'Última página', args: { page: 60 } };

export const UmaPagina: Story = { name: 'Uma página só', args: { page: 1, total: 18 } };

export const TotalZero: Story = { name: 'Total zero', args: { page: 1, total: 0 } };
