// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge, DataTable, type DataTableColumn } from '../../src/index.js';

type Farm = { id: number; name: string; area: string; status: string };

const farms: Farm[] = [
  { id: 1, name: 'Fazenda Boa Esperança', area: '1.120', status: 'Disponível' },
  { id: 2, name: 'Fazenda Três Barras', area: '860', status: 'Em negociação' },
];

const columns: DataTableColumn<Farm>[] = [
  { key: 'name', label: 'Fazenda', strong: true, wrap: true },
  { key: 'area', label: 'Área útil', mono: true, align: 'right', sorted: 'desc' },
  { key: 'status', label: 'Status', render: (farm) => <Badge dot>{farm.status}</Badge> },
];

describe('DataTable', () => {
  it('cabeçalhos e uma linha por registro, com célula do campo ou do render', () => {
    render(<DataTable columns={columns} rows={farms} />);
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Fazenda',
      'Área útil',
      'Status',
    ]);
    const [, first] = screen.getAllByRole('row');
    expect(within(first!).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'Fazenda Boa Esperança',
      '1.120',
      'Disponível',
    ]);
    expect(within(first!).getByText('Disponível').closest('[data-slot=badge]')).not.toBeNull();
  });

  it('coluna ordenada anuncia o sentido', () => {
    render(<DataTable columns={columns} rows={farms} />);
    expect(screen.getByRole('columnheader', { name: 'Área útil' })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: 'Fazenda' })).not.toHaveAttribute('aria-sort');
  });

  it('sem registros, mostra a mensagem de vazio ocupando a linha toda', () => {
    render(<DataTable columns={columns} rows={[]} />);
    expect(screen.getByRole('cell', { name: 'Nenhum registro encontrado.' })).toHaveAttribute('colspan', '3');
  });

  it('linha clicável abre pelo mouse e pelo teclado, e continua sendo linha', async () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} rows={farms} onRowClick={onRowClick} />);
    const [, first, second] = screen.getAllByRole('row');
    await userEvent.click(within(first!).getByText('Fazenda Boa Esperança'));
    second!.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick.mock.calls).toEqual([
      [farms[0], 0],
      [farms[1], 1],
    ]);
  });

  it('marca as linhas selecionadas pelo id', () => {
    render(<DataTable columns={columns} rows={farms} selected={[2]} />);
    const [, first, second] = screen.getAllByRole('row');
    expect(first).not.toHaveAttribute('data-selected');
    expect(second).toHaveAttribute('data-selected', 'true');
  });
});
