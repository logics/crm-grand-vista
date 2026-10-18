// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, type PaginationProps } from '../../src/index.js';

/** A paginação é controlada: a tela guarda a página. Aqui, um estado local. */
type ControlledProps = Omit<PaginationProps, 'page' | 'onPageChange'> & { initialPage?: number };

function Controlled({ initialPage = 1, ...props }: ControlledProps) {
  const [page, setPage] = useState(initialPage);
  return <Pagination {...props} page={page} onPageChange={setPage} />;
}

const pageButtons = () =>
  within(screen.getByRole('list')).getAllByRole('button').map((button) => button.textContent);

describe('Pagination', () => {
  it('é um nav "Paginação" com a página atual marcada e o resumo em pt-BR', () => {
    render(<Pagination page={6} pageSize={25} total={1480} onPageChange={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Paginação' });
    expect(within(nav).getByRole('button', { name: 'Página 6' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('button', { name: 'Página 5' })).not.toHaveAttribute('aria-current');
    expect(within(nav).getByText('126–150 de 1.480')).toBeInTheDocument();
  });

  it('primeira e última sempre visíveis, reticências no salto', () => {
    render(<Pagination page={30} pageSize={25} total={1480} onPageChange={() => {}} />);
    expect(pageButtons()).toEqual(['1', '29', '30', '31', '60']);
  });

  it('botões das pontas desabilitados na primeira e na última página', () => {
    const { rerender } = render(<Pagination page={1} pageSize={25} total={100} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeEnabled();
    rerender(<Pagination page={4} pageSize={25} total={100} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  });

  it('anterior, próxima e o número entregam a página', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageSize={25} total={1480} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await userEvent.click(screen.getByRole('button', { name: 'Página 60' }));
    expect(onPageChange.mock.calls).toEqual([[2], [4], [60]]);
  });

  it('a página atual não dispara troca', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageSize={25} total={1480} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Página 3' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('teclado: Tab percorre, Enter e Espaço trocam a página e o foco fica no botão', async () => {
    render(<Controlled pageSize={25} total={1480} />);
    await userEvent.tab();
    // a anterior está desabilitada na página 1: o primeiro foco é a página 1
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Página 5' })).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button', { name: 'Página 5' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Página 5' })).toHaveFocus();
  });

  it('a seta que fica desabilitada ao chegar na ponta passa o foco à página atual', async () => {
    render(<Controlled initialPage={3} pageSize={25} total={100} />);
    const next = screen.getByRole('button', { name: 'Próxima página' });
    next.focus();
    await userEvent.keyboard('{Enter}');
    expect(next).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página 4' })).toHaveFocus();
  });

  it('seletor de itens por página só com pageSizeOptions; a troca entrega o tamanho', async () => {
    const onPageSizeChange = vi.fn();
    const { rerender } = render(<Pagination page={1} pageSize={25} total={1480} onPageChange={() => {}} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    rerender(
      <Pagination
        page={1}
        pageSize={25}
        total={1480}
        onPageChange={() => {}}
        pageSizeOptions={[25, 50, 100]}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'Itens por página' });
    expect(trigger).toHaveTextContent('25');
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('option', { name: '50' }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('compacta: só anterior, "3 de 12" e próxima', async () => {
    const onPageChange = vi.fn();
    render(<Pagination compact page={3} pageSize={12} total={140} onPageChange={onPageChange} />);
    const nav = screen.getByRole('navigation', { name: 'Paginação' });
    expect(within(nav).getByText('3 de 12')).toBeInTheDocument();
    expect(within(nav).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Página anterior',
      'Próxima página',
    ]);
    await userEvent.click(within(nav).getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('compacta: a seta que fica desabilitada passa o foco à outra', async () => {
    render(<Controlled compact initialPage={2} pageSize={10} total={30} />);
    const next = screen.getByRole('button', { name: 'Próxima página' });
    next.focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Página anterior' })).toHaveFocus();
  });

  it('total menor que uma página: só o resumo', () => {
    render(<Pagination page={1} pageSize={25} total={18} onPageChange={() => {}} />);
    expect(screen.getByText('1–18 de 18')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('total zero: sem números nem botões', () => {
    render(<Pagination page={1} pageSize={25} total={0} onPageChange={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Paginação' });
    expect(within(nav).queryByRole('button')).toBeNull();
    expect(nav).not.toHaveTextContent(/\d/);
  });
});
